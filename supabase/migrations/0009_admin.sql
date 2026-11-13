-- bolo · 0009 admin panel
-- Everything the web admin panel needs. The panel signs in like any account and uses the public key;
-- every function below checks is_admin() itself, and every change is written to the audit log.
--
--   • suspension: a suspended account is hidden from the lists and cannot post, comment, message, call,
--     follow, apply or report (it can still read, write to the bolo team, export its data and delete itself)
--   • queues with the details a reviewer needs: ID checks, business checks, reports, feedback, experts
--   • people: search, details, suspend / restore
--   • settings: minimum app version, maintenance message, who the admins are (owners only)
-- Safe to re-run.

set search_path = public, extensions;

-- ================================================================ suspension
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_note text;

create or replace function public.is_suspended(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_user and suspended_at is not null);
$$;
revoke all on function public.is_suspended(uuid) from public, anon;
grant execute on function public.is_suspended(uuid) to authenticated;

-- The rate limiter is on every write people can make to each other: the one place to stop a suspended account.
create or replace function public.bolo_hit(p_action text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  secs double precision := extract(epoch from p_window);
  win  timestamptz := to_timestamp(floor(extract(epoch from now()) / secs) * secs);
  k    text := p_action || ':' || coalesce(auth.uid()::text, 'anon');
  n    int;
begin
  if auth.uid() is null then return; end if;           -- server code (service role) is not limited here
  if p_action not in ('feedback', 'push_token') and exists (select 1 from public.profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'Your account is suspended. Write to bolo from Settings → Help.' using errcode = 'P0001', hint = 'suspended';
  end if;
  insert into private.rate_hits as r (key, window_start, hits) values (k, win, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if random() < 0.01 then delete from private.rate_hits where window_start < now() - interval '2 days'; end if;
  if n > p_max then
    raise exception 'Too many requests. Try again later.' using errcode = 'P0001', hint = p_action;
  end if;
end $$;
revoke all on function public.bolo_hit(text, int, interval) from public, anon, authenticated;

-- likes, saves and reviews had no limiter: a suspended account is stopped there too
create or replace function public.stop_suspended() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and exists (select 1 from profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'Your account is suspended. Write to bolo from Settings → Help.' using errcode = 'P0001', hint = 'suspended';
  end if;
  return new;
end $$;
drop trigger if exists post_likes_suspended on public.post_likes;
create trigger post_likes_suspended before insert on public.post_likes for each row execute function public.stop_suspended();
drop trigger if exists reviews_suspended on public.reviews;
create trigger reviews_suspended before insert on public.reviews for each row execute function public.stop_suspended();
drop trigger if exists listings_suspended on public.course_listings;
create trigger listings_suspended before insert on public.course_listings for each row execute function public.stop_suspended();
drop trigger if exists opportunities_suspended on public.opportunities;
create trigger opportunities_suspended before insert on public.opportunities for each row execute function public.stop_suspended();
drop trigger if exists mentorships_suspended on public.mentorships;
create trigger mentorships_suspended before insert on public.mentorships for each row execute function public.stop_suspended();

-- a suspended profile leaves the lists (same columns as 0008; the account itself still sees its own row in profiles)
create or replace view public.profile_cards with (security_invoker = true) as
  select p.id, p.name, p.avatar_url, p.city, p.bio, p.role, p.biz_only, p.intents, p.skills, p.skill_list, p.level, p.years,
         p.work_status, p.hire_status, p.area, p.experience, p.education, p.languages, p.services, p.verified, p.availability, p.created_at,
         case when p.visible then st_x(p.location_approx::geometry) end as lng, case when p.visible then st_y(p.location_approx::geometry) end as lat,
         coalesce(s.followers, 0) as followers, coalesce(s.following, 0) as following, coalesce(s.jobs_done, 0) as jobs_done,
         coalesce(s.hires, 0) as hires, s.rating, coalesce(s.reviews, 0) as reviews,
         (p.visible and p.suspended_at is null) as visible
  from public.profiles p left join public.profile_stats s on s.id = p.id
  where p.deleted_at is null;
grant select on public.profile_cards to anon, authenticated;

-- their posts leave the feed while suspended
create or replace view public.post_feed with (security_invoker = true) as
  select p.id, p.author_id, p.business_id, p.kind, p.title, p.body, p.photos, p.cat, p.area, p.status, p.urgent, p.budget_num, p.data, p.created_at,
         st_x(p.location::geometry) as lng, st_y(p.location::geometry) as lat,
         coalesce(s.likes, 0) as likes, coalesce(s.comments, 0) as comments, coalesce(s.offers, 0) as offers
  from public.posts p left join public.post_stats s on s.post_id = p.id
  where p.author_id = auth.uid() or not exists (select 1 from public.profiles x where x.id = p.author_id and x.suspended_at is not null);
grant select on public.post_feed to anon, authenticated;

-- ================================================================ helpers
create or replace function private.need_admin() returns void language plpgsql as $$
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
end $$;
create or replace function private.need_owner() returns void language plpgsql as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'owner') then
    raise exception 'only an owner can change who the admins are' using errcode = '42501';
  end if;
end $$;

/** Who am I in the panel: null when this account is not an admin. */
create or replace function public.admin_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('role', a.role, 'name', coalesce(nullif(p.name, ''), 'Admin'), 'email', u.email)
  from admin_users a join auth.users u on u.id = a.user_id left join profiles p on p.id = a.user_id
  where a.user_id = auth.uid();
$$;
revoke all on function public.admin_me() from public, anon;
grant execute on function public.admin_me() to authenticated;

-- ================================================================ overview
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return jsonb_build_object(
    'people', (select count(*) from profiles where deleted_at is null),
    'people_7d', (select count(*) from profiles where deleted_at is null and created_at > now() - interval '7 days'),
    'people_today', (select count(*) from profiles where deleted_at is null and created_at > now() - interval '1 day'),
    'businesses', (select count(*) from businesses),
    'posts', (select count(*) from posts),
    'jobs_open', (select count(*) from posts where kind = 'request' and status = 'open'),
    'bookings', (select count(*) from bookings),
    'bookings_done', (select count(*) from bookings where state = 'confirmed'),
    'messages_7d', (select count(*) from messages where created_at > now() - interval '7 days'),
    'calls_7d', (select count(*) from calls where created_at > now() - interval '7 days'),
    'suspended', (select count(*) from profiles where suspended_at is not null and deleted_at is null),
    'queue', jsonb_build_object(
      'id_checks', (select count(*) from verifications where status = 'pending'),
      'business_checks', (select count(*) from businesses where verified = 'review'),
      'reports', (select count(*) from reports where status in ('open', 'reviewing')),
      'feedback', (select count(*) from feedback where status = 'open'),
      'experts', (select count(*) from experts where status in ('submitted', 'review', 'interview'))
    ),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', n) order by d), '[]')
                from (select g.d, (select count(*) from profiles p where p.created_at >= g.d and p.created_at < g.d + interval '1 day') as n
                      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as g(d)) t)
  );
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- ================================================================ people
create or replace function public.admin_people(p_query text default null, p_filter text default 'all', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare q text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform private.need_admin();
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]') from (
      select p.id, p.name, u.email, u.phone, p.city, p.skills, p.verified, p.visible, p.biz_only,
             p.suspended_at, p.deleted_at, p.created_at, u.last_sign_in_at, u.email_confirmed_at is not null as confirmed,
             (select count(*) from posts where author_id = p.id) as posts,
             (select count(*) from reports r where r.target_type = 'profile' and r.target_id = p.id::text) as reports
      from profiles p join auth.users u on u.id = p.id
      where (q is null or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%' or u.phone ilike '%' || q || '%' or p.city ilike '%' || q || '%' or p.id::text = q)
        and case p_filter when 'suspended' then p.suspended_at is not null
                          when 'verified' then p.verified
                          when 'reported' then exists (select 1 from reports r where r.target_type = 'profile' and r.target_id = p.id::text)
                          when 'deleted' then p.deleted_at is not null
                          else p.deleted_at is null end
      order by p.created_at desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
    ) t
  );
end $$;
revoke all on function public.admin_people(text, text, int, int) from public, anon;
grant execute on function public.admin_people(text, text, int, int) to authenticated;

/** One person, with what a reviewer needs to decide. Message contents are never shown. */
create or replace function public.admin_person(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (
    select jsonb_build_object(
      'profile', to_jsonb(p) - 'location' - 'location_approx',
      'email', u.email, 'phone', u.phone, 'confirmed', u.email_confirmed_at is not null or u.phone_confirmed_at is not null,
      'last_sign_in_at', u.last_sign_in_at,
      'businesses', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'verified', b.verified, 'city', b.city)), '[]') from businesses b where b.owner_id = p.id),
      'counts', jsonb_build_object(
        'posts', (select count(*) from posts where author_id = p.id),
        'offers', (select count(*) from applications where applicant_id = p.id),
        'bookings', (select count(*) from bookings where worker_id = p.id or client_id = p.id),
        'messages', (select count(*) from messages where sender_id = p.id),
        'reviews', (select count(*) from reviews where reviewee_id = p.id),
        'blocked_by', (select count(*) from blocks where blocked_id = p.id)),
      'posts', (select coalesce(jsonb_agg(x), '[]') from (select id, kind, title, left(body, 200) as body, status, created_at from posts where author_id = p.id order by created_at desc limit 10) x),
      'reports', (select coalesce(jsonb_agg(x), '[]') from (
          select r.id, r.target_type, r.reason, r.details, r.status, r.created_at from reports r
          where (r.target_type = 'profile' and r.target_id = p.id::text)
             or (r.target_type in ('post', 'job') and r.target_id in (select id from posts where author_id = p.id))
          order by r.created_at desc limit 20) x),
      'verifications', (select coalesce(jsonb_agg(x), '[]') from (select id, kind, status, note, created_at from verifications where user_id = p.id order by created_at desc limit 10) x),
      'history', (select coalesce(jsonb_agg(x), '[]') from (select action, data, created_at from audit_log where target_id = p.id::text order by created_at desc limit 20) x)
    )
    from profiles p join auth.users u on u.id = p.id where p.id = p_user
  );
