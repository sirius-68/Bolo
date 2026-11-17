-- 0019: controls for the admin panel.
--   • admin_stats(days): the dashboard's numbers for a period, with the period before it for trends: a line per day
--     (new accounts, active people, posts, jobs, bookings, messages), the kinds of accounts, top cities, a growth
--     funnel and bookings by state.
--   • Feature switches (app_config key "features", readable by the app so it can explain): pause new sign-ups,
--     calls, or new posts and comments. Enforced here, whatever app version is used.
--   • Blocked words: posts and comments containing them are refused. The list is private (only admins read it).
-- Safe to run more than once.
set search_path = public, extensions;

-- ================================================================ dashboard numbers
create or replace function public.admin_stats(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 7), 180);
  t0 timestamptz := date_trunc('day', now()) - make_interval(days => v_days - 1);   -- first day of this period
  p0 timestamptz := t0 - make_interval(days => v_days);                             -- first day of the period before
  r jsonb;
begin
  perform private.need_admin();
  with days as (
    select g.d from generate_series(t0, date_trunc('day', now()), interval '1 day') as g(d)
  ),
  acts as (   -- who did something, and when: posted, commented, wrote, offered, booked
    select author_id as u, created_at as ts from posts where created_at >= p0
    union all select author_id, created_at from comments where created_at >= p0
    union all select sender_id, created_at from messages where created_at >= p0 and sender_id is not null
    union all select applicant_id, created_at from applications where created_at >= p0
    union all select client_id, created_at from bookings where created_at >= p0
  ),
  series as (
    select d.d::date as day,
      (select count(*) from profiles p where p.created_at >= d.d and p.created_at < d.d + interval '1 day' and p.deleted_at is null)::int as signups,
      (select count(distinct a.u) from acts a where a.ts >= d.d and a.ts < d.d + interval '1 day')::int as active,
      (select count(*) from posts x where x.kind <> 'request' and x.created_at >= d.d and x.created_at < d.d + interval '1 day')::int as posts,
      (select count(*) from posts x where x.kind = 'request' and x.created_at >= d.d and x.created_at < d.d + interval '1 day')::int as jobs,
      (select count(*) from bookings b where b.created_at >= d.d and b.created_at < d.d + interval '1 day')::int as bookings,
      (select count(*) from messages m where m.created_at >= d.d and m.created_at < d.d + interval '1 day')::int as messages
    from days d
  ),
  tot as (
    select jsonb_build_object(
      'signups', (select count(*) from profiles where created_at >= v.a and created_at < v.b and deleted_at is null),
      'active', (select count(distinct x.u) from acts x where x.ts >= v.a and x.ts < v.b),
      'posts', (select count(*) from posts where kind <> 'request' and created_at >= v.a and created_at < v.b),
      'jobs', (select count(*) from posts where kind = 'request' and created_at >= v.a and created_at < v.b),
      'bookings', (select count(*) from bookings where created_at >= v.a and created_at < v.b),
      'messages', (select count(*) from messages where created_at >= v.a and created_at < v.b),
      'calls', (select count(*) from calls where created_at >= v.a and created_at < v.b),
      'reports', (select count(*) from reports where created_at >= v.a and created_at < v.b)) as j, k
    from (values (t0, now() + interval '1 second', 'now'), (p0, t0, 'prev')) v(a, b, k)
  ),
  cohort as (select id from profiles where created_at >= t0 and deleted_at is null)
  select jsonb_build_object(
    'days', v_days,
    'series', (select coalesce(jsonb_agg(to_jsonb(s) order by s.day), '[]') from series s),
    'now', (select j from tot where k = 'now'),
    'prev', (select j from tot where k = 'prev'),
    'types', jsonb_build_object(
      'workers', (select count(*) from profiles where deleted_at is null and not biz_only and coalesce(array_length(skills, 1), 0) > 0),
      'hirers', (select count(*) from profiles where deleted_at is null and not biz_only and coalesce(array_length(skills, 1), 0) = 0),
      'business_accounts', (select count(*) from profiles where deleted_at is null and biz_only),
      'businesses', (select count(*) from businesses)),
    'cities', (select coalesce(jsonb_agg(c), '[]') from (
        select initcap(trim(city)) as city, count(*)::int as n from profiles
         where deleted_at is null and coalesce(trim(city), '') <> '' group by initcap(trim(city)) order by n desc, city limit 6) c),
    'funnel', jsonb_build_object(
      'signed_up', (select count(*) from cohort),
      'profile', (select count(*) from profiles p join cohort c on c.id = p.id
                   where coalesce(trim(p.city), '') <> '' and (coalesce(array_length(p.skills, 1), 0) > 0 or coalesce(p.bio, '') <> '' or p.biz_only)),
      'verified', (select count(*) from profiles p join cohort c on c.id = p.id where p.verified),
      'acted', (select count(*) from cohort c where exists (select 1 from acts a where a.u = c.id)),
      'booked', (select count(*) from cohort c where exists (select 1 from bookings b where c.id in (b.worker_id, b.client_id)))),
    'bookings_by_state', (select coalesce(jsonb_object_agg(state, n), '{}') from (select state, count(*)::int as n from bookings group by state) b)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;

-- ================================================================ feature switches
/** Is this part of bolo switched on? Everything is on unless an admin switched it off. */
create or replace function private.feature_on(p_name text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value ->> p_name)::boolean from app_config where key = 'features'), true);
$$;
revoke all on function private.feature_on(text) from public, anon, authenticated;

