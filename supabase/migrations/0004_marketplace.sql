-- bolo · 0004 marketplace
-- Everything people do with each other: posts and jobs, offers and applications, chat, bookings with live
-- location, reviews, follows, likes and saves, plus career listings (courses, opportunities, mentorships, experts).
-- Runs after 0003. Safe to re-run.
--
-- Rules the database enforces here:
--   • chats: only members read or write a conversation; blocked people cannot start or write to a direct chat
--   • offers in chat are answered by the other person only, once; accepting creates the booking on the server
--   • bookings: only the two people in it see it; each step can only be taken by the right person in the right
--     order (the worker sets off, arrives and finishes; the client confirms or reports a problem)
--   • live location: only the worker writes it, only while on the way; only the two people read it
--   • offers/applications: one per person per job, never on your own job; the poster moves the stage, the
--     applicant can only withdraw
--   • reviews: only after a confirmed booking, by one of the two people, about the other, once
--   • notifications for all of this are created by triggers, never by the app

set search_path = public, extensions;

-- ================================================================ helpers
/** Same as bolo_notify, but a newer event with the same key replaces the old one (e.g. new messages in one chat). */
create or replace function public.bolo_notify_upsert(p_recipient uuid, p_actor uuid, p_type text, p_category text, p_body text, p_target jsonb, p_key text, p_business uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  if exists (select 1 from notification_prefs where user_id = p_recipient and category = p_category and not enabled) then return; end if;
  insert into notifications (recipient_id, actor_id, type, category, body, target, event_key, business_id)
  values (p_recipient, p_actor, p_type, p_category, p_body, p_target, p_key, p_business)
  on conflict (recipient_id, event_key) do update
    set actor_id = excluded.actor_id, body = excluded.body, target = excluded.target, read_at = null, created_at = now();
end $$;
revoke all on function public.bolo_notify_upsert(uuid, uuid, text, text, text, jsonb, text, uuid) from public, anon, authenticated;

-- notifications that belong to a business page go to that page's inbox in the app
alter table public.notifications add column if not exists business_id uuid references public.businesses(id) on delete cascade;

/** Display name for notifications: the business name when acting as a business, otherwise the person's name. */
create or replace function public.display_name(p_user uuid, p_business uuid default null) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(name, '') from businesses where id = p_business), (select nullif(name, '') from profiles where id = p_user), 'Someone');
$$;
revoke all on function public.display_name(uuid, uuid) from public, anon, authenticated;

/** Add a table to realtime once. */
create or replace function private.realtime_add(p_table text) returns void language plpgsql as $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = p_table) then
    execute format('alter publication supabase_realtime add table public.%I', p_table);
  end if;
end $$;

-- ================================================================ posts: work posts, jobs, vacancies, availability
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check check (kind in ('request', 'image', 'photo', 'art', 'text', 'avail', 'work', 'job', 'availability', 'update'));
alter table public.posts add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.posts add column if not exists cat text;
alter table public.posts add column if not exists area text not null default '';
alter table public.posts add column if not exists status text not null default 'open';
alter table public.posts add column if not exists urgent boolean not null default false;
alter table public.posts add column if not exists budget_num integer not null default 0;
alter table public.posts add column if not exists data jsonb not null default '{}';
alter table public.posts add column if not exists location geography(Point, 4326);
alter table public.posts add column if not exists updated_at timestamptz not null default now();
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('open', 'booked', 'closed'));
alter table public.posts drop constraint if exists posts_text_len;
alter table public.posts add constraint posts_text_len check (char_length(coalesce(title, '')) <= 140 and char_length(coalesce(body, '')) <= 4000 and pg_column_size(data) <= 20000);
alter table public.posts alter column id set default ('p' || replace(gen_random_uuid()::text, '-', ''));
create index if not exists posts_feed on public.posts(kind, created_at desc);
create index if not exists posts_author on public.posts(author_id, created_at desc);
create index if not exists posts_location on public.posts using gist (location);
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

-- a job's place is shown rounded to ~500 m
create or replace function public.snap_post_location() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.location is not null then new.location := st_snaptogrid(new.location::geometry, 0.005)::geography; end if;
  return new;
end $$;
drop trigger if exists posts_snap on public.posts;
create trigger posts_snap before insert or update of location on public.posts for each row execute function public.snap_post_location();

drop policy if exists "own posts" on public.posts;
create policy "own posts" on public.posts for all to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and (business_id is null or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())));

-- ================================================================ likes, saves, follows
create table if not exists public.post_likes (
  post_id    text not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "likes readable" on public.post_likes;
create policy "likes readable" on public.post_likes for select using (true);
drop policy if exists "own likes" on public.post_likes;
create policy "own likes" on public.post_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.saves (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('post', 'job', 'person', 'opp', 'course', 'mentor', 'company', 'expert')),
  target_id  text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);
alter table public.saves enable row level security;
drop policy if exists "own saves" on public.saves;
create policy "own saves" on public.saves for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee on public.follows(followee_id);
alter table public.follows enable row level security;
drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select using (true);
drop policy if exists "follow as yourself" on public.follows;
create policy "follow as yourself" on public.follows for insert to authenticated with check (follower_id = auth.uid() and not public.is_blocked(follower_id, followee_id));
drop policy if exists "unfollow" on public.follows;
create policy "unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

create or replace function public.on_follow() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform bolo_hit('follow', 100, interval '1 hour');
  perform bolo_notify(new.followee_id, new.follower_id, 'follow', 'social', 'started following you', jsonb_build_object('k', 'profile', 'id', new.follower_id), 'follow:' || new.follower_id);
  return new;
end $$;
drop trigger if exists follow_notify on public.follows;
create trigger follow_notify after insert on public.follows for each row execute function public.on_follow();

create or replace function public.on_like() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform bolo_notify((select author_id from posts where id = new.post_id), new.user_id, 'like', 'social', 'liked your post', jsonb_build_object('k', 'post', 'id', new.post_id), 'like:' || new.post_id || ':' || new.user_id);
  return new;