end $$;
revoke all on function public.admin_person(uuid) from public, anon;
grant execute on function public.admin_person(uuid) to authenticated;

/** Suspend an account (or lift the suspension). The person is told why. */
create or replace function public.admin_suspend(p_user uuid, p_on boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  if p_user = auth.uid() then raise exception 'you cannot suspend yourself'; end if;
  if p_on and exists (select 1 from admin_users where user_id = p_user) then raise exception 'remove them as an admin first'; end if;
  update profiles set suspended_at = case when p_on then now() end, suspended_note = case when p_on then nullif(trim(coalesce(p_note, '')), '') end where id = p_user;
  if not found then raise exception 'no such account'; end if;
  perform bolo_audit(case when p_on then 'account.suspend' else 'account.restore' end, 'profiles', p_user::text, jsonb_build_object('note', p_note));
  perform bolo_notify(p_user, auth.uid(), 'account', 'account',
    case when p_on then 'Your account is suspended' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. Write to bolo from Settings → Help if you think this is a mistake.'
         else 'Your account is active again.' end,
    jsonb_build_object('k', 'me'), 'suspend:' || p_user || ':' || p_on || ':' || extract(epoch from now())::bigint);
end $$;
revoke all on function public.admin_suspend(uuid, boolean, text) from public, anon;
grant execute on function public.admin_suspend(uuid, boolean, text) to authenticated;

-- ================================================================ ID checks and business checks
create or replace function public.admin_verifications(p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select v.id, v.kind, v.status, v.note, v.files, v.created_at, v.reviewed_at, v.user_id, v.business_id,
           p.name, u.email, u.phone, p.city, p.avatar_url, p.created_at as joined_at,
           (select b.name from businesses b where b.id = v.business_id) as business
    from verifications v join profiles p on p.id = v.user_id join auth.users u on u.id = v.user_id
    where v.status = coalesce(p_status, 'pending')
    order by case when v.status = 'pending' then v.created_at end asc, v.reviewed_at desc nulls last
    limit 200) x);