create or replace function public.stop_paused_calls() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if not private.feature_on('calls') then
    raise exception 'Calls are paused for a moment by bolo. Please try again later.' using errcode = 'P0001', hint = 'paused';
  end if;
  return new;
end $$;
drop trigger if exists calls_paused on public.calls;
create trigger calls_paused before insert on public.calls for each row execute function public.stop_paused_calls();

create or replace function public.stop_paused_posting() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if not private.feature_on('posting') and not public.is_admin() then
    raise exception 'New posts and comments are paused for a moment by bolo. Please try again later.' using errcode = 'P0001', hint = 'paused';
  end if;
  return new;
end $$;
drop trigger if exists posts_paused on public.posts;
create trigger posts_paused before insert on public.posts for each row execute function public.stop_paused_posting();
drop trigger if exists comments_paused on public.comments;
create trigger comments_paused before insert on public.comments for each row execute function public.stop_paused_posting();

-- new accounts: refused before they are made (the app checks the switch first and explains)
create or replace function public.stop_paused_signups() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if not private.feature_on('signups') then
    raise exception 'New sign-ups are paused for a moment. Please try again later.' using errcode = 'P0001', hint = 'paused';
  end if;
  return new;
end $$;
drop trigger if exists signups_paused on auth.users;
create trigger signups_paused before insert on auth.users for each row execute function public.stop_paused_signups();

-- ================================================================ blocked words
create table if not exists private.blocked_words (
  word       text primary key check (char_length(word) between 2 and 40 and word = lower(word)),
  added_by   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
revoke all on private.blocked_words from public, anon, authenticated;

/** Does this text contain a blocked word (whole words, any case)? */
create or replace function private.has_blocked_word(p_text text) returns boolean language sql stable security definer set search_path = public, private as $$
  select coalesce(p_text, '') <> '' and exists (
    select 1 from private.blocked_words w
     where lower(p_text) ~ ('\m' || regexp_replace(w.word, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M'));
$$;
revoke all on function private.has_blocked_word(text) from public, anon, authenticated;

create or replace function public.stop_blocked_words() returns trigger language plpgsql security definer set search_path = public, private as $$
declare txt text;
begin
  -- read through json: comments have no title, and a record field that does not exist cannot even be named
  txt := coalesce(to_jsonb(new) ->> 'title', '') || ' ' || coalesce(to_jsonb(new) ->> 'body', '');
  if private.has_blocked_word(txt) then
    raise exception 'This contains words that are not allowed on bolo. Please change it and try again.' using errcode = 'P0001', hint = 'blocked_word';
  end if;
  return new;
end $$;
drop trigger if exists posts_blocked_words on public.posts;
create trigger posts_blocked_words before insert or update of title, body on public.posts for each row execute function public.stop_blocked_words();
drop trigger if exists comments_blocked_words on public.comments;
create trigger comments_blocked_words before insert or update of body on public.comments for each row execute function public.stop_blocked_words();

create or replace function public.admin_blocked_words() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(w.word order by w.word), '[]') from private.blocked_words w);
end $$;
revoke all on function public.admin_blocked_words() from public, anon;
grant execute on function public.admin_blocked_words() to authenticated;

/** Replace the list (owners and admins). Words are kept in lower case; returns the list as saved. */
create or replace function public.admin_set_blocked_words(p_words text[]) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare clean text[];
begin
  perform private.need_admin();
  perform private.need_senior();
  select coalesce(array_agg(distinct w), '{}') into clean
    from (select lower(trim(x)) as w from unnest(coalesce(p_words, '{}')) x) s
   where char_length(w) between 2 and 40;
  if array_length(clean, 1) > 500 then raise exception 'at most 500 words'; end if;
  delete from private.blocked_words where word <> all(clean);
  insert into private.blocked_words (word, added_by) select w, auth.uid() from unnest(clean) w on conflict do nothing;
  perform bolo_audit('config.set', 'blocked_words', 'blocked_words', jsonb_build_object('note', coalesce(array_length(clean, 1), 0) || ' blocked words'));
  return to_jsonb(clean);
end $$;
revoke all on function public.admin_set_blocked_words(text[]) from public, anon;
grant execute on function public.admin_set_blocked_words(text[]) to authenticated;

-- ================================================================ settings: the switches can be changed from the panel
create or replace function public.admin_set_config(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  if p_key not in ('min_version', 'maintenance', 'features') then raise exception 'unknown setting'; end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object' then raise exception 'bad value'; end if;
  if p_key = 'features' then
    perform private.need_senior();
    -- only the known switches, as true or false
    p_value := jsonb_build_object(
      'signups', coalesce((p_value ->> 'signups')::boolean, true),
      'calls', coalesce((p_value ->> 'calls')::boolean, true),
      'posting', coalesce((p_value ->> 'posting')::boolean, true));
  end if;
  insert into app_config (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform bolo_audit('config.set', 'app_config', p_key, p_value);
end $$;
revoke all on function public.admin_set_config(text, jsonb) from public, anon;
grant execute on function public.admin_set_config(text, jsonb) to authenticated;