end $$;
drop trigger if exists like_notify on public.post_likes;
create trigger like_notify after insert on public.post_likes for each row execute function public.on_like();

-- ================================================================ offers and applications
create table if not exists public.applications (
  id           uuid primary key default gen_random_uuid(),
  post_id      text not null references public.posts(id) on delete cascade,
  applicant_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  price        text not null default '',
  when_text    text not null default '',
  msg          text not null default '' check (char_length(msg) <= 1500),
  cv           jsonb,
  stage        text not null default 'applied' check (stage in ('applied', 'short', 'interview', 'offer', 'hired', 'accepted', 'declined', 'withdrawn')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (post_id, applicant_id)
);
create index if not exists applications_applicant on public.applications(applicant_id, created_at desc);
alter table public.applications enable row level security;
revoke insert, update on public.applications from anon, authenticated;
grant insert (post_id, price, when_text, msg, cv) on public.applications to authenticated;
grant update (stage, price, when_text, msg, cv) on public.applications to authenticated;
drop policy if exists "applicant or poster reads" on public.applications;
create policy "applicant or poster reads" on public.applications for select to authenticated
  using (applicant_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
drop policy if exists "apply as yourself" on public.applications;
create policy "apply as yourself" on public.applications for insert to authenticated
  with check (applicant_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.author_id <> auth.uid() and p.status = 'open' and not public.is_blocked(auth.uid(), p.author_id)));
drop policy if exists "applicant or poster updates" on public.applications;
create policy "applicant or poster updates" on public.applications for update to authenticated
  using (applicant_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

-- the applicant may edit their offer or withdraw; only the poster moves it through the stages
create or replace function public.guard_application() returns trigger language plpgsql set search_path = public as $$
declare is_poster boolean;
begin
  if current_user <> 'authenticated' then return new; end if;   -- server functions (accept_application) may move it
  if new.post_id <> old.post_id or new.applicant_id <> old.applicant_id then raise exception 'cannot move an application'; end if;
  select exists (select 1 from posts p where p.id = new.post_id and p.author_id = auth.uid()) into is_poster;
  if is_poster then
    if new.price is distinct from old.price or new.when_text is distinct from old.when_text or new.msg is distinct from old.msg or new.cv is distinct from old.cv then
      raise exception 'only the applicant can change their offer';
    end if;
    if new.stage in ('withdrawn', 'accepted') and new.stage is distinct from old.stage then raise exception 'not allowed'; end if;
  else
    if new.stage is distinct from old.stage and new.stage <> 'withdrawn' then raise exception 'only the poster can move an application'; end if;
    if old.stage in ('accepted', 'hired') then raise exception 'this offer was already accepted'; end if;
  end if;
  return new;
end $$;
drop trigger if exists application_guard on public.applications;
create trigger application_guard before update on public.applications for each row execute function public.guard_application();

create or replace function public.on_application() returns trigger language plpgsql security definer set search_path = public as $$
declare p posts; who text;
begin
  select * into p from posts where id = new.post_id;
  if tg_op = 'INSERT' then
    perform bolo_hit('apply', 40, interval '1 hour');
    perform bolo_notify(p.author_id, new.applicant_id, 'newoffer', 'applicants',
      case when p.business_id is not null then 'applied for “' || coalesce(p.title, 'your job') || '”' else 'sent an offer on “' || coalesce(p.title, 'your job') || '”' end,
      jsonb_build_object('k', 'job', 'id', p.id), 'offer:' || p.id || ':' || new.applicant_id);
    update notifications set business_id = p.business_id where event_key = 'offer:' || p.id || ':' || new.applicant_id and recipient_id = p.author_id;
  elsif new.stage is distinct from old.stage and new.stage in ('short', 'interview', 'offer', 'hired', 'declined') then
    who := display_name(p.author_id, p.business_id);
    perform bolo_notify(new.applicant_id, p.author_id, 'stage', 'jobs',
      case new.stage
        when 'short' then 'shortlisted you for “' || coalesce(p.title, 'a job') || '”'
        when 'interview' then 'invited you to an interview for “' || coalesce(p.title, 'a job') || '”'
        when 'offer' then 'sent you a job offer for “' || coalesce(p.title, 'a job') || '”'
        when 'hired' then 'hired you for “' || coalesce(p.title, 'a job') || '”'
        else 'chose another candidate for “' || coalesce(p.title, 'a job') || '”' end,
      jsonb_build_object('k', 'job', 'id', p.id), 'stage:' || new.id || ':' || new.stage);
  end if;
  return new;
end $$;
drop trigger if exists application_notify on public.applications;
create trigger application_notify after insert or update on public.applications for each row execute function public.on_application();

create or replace view public.post_stats as
  select p.id as post_id,
         (select count(*)::int from public.post_likes l where l.post_id = p.id) as likes,
         (select count(*)::int from public.comments c where c.post_id = p.id) as comments,
         (select count(*)::int from public.applications a where a.post_id = p.id and a.stage not in ('withdrawn')) as offers
  from public.posts p;

-- ================================================================ chat
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'direct' check (kind in ('direct', 'group')),
  title           text not null default '' check (char_length(title) <= 80),
  about           text not null default '' check (char_length(about) <= 1000),
  color           text not null default '',
  rules           jsonb not null default '[]',
  business_id     uuid references public.businesses(id) on delete set null,  -- the business side of a direct chat
  topic           text not null default '',                                   -- the job this chat is about
  created_by      uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member' check (role in ('owner', 'member')),
  last_read_at    timestamptz not null default now(),
  muted           boolean not null default false,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user on public.conversation_members(user_id);
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid default auth.uid() references auth.users(id) on delete set null,
  kind            text not null default 'text' check (kind in ('text', 'offer', 'img', 'file', 'loc', 'contact', 'sys', 'deleted')),
  body            text not null default '' check (char_length(body) <= 4000),
  data            jsonb not null default '{}' check (pg_column_size(data) <= 8000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation on public.messages(conversation_id, created_at desc);

create or replace function public.is_member(p_conversation uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation and user_id = auth.uid());
$$;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
revoke insert, update, delete on public.conversations from anon, authenticated;
revoke insert, update on public.conversation_members from anon, authenticated;
grant update (last_read_at, muted) on public.conversation_members to authenticated;
revoke insert, update, delete on public.messages from anon, authenticated;
grant insert (conversation_id, kind, body, data) on public.messages to authenticated;
grant update (kind, body, data) on public.messages to authenticated;

drop policy if exists "members see conversation" on public.conversations;
create policy "members see conversation" on public.conversations for select to authenticated using (public.is_member(id));
drop policy if exists "members see members" on public.conversation_members;
create policy "members see members" on public.conversation_members for select to authenticated using (public.is_member(conversation_id));
drop policy if exists "update own membership" on public.conversation_members;
create policy "update own membership" on public.conversation_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "leave conversation" on public.conversation_members;
create policy "leave conversation" on public.conversation_members for delete to authenticated using (user_id = auth.uid());
drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages for select to authenticated using (public.is_member(conversation_id));
drop policy if exists "members write messages" on public.messages;
create policy "members write messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and kind in ('text', 'offer', 'img', 'file', 'loc', 'contact') and public.is_member(conversation_id)
    and not exists (select 1 from public.conversations c join public.conversation_members m on m.conversation_id = c.id
                    where c.id = conversation_id and c.kind = 'direct' and m.user_id <> auth.uid() and public.is_blocked(auth.uid(), m.user_id)));
drop policy if exists "sender deletes message" on public.messages;
create policy "sender deletes message" on public.messages for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- the sender can only turn their message into "deleted"; offers are answered through answer_offer()
create or replace function public.guard_message() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user <> 'authenticated' then return new; end if;   -- server functions (answer_offer) may update offers
  if new.conversation_id <> old.conversation_id or new.sender_id is distinct from old.sender_id or new.created_at <> old.created_at then raise exception 'not allowed'; end if;
  if new.kind <> 'deleted' then raise exception 'messages can only be deleted'; end if;
  new.body := ''; new.data := '{}';
  return new;
end $$;
drop trigger if exists message_guard on public.messages;
create trigger message_guard before update on public.messages for each row execute function public.guard_message();

create or replace function public.limit_messages() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind <> 'sys' then perform bolo_hit('message', 60, interval '1 minute'); end if;
  if new.kind = 'offer' then new.data := new.data - 'state' - 'booking'; end if;   -- answered only by answer_offer()
  return new;
end $$;
drop trigger if exists messages_rate on public.messages;
create trigger messages_rate before insert on public.messages for each row execute function public.limit_messages();

create or replace function public.on_message() returns trigger language plpgsql security definer set search_path = public as $$
declare c conversations; m record; who text; preview text;
begin
  select * into c from conversations where id = new.conversation_id;
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  update conversation_members set last_read_at = new.created_at where conversation_id = new.conversation_id and user_id = new.sender_id;
  if new.kind = 'sys' or new.sender_id is null then return new; end if;
  preview := case new.kind when 'img' then '📷 Photo' when 'file' then '📄 ' || coalesce(new.data->>'name', 'File') when 'loc' then '📍 Location'
                           when 'offer' then '💼 Quote · ' || coalesce(new.data->>'job', '') else left(new.body, 90) end;
  for m in select cm.user_id, cm.muted from conversation_members cm where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id loop
    if m.muted then continue; end if;
    -- in a business chat, the business owner's notification goes to the business inbox
    perform bolo_notify_upsert(m.user_id, new.sender_id, 'message', 'messages',
      case when c.kind = 'group' then coalesce(nullif(c.title, ''), 'Group') || ': ' || preview else preview end,
      jsonb_build_object('k', 'chat', 'id', new.conversation_id), 'msg:' || new.conversation_id,
      case when c.business_id is not null and exists (select 1 from businesses b where b.id = c.business_id and b.owner_id = m.user_id) then c.business_id end);
  end loop;
  return new;
end $$;
drop trigger if exists message_notify on public.messages;
create trigger message_notify after insert on public.messages for each row execute function public.on_message();

/** Open (or create) the 1-to-1 chat with another person. p_business: the business on either side, if any. */
create or replace function public.start_direct(p_other uuid, p_business uuid default null, p_topic text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_other is null or p_other = auth.uid() then raise exception 'pick someone else'; end if;
  if not exists (select 1 from profiles where id = p_other and deleted_at is null) then raise exception 'this account no longer exists'; end if;
  if is_blocked(auth.uid(), p_other) then raise exception 'you can’t message this person'; end if;
  if p_business is not null and not exists (select 1 from businesses b where b.id = p_business and b.owner_id in (auth.uid(), p_other)) then
    raise exception 'unknown business';
  end if;
  select c.id into cid from conversations c
   where c.kind = 'direct' and c.business_id is not distinct from p_business
     and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid())
     and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
   limit 1;
  if cid is null then
    perform bolo_hit('new_chat', 40, interval '1 hour');
    insert into conversations (kind, business_id, topic, created_by) values ('direct', p_business, coalesce(p_topic, ''), auth.uid()) returning id into cid;
    insert into conversation_members (conversation_id, user_id, role) values (cid, auth.uid(), 'owner'), (cid, p_other, 'member');
  elsif p_topic is not null and p_topic <> '' then
    update conversations set topic = p_topic where id = cid;
  end if;
  return cid;
end $$;
revoke all on function public.start_direct(uuid, uuid, text) from public, anon;
grant execute on function public.start_direct(uuid, uuid, text) to authenticated;

/** Create a group chat. */
create or replace function public.create_group(p_title text, p_about text, p_color text, p_rules jsonb, p_members uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if char_length(coalesce(p_title, '')) not between 1 and 80 then raise exception 'give the group a name'; end if;
  perform bolo_hit('new_group', 10, interval '1 hour');
  insert into conversations (kind, title, about, color, rules, created_by) values ('group', p_title, coalesce(p_about, ''), coalesce(p_color, ''), coalesce(p_rules, '[]'), auth.uid()) returning id into cid;
  insert into conversation_members (conversation_id, user_id, role) values (cid, auth.uid(), 'owner');
  insert into conversation_members (conversation_id, user_id)
    select cid, u from unnest(coalesce(p_members, '{}')) u
     where u <> auth.uid() and exists (select 1 from profiles where id = u and deleted_at is null) and not is_blocked(auth.uid(), u)
    on conflict do nothing;
  insert into messages (conversation_id, sender_id, kind, body) values (cid, null, 'sys', 'Group created');
  return cid;
end $$;
revoke all on function public.create_group(text, text, text, jsonb, uuid[]) from public, anon;
grant execute on function public.create_group(text, text, text, jsonb, uuid[]) to authenticated;

/** Group owner adds people. */
create or replace function public.add_group_members(p_conversation uuid, p_members uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from conversation_members where conversation_id = p_conversation and user_id = auth.uid() and role = 'owner') then raise exception 'only the group owner can add people'; end if;
  insert into conversation_members (conversation_id, user_id)
    select p_conversation, u from unnest(p_members) u where exists (select 1 from profiles where id = u and deleted_at is null) and not is_blocked(auth.uid(), u)
    on conflict do nothing;
end $$;
revoke all on function public.add_group_members(uuid, uuid[]) from public, anon;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;

/** Group owner deletes the group for everyone. */
create or replace function public.delete_group(p_conversation uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from conversations c join conversation_members m on m.conversation_id = c.id
                 where c.id = p_conversation and c.kind = 'group' and m.user_id = auth.uid() and m.role = 'owner') then
    raise exception 'only the group owner can delete it';
  end if;
  delete from conversations where id = p_conversation;
end $$;
revoke all on function public.delete_group(uuid) from public, anon;
grant execute on function public.delete_group(uuid) to authenticated;

-- ================================================================ bookings
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references auth.users(id) on delete cascade,
  client_id       uuid not null references auth.users(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete set null,   -- when the client hired as a business
  post_id         text references public.posts(id) on delete set null,
  application_id  uuid references public.applications(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  title           text not null default 'Job' check (char_length(title) <= 140),
  when_text       text not null default '',
  price           text not null default '',
  amount          integer not null default 0 check (amount >= 0),
  area            text not null default '',
  dest            geography(Point, 4326),        -- where the job is (the client's place), for directions and arrival time
  state           text not null default 'booked' check (state in ('booked', 'onway', 'working', 'done', 'confirmed', 'cancelled')),
  eta_min         integer,
  log             jsonb not null default '{}',   -- when each step happened
  cancelled_by    uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (worker_id <> client_id)
);
create index if not exists bookings_worker on public.bookings(worker_id, created_at desc);
create index if not exists bookings_client on public.bookings(client_id, created_at desc);
alter table public.bookings enable row level security;
revoke insert, update, delete on public.bookings from anon, authenticated;
drop policy if exists "parties see booking" on public.bookings;
create policy "parties see booking" on public.bookings for select to authenticated using (auth.uid() in (worker_id, client_id));
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();

/** Creates a booking (server only: from an accepted offer or quote). Returns its id. */
create or replace function public.make_booking(p_worker uuid, p_client uuid, p_business uuid, p_title text, p_when text, p_price text, p_area text,
                                               p_post text, p_application uuid, p_conversation uuid, p_dest geography)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare bid uuid; d geography;
begin
  d := coalesce(p_dest, (select location from profiles_private where id = p_client));
  insert into bookings (worker_id, client_id, business_id, title, when_text, price, amount, area, post_id, application_id, conversation_id, dest, log)
  values (p_worker, p_client, p_business, left(coalesce(nullif(p_title, ''), 'Job'), 140), coalesce(p_when, ''), coalesce(p_price, ''),
          least(coalesce(nullif(replace((regexp_match(coalesce(p_price, ''), '[0-9][0-9,]*'))[1], ',', ''), '')::bigint, 0), 2000000000)::int,
          coalesce(p_area, ''), p_post, p_application, p_conversation, d, jsonb_build_object('booked', now()))
  returning id into bid;
  if p_conversation is not null then
    insert into messages (conversation_id, sender_id, kind, body, data)
    values (p_conversation, null, 'sys', 'Job booked · ' || left(coalesce(p_title, 'Job'), 80) || coalesce(' · ' || nullif(p_when, ''), '') || coalesce(' · ' || nullif(p_price, ''), ''), jsonb_build_object('booking', bid));
    update conversations set topic = left(coalesce(p_title, 'Job'), 80) || coalesce(' · ' || nullif(p_when, ''), '') where id = p_conversation;
  end if;
  perform bolo_notify(p_worker, p_client, 'booked', 'jobs', 'booked you for “' || coalesce(p_title, 'a job') || '”' || coalesce(' · ' || nullif(p_when, ''), ''),
                      jsonb_build_object('k', 'track', 'id', bid), 'bk:' || bid || ':booked');
  return bid;
end $$;
revoke all on function public.make_booking(uuid, uuid, uuid, text, text, text, text, text, uuid, uuid, geography) from public, anon, authenticated;

/** The poster accepts an offer on their job: books that person. Returns the booking id. */
create or replace function public.accept_application(p_application uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a applications; p posts; cid uuid; bid uuid;
begin
  select * into a from applications where id = p_application for update;
  if not found then raise exception 'offer not found'; end if;
  select * into p from posts where id = a.post_id for update;
  if p.author_id <> auth.uid() then raise exception 'only the person who posted the job can accept'; end if;
  if a.stage in ('withdrawn', 'declined', 'accepted', 'hired') then raise exception 'this offer can’t be accepted any more'; end if;
  update applications set stage = case when p.business_id is null then 'accepted' else 'hired' end where id = a.id;
  if p.business_id is null then update posts set status = 'booked' where id = p.id; end if;
  cid := start_direct(a.applicant_id, p.business_id, p.title);
  bid := make_booking(a.applicant_id, p.author_id, p.business_id, p.title, nullif(a.when_text, ''), nullif(a.price, ''), p.area, p.id, a.id, cid, p.location);
  return bid;
end $$;
revoke all on function public.accept_application(uuid) from public, anon;
grant execute on function public.accept_application(uuid) to authenticated;

/** Answer a quote or hire request sent in chat. Accepting books the job. Returns the booking id (or null when declined). */
create or replace function public.answer_offer(p_message uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare m messages; c conversations; w uuid; cl uuid; biz uuid; bid uuid; dest geography;
begin
  select * into m from messages where id = p_message for update;
  if not found or m.kind <> 'offer' then raise exception 'offer not found'; end if;
  if not is_member(m.conversation_id) or m.sender_id = auth.uid() then raise exception 'only the other person can answer this'; end if;
  if m.data ? 'state' then raise exception 'this offer was already answered'; end if;
  select * into c from conversations where id = m.conversation_id;
  if not p_accept then
    update messages set data = data || '{"state": "dec"}' where id = m.id;
    return null;
  end if;
  -- data.worker = 'sender' (a quote from the worker) or 'recipient' (a hire request from the client)
  if coalesce(m.data->>'worker', 'sender') = 'sender' then w := m.sender_id; cl := auth.uid(); else w := auth.uid(); cl := m.sender_id; end if;
  biz := case when c.business_id is not null and exists (select 1 from businesses b where b.id = c.business_id and b.owner_id = cl) then c.business_id end;
  if (m.data ? 'lng') and (m.data ? 'lat') and cl = m.sender_id then
    dest := st_setsrid(st_makepoint((m.data->>'lng')::float8, (m.data->>'lat')::float8), 4326)::geography;
  end if;
  bid := make_booking(w, cl, biz, m.data->>'job', m.data->>'when', m.data->>'price', coalesce(m.data->>'area', ''), null, null, m.conversation_id, dest);
  update messages set data = data || jsonb_build_object('state', 'acc', 'booking', bid) where id = m.id;
  return bid;
end $$;
revoke all on function public.answer_offer(uuid, boolean) from public, anon;
grant execute on function public.answer_offer(uuid, boolean) to authenticated;

/** Move a booking to its next step. Who may do what:
    worker: booked → onway → working → done, and cancel before starting work
    client: done → confirmed, done → working ("something's wrong"), and cancel before work starts */
create or replace function public.booking_step(p_booking uuid, p_state text, p_eta integer default null)
returns void language plpgsql security definer set search_path = public as $$
declare b bookings; is_worker boolean; ok boolean := false; who text; t text;
begin
  select * into b from bookings where id = p_booking for update;
  if not found or auth.uid() not in (b.worker_id, b.client_id) then raise exception 'booking not found'; end if;
  is_worker := auth.uid() = b.worker_id;
  ok := case
    when is_worker and b.state = 'booked' and p_state = 'onway' then true
    when is_worker and b.state = 'onway' and p_state = 'working' then true
    when is_worker and b.state = 'working' and p_state = 'done' then true
    when not is_worker and b.state = 'done' and p_state in ('confirmed', 'working') then true
    when p_state = 'cancelled' and b.state in ('booked', 'onway') then true
    else false end;
  if not ok then raise exception 'this step isn’t possible now'; end if;
  update bookings set state = p_state, eta_min = case when p_state = 'onway' then p_eta else null end,
                      log = log || jsonb_build_object(p_state, now()), cancelled_by = case when p_state = 'cancelled' then auth.uid() end
   where id = b.id;
  if p_state <> 'onway' then delete from booking_locations where booking_id = b.id; end if;
  t := coalesce(b.title, 'the job');
  who := display_name(auth.uid(), case when is_worker then null else b.business_id end);
  perform bolo_notify(case when is_worker then b.client_id else b.worker_id end, auth.uid(),
    case p_state when 'onway' then 'onway' when 'working' then case when is_worker then 'arrived' else 'issue' end when 'done' then 'jobdone' when 'confirmed' then 'confirmed' else 'cancelled' end,
    'jobs',
    case p_state
      when 'onway' then 'is on the way for “' || t || '”' || coalesce(' · ' || p_eta || ' min', '')
      when 'working' then case when is_worker then 'has arrived and started “' || t || '”' else 'says something isn’t right with “' || t || '”' end
      when 'done' then 'marked “' || t || '” as done. Please confirm.'
      when 'confirmed' then 'confirmed “' || t || '” is done'
      else 'cancelled “' || t || '”' end,
    jsonb_build_object('k', 'track', 'id', b.id), 'bk:' || b.id || ':' || p_state || ':' || extract(epoch from now())::bigint);
  if p_state = 'cancelled' and b.post_id is not null then
    update posts set status = 'open' where id = b.post_id and status = 'booked';
  end if;
end $$;
revoke all on function public.booking_step(uuid, text, integer) from public, anon;
grant execute on function public.booking_step(uuid, text, integer) to authenticated;

-- ================================================================ live location (worker on the way)
create table if not exists public.booking_locations (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  heading    real,
  accuracy   real,
  eta_min    integer check (eta_min is null or eta_min between 0 and 1440),
  updated_at timestamptz not null default now()
);
alter table public.booking_locations enable row level security;
drop policy if exists "parties see location" on public.booking_locations;
create policy "parties see location" on public.booking_locations for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.worker_id, b.client_id)));
drop policy if exists "worker shares location on the way" on public.booking_locations;
create policy "worker shares location on the way" on public.booking_locations for insert to authenticated
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.worker_id = auth.uid() and b.state = 'onway'));
drop policy if exists "worker updates location on the way" on public.booking_locations;
create policy "worker updates location on the way" on public.booking_locations for update to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.worker_id = auth.uid() and b.state = 'onway'))
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.worker_id = auth.uid() and b.state = 'onway'));

