-- bolo · 0003 foundations
-- Admins and an audit log, safety (blocks, reports, ID/business verification), push tokens,
-- rate limits, location, account deletion and data export, app config (minimum app version).
-- Runs after 0001 and 0002. Safe to re-run. Applied by CI (see docs/BACKEND.md), never by hand on production.
--
-- Rules the database enforces here:
--   • only admins (rows in admin_users) can read private data of other people, review reports and verifications
--   • every admin action goes through a function that writes audit_log; audit_log can never be edited or deleted
--   • blocked people cannot comment on each other's posts
--   • a person can report something once; reports, posts and comments are rate limited
--   • ID and business documents live in a private bucket: the owner uploads, only admins read
--   • exact location is private; the public profile only shows it rounded to about 1 km
--   • students can leave a course themselves but can never approve their own enrolment (fixes 0002)

set search_path = public, extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;          -- not exposed through the API
revoke all on schema private from public, anon, authenticated;

-- ================================================================ admins
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'moderator' check (role in ('owner', 'admin', 'moderator', 'support')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke insert, update, delete on public.admin_users from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins see admins" on public.admin_users;
create policy "admins see admins" on public.admin_users for select to authenticated using (public.is_admin());

-- ================================================================ audit log (append-only)
create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  action       text not null,
  target_table text,
  target_id    text,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_target on public.audit_log(target_table, target_id);
alter table public.audit_log enable row level security;
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
drop policy if exists "admins read audit" on public.audit_log;
create policy "admins read audit" on public.audit_log for select to authenticated using (public.is_admin());

create or replace function public.forbid_change() returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;
drop trigger if exists audit_log_append_only on public.audit_log;
create trigger audit_log_append_only before update or delete on public.audit_log for each row execute function public.forbid_change();

create or replace function public.bolo_audit(p_action text, p_table text, p_id text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor_id, action, target_table, target_id, data) values (auth.uid(), p_action, p_table, p_id, coalesce(p_data, '{}'));
$$;
revoke all on function public.bolo_audit(text, text, text, jsonb) from public, anon, authenticated;

-- ================================================================ rate limits
create table if not exists private.rate_hits (
  key          text not null,
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (key, window_start)
);

/** Count one action for the signed-in person; fails with "Too many requests" over p_max per p_window. */
create or replace function public.bolo_hit(p_action text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = public, private as $$
declare
  secs double precision := extract(epoch from p_window);
  win  timestamptz := to_timestamp(floor(extract(epoch from now()) / secs) * secs);
  k    text := p_action || ':' || coalesce(auth.uid()::text, 'anon');
  n    int;
begin
  if auth.uid() is null then return; end if;           -- server code (service role) is not limited here
  insert into private.rate_hits as r (key, window_start, hits) values (k, win, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if random() < 0.01 then delete from private.rate_hits where window_start < now() - interval '2 days'; end if;
  if n > p_max then
    raise exception 'Too many requests. Try again later.' using errcode = 'P0001', hint = p_action;
  end if;
end $$;
revoke all on function public.bolo_hit(text, int, interval) from public, anon, authenticated;

create or replace function public.limit_posts() returns trigger language plpgsql security definer set search_path = public as $$
begin perform bolo_hit('post', 20, interval '1 hour'); return new; end $$;
drop trigger if exists posts_rate on public.posts;
create trigger posts_rate before insert on public.posts for each row execute function public.limit_posts();

create or replace function public.limit_comments() returns trigger language plpgsql security definer set search_path = public as $$
begin perform bolo_hit('comment', 30, interval '10 minutes'); return new; end $$;
drop trigger if exists comments_rate on public.comments;
create trigger comments_rate before insert on public.comments for each row execute function public.limit_comments();

-- ================================================================ profiles: location, availability, deletion
alter table public.profiles add column if not exists location_approx geography(Point, 4326);
alter table public.profiles add column if not exists availability jsonb not null default '{}';
alter table public.profiles add column if not exists deleted_at timestamptz;
create index if not exists profiles_location_gix on public.profiles using gist (location_approx);
create index if not exists profiles_name_trgm on public.profiles using gin (name gin_trgm_ops);
grant update (availability) on public.profiles to authenticated;

alter table public.profiles_private add column if not exists location geography(Point, 4326);

-- the exact point stays private; the public profile gets it snapped to a ~1 km grid
create or replace function public.sync_location() returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.profiles
     set location_approx = case when new.location is null then null
                                else st_snaptogrid(new.location::geometry, 0.01)::geography end
   where id = new.id;
  return new;
end $$;
drop trigger if exists profiles_private_location on public.profiles_private;
create trigger profiles_private_location after insert or update of location on public.profiles_private for each row execute function public.sync_location();

/** Save my exact location (lat, lng). */
create or replace function public.set_my_location(lat double precision, lng double precision)
returns void language plpgsql security invoker set search_path = public, extensions as $$
begin
  if lat not between -90 and 90 or lng not between -180 and 180 then raise exception 'bad coordinates'; end if;
  update public.profiles_private set location = st_setsrid(st_makepoint(lng, lat), 4326)::geography where id = auth.uid();
end $$;
grant execute on function public.set_my_location(double precision, double precision) to authenticated;

-- deleted (or being deleted) accounts disappear from public view
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (deleted_at is null or id = auth.uid() or public.is_admin());

-- admins can read private parts (support, verification); every change still goes through audited functions
drop policy if exists "admins read private" on public.profiles_private;
create policy "admins read private" on public.profiles_private for select to authenticated using (public.is_admin());
drop policy if exists "admins read business docs" on public.business_private;
create policy "admins read business docs" on public.business_private for select to authenticated using (public.is_admin());

-- ================================================================ blocks
create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "own blocks" on public.blocks;
create policy "own blocks" on public.blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

/** True if either person blocked the other. */
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke all on function public.is_blocked(uuid, uuid) from public;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

drop policy if exists "comment as yourself" on public.comments;
create policy "comment as yourself" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and not public.is_blocked(auth.uid(), (select p.author_id from public.posts p where p.id = post_id)));

-- moderators can take down posts and comments
drop policy if exists "admins remove posts" on public.posts;
create policy "admins remove posts" on public.posts for delete to authenticated using (public.is_admin());
drop policy if exists "admins remove comments" on public.comments;
create policy "admins remove comments" on public.comments for delete to authenticated using (public.is_admin());

-- ================================================================ reports (the moderation queue)
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'business', 'post', 'comment', 'job', 'message', 'course', 'expert', 'opportunity')),
  target_id   text not null,
  reason      text not null check (reason in ('spam', 'scam', 'harassment', 'inappropriate', 'fake', 'wrong_link', 'other')),
  details     text check (details is null or char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  handled_by  uuid references auth.users(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index if not exists reports_queue on public.reports(status, created_at);
alter table public.reports enable row level security;
revoke insert, update, delete on public.reports from anon, authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;
drop policy if exists "report as yourself" on public.reports;
create policy "report as yourself" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "see own reports" on public.reports;
create policy "see own reports" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

create or replace function public.limit_reports() returns trigger language plpgsql security definer set search_path = public as $$
begin perform bolo_hit('report', 20, interval '1 day'); return new; end $$;
drop trigger if exists reports_rate on public.reports;
create trigger reports_rate before insert on public.reports for each row execute function public.limit_reports();

/** Admin: close a report. */
create or replace function public.admin_resolve_report(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if p_status not in ('reviewing', 'actioned', 'dismissed') then raise exception 'bad status'; end if;
  update reports set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_id;
  if not found then raise exception 'no such report'; end if;
  perform bolo_audit('report.' || p_status, 'reports', p_id::text, jsonb_build_object('note', p_note));
end $$;
revoke all on function public.admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

-- ================================================================ verifications (ID, selfie, business, expert)
create table if not exists public.verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('id', 'business', 'expert')),
  business_id uuid references public.businesses(id) on delete cascade,
  files       text[] not null default '{}',          -- paths inside the private "verifications" bucket
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note        text,                                   -- reason shown to the person when rejected
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind <> 'business' or business_id is not null)
);
create index if not exists verifications_queue on public.verifications(status, created_at);
create unique index if not exists verifications_one_pending on public.verifications(user_id, kind, coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid)) where status = 'pending';
alter table public.verifications enable row level security;
revoke insert, update, delete on public.verifications from anon, authenticated;
grant insert (kind, business_id, files) on public.verifications to authenticated;
drop policy if exists "request own verification" on public.verifications;
create policy "request own verification" on public.verifications for insert to authenticated
  with check (user_id = auth.uid() and (business_id is null or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())));
