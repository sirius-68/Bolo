-- bolo · activity: posts & comments, notifications, courses, enrolments, ratings, job photos
-- Run in Supabase → SQL Editor → New query → paste → Run (after 0001_accounts.sql). Safe to re-run.
--
-- The rules here are enforced by the database, not only by the app:
--   • comments: anyone signed in can comment; only the author can delete their comment
--   • notifications: created only by triggers (never by the app); each person reads/marks only their own;
--     the same event (event_key) is stored once per recipient
--   • course reviews: only a student ENROLLED in the course can rate it, 1–5 stars, one review per student
--     per course (editing updates it); the course owner cannot rate their own course
--   • job photos: JPG/PNG/WebP/HEIC up to 10 MB, each user writes only into their own folder

-- ---------------------------------------------------------------- posts (work posts and job listings)
create table if not exists public.posts (
  id          text primary key,
  author_id   uuid not null references auth.users(id) on delete cascade,
  kind        text not null default 'work' check (kind in ('work', 'job', 'availability', 'update')),
  title       text,
  body        text,
  photos      text[] not null default '{}',
  created_at  timestamptz not null default now()
);
alter table public.posts enable row level security;
drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select using (true);
drop policy if exists "own posts" on public.posts;
create policy "own posts" on public.posts for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ---------------------------------------------------------------- comments
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     text not null references public.posts(id) on delete cascade,
  author_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists comments_post on public.comments(post_id, created_at);
alter table public.comments enable row level security;
drop policy if exists "comments readable" on public.comments;
create policy "comments readable" on public.comments for select using (true);
drop policy if exists "comment as yourself" on public.comments;
create policy "comment as yourself" on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "delete own comment" on public.comments;
create policy "delete own comment" on public.comments for delete to authenticated using (author_id = auth.uid());

-- the count shown on a post is always computed from the rows (never a stored number that can drift)
create or replace view public.post_comment_counts as
  select p.id as post_id, count(c.id)::int as comments from public.posts p left join public.comments c on c.post_id = p.id group by p.id;