create or replace function public.touch_location() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists booking_locations_touch on public.booking_locations;
create trigger booking_locations_touch before insert or update on public.booking_locations for each row execute function public.touch_location();

-- ================================================================ reviews of people
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete set null,
  reviewer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  tags        text[] not null default '{}',
  body        text not null default '' check (char_length(body) <= 800),
  what        text not null default '',
  created_at  timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);
create index if not exists reviews_reviewee on public.reviews(reviewee_id, created_at desc);
alter table public.reviews enable row level security;
revoke update on public.reviews from anon, authenticated;
drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews for select using (true);
drop policy if exists "review after a confirmed job" on public.reviews;
create policy "review after a confirmed job" on public.reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and exists (
    select 1 from public.bookings b where b.id = booking_id and b.state = 'confirmed'
       and ((b.worker_id = auth.uid() and b.client_id = reviewee_id) or (b.client_id = auth.uid() and b.worker_id = reviewee_id))));
drop policy if exists "delete own review" on public.reviews;
create policy "delete own review" on public.reviews for delete to authenticated using (reviewer_id = auth.uid());

create or replace function public.on_person_review() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform bolo_notify(new.reviewee_id, new.reviewer_id, 'review', 'social', 'left you a ' || new.stars || '★ review', jsonb_build_object('k', 'profile', 'id', new.reviewee_id), 'review:' || new.id);
  return new;