end $$;
revoke all on function public.admin_verifications(text) from public, anon;
grant execute on function public.admin_verifications(text) to authenticated;

create or replace function public.admin_businesses(p_status text default 'review') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select b.id, b.name, b.sector, b.size, b.city, b.area, b.address, b.phone, b.email, b.web, b.about, b.logo_url, b.verified, b.created_at,
           bp.rccm, bp.niu, b.owner_id, p.name as owner, u.email as owner_email, p.verified as owner_verified
    from businesses b left join business_private bp on bp.business_id = b.id join profiles p on p.id = b.owner_id join auth.users u on u.id = b.owner_id
    where case coalesce(p_status, 'review') when 'all' then true else b.verified = coalesce(p_status, 'review') end
    order by b.created_at desc limit 200) x);
end $$;
revoke all on function public.admin_businesses(text) from public, anon;
grant execute on function public.admin_businesses(text) to authenticated;

/** Approve or reject a business that asked to be verified (RCCM and NIU on file). */
create or replace function public.admin_review_business(p_business uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare b businesses;
begin
  perform private.need_admin();
  select * into b from businesses where id = p_business for update;
  if not found then raise exception 'no such business'; end if;
  update businesses set verified = case when p_approve then 'verified' else 'none' end where id = p_business;
  update verifications set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   where business_id = p_business and status = 'pending';
  perform bolo_audit(case when p_approve then 'business.approve' else 'business.reject' end, 'businesses', p_business::text, jsonb_build_object('note', p_note, 'name', b.name));
  perform bolo_notify(b.owner_id, auth.uid(), 'verification', 'account',
    case when p_approve then '“' || b.name || '” is now a verified business'
         else 'We couldn’t verify “' || b.name || '”' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. Check the RCCM and NIU and ask again.' end,
    jsonb_build_object('k', 'verify', 'id', 'business'), 'bizverif:' || p_business || ':' || p_approve || ':' || extract(epoch from now())::bigint);
end $$;
revoke all on function public.admin_review_business(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_business(uuid, boolean, text) to authenticated;

-- ================================================================ reports
create or replace function public.admin_reports(p_status text default 'open') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, r.handled_at,
           rp.name as reporter, r.reporter_id,
           -- what was reported, and who is behind it
           case r.target_type
             when 'profile' then (select jsonb_build_object('title', t.name, 'text', left(t.bio, 300), 'owner_id', t.id, 'owner', t.name, 'suspended', t.suspended_at is not null) from profiles t where t.id::text = r.target_id)
             when 'post' then (select jsonb_build_object('title', coalesce(nullif(t.title, ''), 'Post'), 'text', left(t.body, 400), 'photos', t.photos, 'owner_id', t.author_id, 'owner', o.name, 'suspended', o.suspended_at is not null) from posts t join profiles o on o.id = t.author_id where t.id = r.target_id)
             when 'job' then (select jsonb_build_object('title', coalesce(nullif(t.title, ''), 'Job'), 'text', left(t.body, 400), 'photos', t.photos, 'owner_id', t.author_id, 'owner', o.name, 'suspended', o.suspended_at is not null) from posts t join profiles o on o.id = t.author_id where t.id = r.target_id)
             when 'comment' then (select jsonb_build_object('title', 'Comment', 'text', left(t.body, 400), 'owner_id', t.author_id, 'owner', o.name, 'suspended', o.suspended_at is not null) from comments t join profiles o on o.id = t.author_id where t.id::text = r.target_id)
             when 'business' then (select jsonb_build_object('title', t.name, 'text', left(t.about, 300), 'owner_id', t.owner_id, 'owner', o.name, 'suspended', o.suspended_at is not null) from businesses t join profiles o on o.id = t.owner_id where t.id::text = r.target_id)
             when 'course' then (select jsonb_build_object('title', t.title, 'text', t.url, 'owner_id', t.owner_id, 'owner', coalesce(o.name, 'bolo'), 'suspended', coalesce(o.suspended_at is not null, false)) from course_listings t left join profiles o on o.id = t.owner_id where t.id = r.target_id)
             when 'message' then (select jsonb_build_object('title', 'Message', 'text', left(t.body, 400), 'owner_id', t.sender_id, 'owner', o.name, 'suspended', o.suspended_at is not null) from messages t join profiles o on o.id = t.sender_id where t.id::text = r.target_id)
           end as target,
           (select count(*) from reports r2 where r2.target_type = r.target_type and r2.target_id = r.target_id) as times
    from reports r left join profiles rp on rp.id = r.reporter_id
    where case coalesce(p_status, 'open') when 'open' then r.status in ('open', 'reviewing') when 'all' then true else r.status = p_status end
    order by r.created_at desc limit 200) x);
