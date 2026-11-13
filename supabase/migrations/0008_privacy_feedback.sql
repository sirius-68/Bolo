-- 1. "Show my profile in search" is now real: a hidden profile is left out of the people lists and the map.
--    It can still be opened by people who already deal with it (a chat, a booking, an offer), so those keep working.
-- 2. Feedback: messages from people to the bolo team (Settings → Help). Only bolo admins can read them.

set search_path = public, extensions;

alter table public.profiles add column if not exists visible boolean not null default true;
grant update (visible) on public.profiles to authenticated;

-- same columns as before, plus "visible" at the end; a hidden profile shares no position
create or replace view public.profile_cards with (security_invoker = true) as
  select p.id, p.name, p.avatar_url, p.city, p.bio, p.role, p.biz_only, p.intents, p.skills, p.skill_list, p.level, p.years,
         p.work_status, p.hire_status, p.area, p.experience, p.education, p.languages, p.services, p.verified, p.availability, p.created_at,
         case when p.visible then st_x(p.location_approx::geometry) end as lng, case when p.visible then st_y(p.location_approx::geometry) end as lat,
         coalesce(s.followers, 0) as followers, coalesce(s.following, 0) as following, coalesce(s.jobs_done, 0) as jobs_done,
         coalesce(s.hires, 0) as hires, s.rating, coalesce(s.reviews, 0) as reviews,
         p.visible
  from public.profiles p left join public.profile_stats s on s.id = p.id
  where p.deleted_at is null;
grant select on public.profile_cards to anon, authenticated;

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic       text not null default 'other' check (topic in ('problem', 'idea', 'account', 'safety', 'other')),
  body        text not null check (char_length(body) between 5 and 2000),
  app_version text check (app_version is null or char_length(app_version) <= 40),
  status      text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at  timestamptz not null default now()
);
create index if not exists feedback_open on public.feedback(status, created_at desc);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;
grant insert (topic, body, app_version) on public.feedback to authenticated;
drop policy if exists "send feedback" on public.feedback;
create policy "send feedback" on public.feedback for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "read own feedback, admins read all" on public.feedback;
create policy "read own feedback, admins read all" on public.feedback for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- no flooding: 5 messages an hour
create or replace function public.limit_feedback() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform bolo_hit('feedback', 5, interval '1 hour');
  return new;
end $$;
drop trigger if exists feedback_rate on public.feedback;
create trigger feedback_rate before insert on public.feedback for each row execute function public.limit_feedback();