end $$;
drop trigger if exists person_review_notify on public.reviews;
create trigger person_review_notify after insert on public.reviews for each row execute function public.on_person_review();

-- public numbers on a profile, always computed (never stored)
create or replace view public.profile_stats as
  select p.id,
         (select count(*)::int from public.follows f where f.followee_id = p.id) as followers,
         (select count(*)::int from public.follows f where f.follower_id = p.id) as following,
         (select count(*)::int from public.bookings b where b.worker_id = p.id and b.state = 'confirmed') as jobs_done,
         (select count(*)::int from public.bookings b where b.client_id = p.id and b.state = 'confirmed') as hires,
         (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.reviewee_id = p.id) as rating,
         (select count(*)::int from public.reviews r where r.reviewee_id = p.id) as reviews
  from public.profiles p where p.deleted_at is null;

-- ================================================================ career: course listings (links to the school's own site)
create table if not exists public.course_listings (
  id          text primary key default ('cl' || replace(gen_random_uuid()::text, '-', '')),
  owner_id    uuid references auth.users(id) on delete cascade,        -- null = picked by bolo
  business_id uuid references public.businesses(id) on delete cascade,
  url         text not null check (url ~ '^https://' and char_length(url) <= 500),
  title       text not null check (char_length(title) between 3 and 120),
  data        jsonb not null default '{}' check (pg_column_size(data) <= 8000),
  views       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.course_listings enable row level security;
revoke update on public.course_listings from anon, authenticated;
grant update (url, title, data, business_id) on public.course_listings to authenticated;
drop policy if exists "listings readable" on public.course_listings;
create policy "listings readable" on public.course_listings for select using (true);
drop policy if exists "own listings" on public.course_listings;
create policy "own listings" on public.course_listings for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (business_id is null or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())));
drop policy if exists "admins manage listings" on public.course_listings;
create policy "admins manage listings" on public.course_listings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop trigger if exists course_listings_touch on public.course_listings;
create trigger course_listings_touch before update on public.course_listings for each row execute function public.touch_updated_at();