end $$;
revoke all on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;

/** Take down a reported post or comment. The author is told. */
create or replace function public.admin_remove_content(p_type text, p_id text, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare owner uuid; label text;
begin
  perform private.need_admin();
  if p_type in ('post', 'job') then
    delete from posts where id = p_id returning author_id, coalesce(nullif(title, ''), left(body, 60)) into owner, label;
  elsif p_type = 'comment' then
    delete from comments where id::text = p_id returning author_id, left(body, 60) into owner, label;
  elsif p_type = 'course' then
    delete from course_listings where id = p_id returning owner_id, title into owner, label;
  else
    raise exception 'this kind of content cannot be removed here';
  end if;
  if not found then raise exception 'it is already gone'; end if;
  update reports set status = 'actioned', handled_by = auth.uid(), handled_at = now() where target_type = p_type and target_id = p_id and status in ('open', 'reviewing');
  perform bolo_audit('content.remove', p_type, p_id, jsonb_build_object('note', p_note, 'owner', owner, 'label', label));
  if owner is not null then perform bolo_notify(owner, auth.uid(), 'account', 'account',
    'We removed your ' || case p_type when 'comment' then 'comment' when 'course' then 'course listing' else 'post' end || ' “' || coalesce(label, '') || '” because it breaks bolo’s rules' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '.',
    jsonb_build_object('k', 'me'), 'removed:' || p_type || ':' || p_id);
  end if;
end $$;
revoke all on function public.admin_remove_content(text, text, text) from public, anon;
grant execute on function public.admin_remove_content(text, text, text) to authenticated;

-- ================================================================ feedback
alter table public.feedback add column if not exists admin_note text;
alter table public.feedback add column if not exists handled_by uuid references auth.users(id) on delete set null;
alter table public.feedback add column if not exists handled_at timestamptz;

create or replace function public.admin_feedback(p_status text default 'open') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select f.id, f.topic, f.body, f.app_version, f.status, f.admin_note, f.created_at, f.handled_at, f.user_id, p.name, u.email, u.phone, p.suspended_at is not null as suspended
    from feedback f join profiles p on p.id = f.user_id join auth.users u on u.id = f.user_id
    where case coalesce(p_status, 'open') when 'all' then true else f.status = p_status end
    order by f.created_at desc limit 200) x);