-- ---------------------------------------------------------------- notifications
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id     uuid references auth.users(id) on delete set null,
  type         text not null,
  category     text not null check (category in ('jobs','messages','reminders','applicants','news','learning','mentorship','social','account')),
  body         text not null,
  target       jsonb,           -- where tapping goes, e.g. {"k":"course","id":"c1"}
  event_key    text not null,   -- one event = one notification per recipient
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (recipient_id, event_key)
);
create index if not exists notifications_inbox on public.notifications(recipient_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "mark own read" on public.notifications;
create policy "mark own read" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
drop policy if exists "delete own notifications" on public.notifications;
create policy "delete own notifications" on public.notifications for delete to authenticated using (recipient_id = auth.uid());
revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- per-person category switches (Settings → Notifications); missing row = on
create table if not exists public.notification_prefs (
  user_id  uuid not null references auth.users(id) on delete cascade,
  category text not null,
  enabled  boolean not null default true,
  primary key (user_id, category)
);
alter table public.notification_prefs enable row level security;
drop policy if exists "own prefs" on public.notification_prefs;
create policy "own prefs" on public.notification_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- the only way notifications are created: from triggers, respecting prefs, never twice for one event
create or replace function public.bolo_notify(p_recipient uuid, p_actor uuid, p_type text, p_category text, p_body text, p_target jsonb, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  if exists (select 1 from notification_prefs where user_id = p_recipient and category = p_category and not enabled) then return; end if;
  insert into notifications (recipient_id, actor_id, type, category, body, target, event_key)
  values (p_recipient, p_actor, p_type, p_category, p_body, p_target, p_key)
  on conflict (recipient_id, event_key) do nothing;
end $$;
revoke all on function public.bolo_notify(uuid, uuid, text, text, text, jsonb, text) from public, anon, authenticated;

create or replace function public.on_comment() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform bolo_notify((select author_id from posts where id = new.post_id), new.author_id, 'comment', 'social',
                 'commented on your post', jsonb_build_object('k', 'post', 'id', new.post_id), 'cmt:' || new.id);
  return new;
end $$;
drop trigger if exists comment_notify on public.comments;
create trigger comment_notify after insert on public.comments for each row execute function public.on_comment();

-- ---------------------------------------------------------------- courses, enrolments, ratings
create table if not exists public.courses (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  title       text not null,
  price       integer not null default 0 check (price >= 0),
  seats       integer not null default 20 check (seats between 1 and 500),
  created_at  timestamptz not null default now()
);
alter table public.courses enable row level security;
drop policy if exists "courses readable" on public.courses;
create policy "courses readable" on public.courses for select using (true);
drop policy if exists "own courses" on public.courses;
create policy "own courses" on public.courses for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.course_enrollments (
  course_id   text not null references public.courses(id) on delete cascade,
  student_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status      text not null default 'active' check (status in ('pending', 'active', 'rejected', 'left')),
  created_at  timestamptz not null default now(),
  primary key (course_id, student_id)
);
alter table public.course_enrollments enable row level security;
drop policy if exists "see own or own course enrolments" on public.course_enrollments;
create policy "see own or own course enrolments" on public.course_enrollments for select to authenticated
  using (student_id = auth.uid() or exists (select 1 from courses c where c.id = course_id and c.owner_id = auth.uid()));
drop policy if exists "enrol yourself" on public.course_enrollments;
create policy "enrol yourself" on public.course_enrollments for insert to authenticated
  with check (student_id = auth.uid() and not exists (select 1 from courses c where c.id = course_id and c.owner_id = auth.uid()));
drop policy if exists "owner answers enrolment" on public.course_enrollments;
create policy "owner answers enrolment" on public.course_enrollments for update to authenticated
  using (exists (select 1 from courses c where c.id = course_id and c.owner_id = auth.uid()) or student_id = auth.uid());

create or replace function public.on_enrolment() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  select owner_id, title into v_owner, v_title from courses where id = new.course_id;
  if tg_op = 'INSERT' then
    perform bolo_notify(v_owner, new.student_id, 'enrol', 'applicants', 'enrolled in “' || v_title || '”',
                   jsonb_build_object('k', 'course', 'id', new.course_id), 'enrol:' || new.course_id || ':' || new.student_id);
  elsif new.status is distinct from old.status and new.status in ('active', 'rejected') then
    perform bolo_notify(new.student_id, v_owner, 'course', 'learning',
                   case when new.status = 'active' then 'You’re enrolled in “' || v_title || '”' else 'Your enrolment in “' || v_title || '” was not approved' end,
                   jsonb_build_object('k', 'coursePage', 'id', new.course_id), 'enrolst:' || new.course_id || ':' || new.status);
  end if;
  return new;
end $$;
drop trigger if exists enrolment_notify on public.course_enrollments;
create trigger enrolment_notify after insert or update on public.course_enrollments for each row execute function public.on_enrolment();

create table if not exists public.course_reviews (
  course_id   text not null references public.courses(id) on delete cascade,
  student_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  body        text check (body is null or char_length(body) <= 600),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (course_id, student_id)          -- one review per student per course
);
alter table public.course_reviews enable row level security;
drop policy if exists "reviews readable" on public.course_reviews;
create policy "reviews readable" on public.course_reviews for select using (true);
-- only enrolled (active) students may rate; checked on insert AND on edit
drop policy if exists "enrolled students review" on public.course_reviews;
create policy "enrolled students review" on public.course_reviews for insert to authenticated
  with check (student_id = auth.uid() and exists (select 1 from course_enrollments e where e.course_id = course_reviews.course_id and e.student_id = auth.uid() and e.status = 'active'));
drop policy if exists "edit own review" on public.course_reviews;
create policy "edit own review" on public.course_reviews for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and exists (select 1 from course_enrollments e where e.course_id = course_reviews.course_id and e.student_id = auth.uid() and e.status = 'active'));
drop policy if exists "delete own review" on public.course_reviews;
create policy "delete own review" on public.course_reviews for delete to authenticated using (student_id = auth.uid());
drop trigger if exists course_reviews_touch on public.course_reviews;
create trigger course_reviews_touch before update on public.course_reviews for each row execute function public.touch_updated_at();

create or replace view public.course_ratings as
  select course_id, round(avg(stars)::numeric, 1) as average, count(*)::int as ratings from public.course_reviews group by course_id;

create or replace function public.on_review() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform bolo_notify((select owner_id from courses where id = new.course_id), new.student_id, 'rating', 'learning',
                 'rated your course ' || new.stars || '★', jsonb_build_object('k', 'course', 'id', new.course_id),
                 'rv:' || new.course_id || ':' || new.student_id || ':' || extract(epoch from new.updated_at)::bigint);
  return new;
end $$;
drop trigger if exists review_notify on public.course_reviews;
create trigger review_notify after insert or update on public.course_reviews for each row execute function public.on_review();

-- ---------------------------------------------------------------- job photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "job photos public read" on storage.objects;
create policy "job photos public read" on storage.objects for select using (bucket_id = 'job-photos');
drop policy if exists "job photos own write" on storage.objects;
create policy "job photos own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "job photos own delete" on storage.objects;
create policy "job photos own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