create or replace function public.count_listing_view(p_id text) returns void language sql security definer set search_path = public as $$
  update course_listings set views = views + 1 where id = p_id;
$$;
revoke all on function public.count_listing_view(text) from public, anon;
grant execute on function public.count_listing_view(text) to authenticated;

create table if not exists public.listing_reviews (
  listing_id text not null references public.course_listings(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  body       text not null default '' check (char_length(body) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
alter table public.listing_reviews enable row level security;
drop policy if exists "listing reviews readable" on public.listing_reviews;
create policy "listing reviews readable" on public.listing_reviews for select using (true);
drop policy if exists "rate a course you took" on public.listing_reviews;
create policy "rate a course you took" on public.listing_reviews for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not exists (select 1 from public.course_listings l where l.id = listing_id and l.owner_id = auth.uid()));
drop trigger if exists listing_reviews_touch on public.listing_reviews;
create trigger listing_reviews_touch before update on public.listing_reviews for each row execute function public.touch_updated_at();

-- ================================================================ career: opportunities (internships, programs) by businesses
create table if not exists public.opportunities (
  id          text primary key default ('o' || replace(gen_random_uuid()::text, '-', '')),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind        text not null default 'Internship',
  title       text not null check (char_length(title) between 3 and 120),
  seats       integer not null default 10 check (seats between 1 and 1000),
  data        jsonb not null default '{}' check (pg_column_size(data) <= 10000),
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now()
);
alter table public.opportunities enable row level security;
drop policy if exists "opportunities readable" on public.opportunities;
create policy "opportunities readable" on public.opportunities for select using (true);
drop policy if exists "own opportunities" on public.opportunities;
create policy "own opportunities" on public.opportunities for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

create table if not exists public.opportunity_applications (
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending', 'acc', 'dec')),
  created_at     timestamptz not null default now(),
  primary key (opportunity_id, user_id)
);
alter table public.opportunity_applications enable row level security;
revoke update on public.opportunity_applications from anon, authenticated;
grant update (status) on public.opportunity_applications to authenticated;
drop policy if exists "applicant or owner reads" on public.opportunity_applications;
create policy "applicant or owner reads" on public.opportunity_applications for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id = auth.uid()));
drop policy if exists "apply to opportunity" on public.opportunity_applications;
create policy "apply to opportunity" on public.opportunity_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id <> auth.uid() and o.status = 'open'));
drop policy if exists "owner answers" on public.opportunity_applications;
create policy "owner answers" on public.opportunity_applications for update to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id = auth.uid()));
drop policy if exists "withdraw application" on public.opportunity_applications;
create policy "withdraw application" on public.opportunity_applications for delete to authenticated using (user_id = auth.uid());