drop policy if exists "see own verifications" on public.verifications;
create policy "see own verifications" on public.verifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop trigger if exists verifications_touch on public.verifications;
create trigger verifications_touch before update on public.verifications for each row execute function public.touch_updated_at();

/** Admin: approve or reject a verification. Approving sets the badge. */
create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.verifications;
begin
  if not is_admin() then raise exception 'admins only'; end if;
  select * into v from verifications where id = p_id for update;
  if not found then raise exception 'no such verification'; end if;
  update verifications set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  if v.kind = 'id' then
    update profiles set verified = p_approve where id = v.user_id;
  elsif v.kind = 'business' then
    update businesses set verified = case when p_approve then 'verified' else 'none' end where id = v.business_id;
  end if;
  perform bolo_audit(case when p_approve then 'verification.approve' else 'verification.reject' end, 'verifications', p_id::text, jsonb_build_object('kind', v.kind, 'user', v.user_id, 'note', p_note));
  perform bolo_notify(v.user_id, auth.uid(), 'verification', 'account',
    case when p_approve then 'Your ' || case v.kind when 'business' then 'business' when 'expert' then 'expert profile' else 'ID' end || ' is verified'
         else 'Your verification needs another look' || coalesce(': ' || p_note, '') end,
    jsonb_build_object('k', 'verify', 'id', v.kind), 'verif:' || p_id || ':' || p_approve);