end $$;
revoke all on function public.admin_feedback(text) from public, anon;
grant execute on function public.admin_feedback(text) to authenticated;

create or replace function public.admin_set_feedback(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  if p_status not in ('open', 'answered', 'closed') then raise exception 'bad status'; end if;
  update feedback set status = p_status, admin_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), admin_note), handled_by = auth.uid(), handled_at = now() where id = p_id;
  if not found then raise exception 'no such message'; end if;
  perform bolo_audit('feedback.' || p_status, 'feedback', p_id::text, jsonb_build_object('note', p_note));
end $$;
revoke all on function public.admin_set_feedback(uuid, text, text) from public, anon;
grant execute on function public.admin_set_feedback(uuid, text, text) to authenticated;

-- ================================================================ expert applications
create or replace function public.admin_experts(p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select e.user_id, e.status, e.headline, e.data, e.note, e.created_at, e.updated_at, p.name, u.email, p.city, p.verified, p.years, p.skills
    from experts e join profiles p on p.id = e.user_id join auth.users u on u.id = e.user_id
    where case coalesce(p_status, 'pending') when 'pending' then e.status in ('submitted', 'review', 'interview') when 'all' then true else e.status = p_status end
    order by e.updated_at desc limit 200) x);
end $$;
revoke all on function public.admin_experts(text) from public, anon;
grant execute on function public.admin_experts(text) to authenticated;