create or replace function public.on_opp_application() returns trigger language plpgsql security definer set search_path = public as $$
declare o opportunities;
begin
  select * into o from opportunities where id = new.opportunity_id;
  if tg_op = 'INSERT' then
    perform bolo_notify(o.owner_id, new.user_id, 'enrol', 'applicants', 'applied for “' || o.title || '”', jsonb_build_object('k', 'opp', 'id', o.id), 'oppapp:' || o.id || ':' || new.user_id);
    update notifications set business_id = o.business_id where event_key = 'oppapp:' || o.id || ':' || new.user_id and recipient_id = o.owner_id;
  elsif new.status is distinct from old.status and new.status in ('acc', 'dec') then
    perform bolo_notify(new.user_id, o.owner_id, 'accept', 'jobs',
      case when new.status = 'acc' then 'accepted you for “' || o.title || '”' else 'chose other applicants for “' || o.title || '”' end,
      jsonb_build_object('k', 'opp', 'id', o.id), 'oppst:' || o.id || ':' || new.user_id || ':' || new.status);
  end if;
  return new;
end $$;
drop trigger if exists opp_application_notify on public.opportunity_applications;
create trigger opp_application_notify after insert or update on public.opportunity_applications for each row execute function public.on_opp_application();

-- ================================================================ career: mentorships (1-to-1 or group, with a group chat)
create table if not exists public.mentorships (
  id              text primary key default ('m' || replace(gen_random_uuid()::text, '-', '')),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  business_id     uuid references public.businesses(id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 120),
  seats           integer not null default 10 check (seats between 1 and 500),
  data            jsonb not null default '{}' check (pg_column_size(data) <= 10000),
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at      timestamptz not null default now()
);
alter table public.mentorships enable row level security;
revoke insert, update on public.mentorships from anon, authenticated;
grant insert (id, business_id, title, seats, data) on public.mentorships to authenticated;
grant update (title, seats, data) on public.mentorships to authenticated;
drop policy if exists "mentorships readable" on public.mentorships;
create policy "mentorships readable" on public.mentorships for select using (true);
drop policy if exists "own mentorships" on public.mentorships;
create policy "own mentorships" on public.mentorships for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and (business_id is null or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())));