end $$;
revoke all on function public.admin_review_verification(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_verification(uuid, boolean, text) to authenticated;

/** Admin: give or take Pro (until payments are live). */
create or replace function public.admin_set_pro(p_user uuid, p_regular boolean, p_business boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  update profiles set pro_regular = p_regular, pro_business = p_business where id = p_user;
  perform bolo_audit('pro.set', 'profiles', p_user::text, jsonb_build_object('regular', p_regular, 'business', p_business));
end $$;
revoke all on function public.admin_set_pro(uuid, boolean, boolean) from public, anon;
grant execute on function public.admin_set_pro(uuid, boolean, boolean) to authenticated;

-- private bucket for ID and registration documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verifications', 'verifications', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "verification docs own upload" on storage.objects;
create policy "verification docs own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "verification docs own or admin read" on storage.objects;
create policy "verification docs own or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verifications' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ================================================================ push tokens
create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null check (platform in ('android', 'ios', 'web')),
  app_version text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
revoke insert, update on public.push_tokens from anon, authenticated;
drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens for select to authenticated using (user_id = auth.uid());
drop policy if exists "remove own push tokens" on public.push_tokens;
create policy "remove own push tokens" on public.push_tokens for delete to authenticated using (user_id = auth.uid());

/** Register this phone for push. A phone that changes account moves to the new account. */
create or replace function public.register_push_token(p_token text, p_platform text, p_version text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if char_length(p_token) not between 10 and 300 then raise exception 'bad token'; end if;
  perform bolo_hit('push_token', 30, interval '1 hour');
  insert into push_tokens (token, user_id, platform, app_version) values (p_token, auth.uid(), p_platform, p_version)
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, app_version = excluded.app_version, updated_at = now();
end $$;
revoke all on function public.register_push_token(text, text, text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;

-- ================================================================ course enrolments: students cannot approve themselves (fix)
drop policy if exists "owner answers enrolment" on public.course_enrollments;
drop policy if exists "owner or student updates enrolment" on public.course_enrollments;
create policy "owner or student updates enrolment" on public.course_enrollments for update to authenticated
  using (student_id = auth.uid() or exists (select 1 from public.courses c where c.id = course_id and c.owner_id = auth.uid()));

create or replace function public.guard_enrolment() returns trigger language plpgsql security definer set search_path = public as $$
declare is_owner boolean;
begin
  if auth.uid() is null then return new; end if;     -- server code
  if new.course_id <> old.course_id or new.student_id <> old.student_id then raise exception 'cannot move an enrolment'; end if;
  select exists (select 1 from courses c where c.id = new.course_id and c.owner_id = auth.uid()) into is_owner;
  if not is_owner and new.status is distinct from old.status and new.status <> 'left' then
    raise exception 'only the course owner can approve or reject';
  end if;
  return new;
end $$;
drop trigger if exists enrolment_guard on public.course_enrollments;
create trigger enrolment_guard before update on public.course_enrollments for each row execute function public.guard_enrolment();

-- ================================================================ account deletion and data export
/** Step 1 of deleting my account: hide it at once. The delete-account server function then removes it for good. */
create or replace function public.request_account_deletion() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update profiles set deleted_at = coalesce(deleted_at, now()) where id = auth.uid();
  delete from push_tokens where user_id = auth.uid();
  perform bolo_audit('account.delete_requested', 'profiles', auth.uid()::text);
end $$;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

/** Everything bolo stores about me, as one JSON document (Settings → Download my data). */
create or replace function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'exported_at',        now(),
    'profile',            (select to_jsonb(p) - 'location_approx' from profiles p where p.id = auth.uid()),
    'private',            (select to_jsonb(p) - 'location' from profiles_private p where p.id = auth.uid()),
    'businesses',         coalesce((select jsonb_agg(to_jsonb(b) || jsonb_build_object('documents', (select to_jsonb(d) from business_private d where d.business_id = b.id))) from businesses b where b.owner_id = auth.uid()), '[]'),
    'posts',              coalesce((select jsonb_agg(to_jsonb(x)) from posts x where x.author_id = auth.uid()), '[]'),
    'comments',           coalesce((select jsonb_agg(to_jsonb(x)) from comments x where x.author_id = auth.uid()), '[]'),
    'courses',            coalesce((select jsonb_agg(to_jsonb(x)) from courses x where x.owner_id = auth.uid()), '[]'),
    'enrolments',         coalesce((select jsonb_agg(to_jsonb(x)) from course_enrollments x where x.student_id = auth.uid()), '[]'),
    'course_reviews',     coalesce((select jsonb_agg(to_jsonb(x)) from course_reviews x where x.student_id = auth.uid()), '[]'),
    'notifications',      coalesce((select jsonb_agg(to_jsonb(x)) from notifications x where x.recipient_id = auth.uid()), '[]'),
    'notification_prefs', coalesce((select jsonb_agg(to_jsonb(x)) from notification_prefs x where x.user_id = auth.uid()), '[]'),
    'blocks',             coalesce((select jsonb_agg(to_jsonb(x)) from blocks x where x.blocker_id = auth.uid()), '[]'),
    'reports',            coalesce((select jsonb_agg(to_jsonb(x)) from reports x where x.reporter_id = auth.uid()), '[]'),
    'verifications',      coalesce((select jsonb_agg(to_jsonb(x) - 'files') from verifications x where x.user_id = auth.uid()), '[]')
  );
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ================================================================ app config (read by the app at start)
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke insert, update, delete on public.app_config from anon, authenticated;
drop policy if exists "config readable" on public.app_config;
create policy "config readable" on public.app_config for select using (true);
insert into public.app_config (key, value) values
  ('min_version', '{"android": 1, "ios": 1, "message": "A new version of bolo is ready. Update to keep using the app."}'),
  ('maintenance', '{"on": false, "message": ""}')
on conflict (key) do nothing;