-- ================================================================ settings
create or replace function public.admin_set_config(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  if p_key not in ('min_version', 'maintenance') then raise exception 'unknown setting'; end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object' then raise exception 'bad value'; end if;
  insert into app_config (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform bolo_audit('config.set', 'app_config', p_key, p_value);
end $$;
revoke all on function public.admin_set_config(text, jsonb) from public, anon;
grant execute on function public.admin_set_config(text, jsonb) to authenticated;

create or replace function public.admin_admins() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select a.user_id, a.role, a.created_at, coalesce(nullif(p.name, ''), 'Admin') as name, u.email, u.last_sign_in_at
    from admin_users a join auth.users u on u.id = a.user_id left join profiles p on p.id = a.user_id
    order by a.created_at) x);
end $$;
revoke all on function public.admin_admins() from public, anon;
grant execute on function public.admin_admins() to authenticated;

/** Owners only: make an existing bolo account an admin (or change its role). */
create or replace function public.admin_grant(p_email text, p_role text default 'moderator')
returns void language plpgsql security definer set search_path = public, private as $$
declare uid uuid;
begin
  perform private.need_owner();
  if p_role not in ('owner', 'admin', 'moderator', 'support') then raise exception 'bad role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'no bolo account uses that email: they sign up in the app first'; end if;
  insert into admin_users (user_id, role) values (uid, p_role) on conflict (user_id) do update set role = excluded.role;
  perform bolo_audit('admin.grant', 'admin_users', uid::text, jsonb_build_object('role', p_role));
end $$;
revoke all on function public.admin_grant(text, text) from public, anon;
grant execute on function public.admin_grant(text, text) to authenticated;

create or replace function public.admin_revoke(p_user uuid)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_owner();
  if p_user = auth.uid() then raise exception 'you cannot remove yourself'; end if;
  delete from admin_users where user_id = p_user;
  perform bolo_audit('admin.revoke', 'admin_users', p_user::text);
end $$;
revoke all on function public.admin_revoke(uuid) from public, anon;
grant execute on function public.admin_revoke(uuid) to authenticated;

/** The audit log, newest first, with the admin's name. */
create or replace function public.admin_audit(p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select l.id, l.action, l.target_table, l.target_id, l.data, l.created_at, coalesce(nullif(p.name, ''), 'System') as actor
    from audit_log l left join profiles p on p.id = l.actor_id
    order by l.id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) x);
end $$;
revoke all on function public.admin_audit(int) from public, anon;
grant execute on function public.admin_audit(int) to authenticated;