-- every mentorship gets its own group chat; the mentor owns it
create or replace function public.on_mentorship_created() returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into conversations (kind, title, about, color, rules, created_by)
  values ('group', left(new.title, 80), coalesce(new.data->>'desc', ''), coalesce(new.data->>'color', ''), coalesce(new.data->'rules', '[]'), new.owner_id)
  returning id into cid;
  insert into conversation_members (conversation_id, user_id, role) values (cid, new.owner_id, 'owner');
  insert into messages (conversation_id, sender_id, kind, body) values (cid, null, 'sys', 'Mentorship group created');
  update mentorships set conversation_id = cid where id = new.id;
  return new;
end $$;
drop trigger if exists mentorship_created on public.mentorships;
create trigger mentorship_created after insert on public.mentorships for each row execute function public.on_mentorship_created();

create table if not exists public.mentorship_members (
  mentorship_id text not null references public.mentorships(id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status        text not null default 'req' check (status in ('req', 'yes', 'dec')),
  created_at    timestamptz not null default now(),
  primary key (mentorship_id, user_id)
);
alter table public.mentorship_members enable row level security;
revoke update on public.mentorship_members from anon, authenticated;
grant update (status) on public.mentorship_members to authenticated;
drop policy if exists "member or mentor reads" on public.mentorship_members;
create policy "member or mentor reads" on public.mentorship_members for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.mentorships m where m.id = mentorship_id and m.owner_id = auth.uid()));
drop policy if exists "ask to join" on public.mentorship_members;
create policy "ask to join" on public.mentorship_members for insert to authenticated
  with check (user_id = auth.uid() and status = 'req' and exists (select 1 from public.mentorships m where m.id = mentorship_id and m.owner_id <> auth.uid()));
drop policy if exists "mentor answers" on public.mentorship_members;
create policy "mentor answers" on public.mentorship_members for update to authenticated
  using (exists (select 1 from public.mentorships m where m.id = mentorship_id and m.owner_id = auth.uid()));
drop policy if exists "leave mentorship" on public.mentorship_members;
create policy "leave mentorship" on public.mentorship_members for delete to authenticated using (user_id = auth.uid());

create or replace function public.on_mentorship_member() returns trigger language plpgsql security definer set search_path = public as $$
declare m mentorships;
begin
  select * into m from mentorships where id = new.mentorship_id;
  if tg_op = 'INSERT' then
    perform bolo_notify(m.owner_id, new.user_id, 'mentor', 'mentorship', 'asked to join “' || m.title || '”', jsonb_build_object('k', 'mentor', 'id', m.id), 'mreq:' || m.id || ':' || new.user_id);
  elsif new.status is distinct from old.status then
    if new.status = 'yes' and m.conversation_id is not null then
      insert into conversation_members (conversation_id, user_id) values (m.conversation_id, new.user_id) on conflict do nothing;
    end if;
    if new.status in ('yes', 'dec') then
      perform bolo_notify(new.user_id, m.owner_id, 'mentor', 'mentorship',
        case when new.status = 'yes' then 'accepted you into “' || m.title || '”' else 'couldn’t take you into “' || m.title || '” this time' end,
        jsonb_build_object('k', 'mentor', 'id', m.id), 'mst:' || m.id || ':' || new.user_id || ':' || new.status);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists mentorship_member_notify on public.mentorship_members;
create trigger mentorship_member_notify after insert or update on public.mentorship_members for each row execute function public.on_mentorship_member();

create or replace function public.on_mentorship_leave() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from conversation_members cm using mentorships m where m.id = old.mentorship_id and cm.conversation_id = m.conversation_id and cm.user_id = old.user_id;
  return old;
end $$;
drop trigger if exists mentorship_leave on public.mentorship_members;
create trigger mentorship_leave after delete on public.mentorship_members for each row execute function public.on_mentorship_leave();

-- ================================================================ career experts (checked by bolo before they're listed)
create table if not exists public.experts (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  status      text not null default 'submitted' check (status in ('submitted', 'review', 'interview', 'approved', 'declined')),
  headline    text not null default '' check (char_length(headline) <= 140),
  data        jsonb not null default '{}' check (pg_column_size(data) <= 20000),   -- application: areas, fields, formats, price, languages, quiz…
  note        text,                                                                  -- bolo's note to the applicant
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.experts enable row level security;
revoke insert, update on public.experts from anon, authenticated;
grant insert (headline, data) on public.experts to authenticated;
grant update (headline, data) on public.experts to authenticated;
drop policy if exists "approved experts are public" on public.experts;
create policy "approved experts are public" on public.experts for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "apply as expert" on public.experts;
create policy "apply as expert" on public.experts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "edit own expert profile" on public.experts;
create policy "edit own expert profile" on public.experts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop trigger if exists experts_touch on public.experts;
create trigger experts_touch before update on public.experts for each row execute function public.touch_updated_at();

/** Admin: move an expert application on (review, interview, approved, declined). */
create or replace function public.admin_review_expert(p_user uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  if p_status not in ('review', 'interview', 'approved', 'declined') then raise exception 'bad status'; end if;
  update experts set status = p_status, note = p_note, reviewed_by = auth.uid() where user_id = p_user;
  if not found then raise exception 'no such application'; end if;
  perform bolo_audit('expert.' || p_status, 'experts', p_user::text, jsonb_build_object('note', p_note));
  perform bolo_notify(p_user, auth.uid(), 'expert', 'account',
    case p_status when 'approved' then 'You’re now a bolo Career Expert. Your profile is live.'
                  when 'declined' then 'Your expert application wasn’t approved this time' || coalesce(': ' || p_note, '')
                  when 'interview' then 'Your expert application moved to the interview step'
                  else 'Your expert application is being reviewed' end,
    jsonb_build_object('k', 'experts'), 'expert:' || p_user || ':' || p_status);
end $$;
revoke all on function public.admin_review_expert(uuid, text, text) from public, anon;
grant execute on function public.admin_review_expert(uuid, text, text) to authenticated;

-- ================================================================ realtime
select private.realtime_add('messages');
select private.realtime_add('conversation_members');
select private.realtime_add('bookings');
select private.realtime_add('booking_locations');
select private.realtime_add('notifications');
select private.realtime_add('applications');

-- ================================================================ export: include the new data
create or replace function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'exported_at',        now(),
    'profile',            (select to_jsonb(p) - 'location_approx' from profiles p where p.id = auth.uid()),
    'private',            (select to_jsonb(p) - 'location' from profiles_private p where p.id = auth.uid()),
    'businesses',         coalesce((select jsonb_agg(to_jsonb(b) || jsonb_build_object('documents', (select to_jsonb(d) from business_private d where d.business_id = b.id))) from businesses b where b.owner_id = auth.uid()), '[]'),
    'posts',              coalesce((select jsonb_agg(to_jsonb(x) - 'location') from posts x where x.author_id = auth.uid()), '[]'),
    'comments',           coalesce((select jsonb_agg(to_jsonb(x)) from comments x where x.author_id = auth.uid()), '[]'),
    'applications',       coalesce((select jsonb_agg(to_jsonb(x)) from applications x where x.applicant_id = auth.uid()), '[]'),
    'messages_sent',      coalesce((select jsonb_agg(to_jsonb(x)) from messages x where x.sender_id = auth.uid()), '[]'),
    'bookings',           coalesce((select jsonb_agg(to_jsonb(x) - 'dest') from bookings x where auth.uid() in (x.worker_id, x.client_id)), '[]'),
    'reviews_written',    coalesce((select jsonb_agg(to_jsonb(x)) from reviews x where x.reviewer_id = auth.uid()), '[]'),
    'follows',            coalesce((select jsonb_agg(to_jsonb(x)) from follows x where x.follower_id = auth.uid()), '[]'),
    'saves',              coalesce((select jsonb_agg(to_jsonb(x)) from saves x where x.user_id = auth.uid()), '[]'),
    'likes',              coalesce((select jsonb_agg(to_jsonb(x)) from post_likes x where x.user_id = auth.uid()), '[]'),
    'course_listings',    coalesce((select jsonb_agg(to_jsonb(x)) from course_listings x where x.owner_id = auth.uid()), '[]'),
    'opportunities',      coalesce((select jsonb_agg(to_jsonb(x)) from opportunities x where x.owner_id = auth.uid()), '[]'),
    'mentorships',        coalesce((select jsonb_agg(to_jsonb(x)) from mentorships x where x.owner_id = auth.uid()), '[]'),
    'expert_application', (select to_jsonb(x) from experts x where x.user_id = auth.uid()),
    'notifications',      coalesce((select jsonb_agg(to_jsonb(x)) from notifications x where x.recipient_id = auth.uid()), '[]'),
    'notification_prefs', coalesce((select jsonb_agg(to_jsonb(x)) from notification_prefs x where x.user_id = auth.uid()), '[]'),
    'blocks',             coalesce((select jsonb_agg(to_jsonb(x)) from blocks x where x.blocker_id = auth.uid()), '[]'),
    'reports',            coalesce((select jsonb_agg(to_jsonb(x)) from reports x where x.reporter_id = auth.uid()), '[]'),
    'verifications',      coalesce((select jsonb_agg(to_jsonb(x) - 'files') from verifications x where x.user_id = auth.uid()), '[]')
  );
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- chat photos and files: private bucket, readable by the people in that chat (path: <conversation id>/<file>)
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat', 'chat', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
drop policy if exists "chat files members upload" on storage.objects;
create policy "chat files members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "chat files members read" on storage.objects;
create policy "chat files members read" on storage.objects for select to authenticated
  using (bucket_id = 'chat' and public.is_member(((storage.foldername(name))[1])::uuid));

-- post photos: public, each person writes only in their own folder (job-photos exists; add update for replacing)
drop policy if exists "job photos own update" on storage.objects;
create policy "job photos own update" on storage.objects for update to authenticated
  using (bucket_id = 'job-photos' and (storage.foldername(name))[1] = auth.uid()::text);
