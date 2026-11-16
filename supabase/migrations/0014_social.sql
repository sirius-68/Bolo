-- Comments with replies and likes, message "delivered" marks, last seen, and a notice to applicants
-- when a job they applied for is edited.
-- Safe to run more than once.

set search_path = public, extensions;

-- ================================================================ comments: replies and likes
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
-- who the reply answers (the author of the comment that "Reply" was tapped on)
alter table public.comments add column if not exists reply_to uuid references auth.users(id) on delete set null;
create index if not exists comments_parent on public.comments(parent_id);

-- a reply hangs under a top comment of the same post (a reply to a reply joins the same thread, like Instagram)
create or replace function public.comment_parent() returns trigger language plpgsql security definer set search_path = public as $$
declare p comments;
begin
  if new.parent_id is null then
    new.reply_to := null;
    return new;
  end if;
  select * into p from comments where id = new.parent_id;
  if not found or p.post_id <> new.post_id then raise exception 'that comment is no longer there'; end if;
  if new.reply_to is null then new.reply_to := p.author_id; end if;
  if p.parent_id is not null then new.parent_id := p.parent_id; end if;
  return new;
end $$;
drop trigger if exists comments_thread on public.comments;
create trigger comments_thread before insert on public.comments for each row execute function public.comment_parent();

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
drop policy if exists "comment likes readable" on public.comment_likes;
create policy "comment likes readable" on public.comment_likes for select using (true);
drop policy if exists "own comment likes" on public.comment_likes;
create policy "own comment likes" on public.comment_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.comment_likes to anon, authenticated;
grant insert, delete on public.comment_likes to authenticated;

-- what the app reads: each comment with its likes, and whether I liked it
create or replace view public.comment_feed with (security_invoker = true) as
  select c.id, c.post_id, c.author_id, c.body, c.created_at, c.parent_id, c.reply_to,
         (select count(*)::int from public.comment_likes l where l.comment_id = c.id) as likes,
         exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = auth.uid()) as liked
  from public.comments c;
grant select on public.comment_feed to anon, authenticated;

-- the owner of a post can remove any comment under it
drop policy if exists "post owner removes comments" on public.comments;
create policy "post owner removes comments" on public.comments for delete to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- a comment tells the post's owner; a reply tells the person it answers (once, if they are the same person)
create or replace function public.on_comment() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from posts where id = new.post_id;
  if new.parent_id is not null and new.reply_to is not null then
    perform bolo_notify(new.reply_to, new.author_id, 'comment', 'social', 'replied to your comment: ' || left(new.body, 80),
                        jsonb_build_object('k', 'post', 'id', new.post_id, 'c', new.id), 'cmt:' || new.id);
  end if;
  if owner is distinct from new.reply_to then
    perform bolo_notify(owner, new.author_id, 'comment', 'social',
                        case when new.parent_id is null then 'commented on your post' else 'replied to a comment on your post' end,
                        jsonb_build_object('k', 'post', 'id', new.post_id, 'c', new.id), 'cmt:' || new.id);
  end if;
  return new;
end $$;

create or replace function public.on_comment_like() returns trigger language plpgsql security definer set search_path = public as $$
declare c comments;
begin
  perform bolo_hit('clike', 300, interval '1 hour');
  select * into c from comments where id = new.comment_id;
  perform bolo_notify(c.author_id, new.user_id, 'like', 'social', 'liked your comment: ' || left(c.body, 60),
                      jsonb_build_object('k', 'post', 'id', c.post_id, 'c', c.id), 'clike:' || new.comment_id || ':' || new.user_id);
  return new;
end $$;
drop trigger if exists comment_like_notify on public.comment_likes;
create trigger comment_like_notify after insert on public.comment_likes for each row execute function public.on_comment_like();

-- ================================================================ messages: delivered
-- "Delivered" = the message reached the other person's app (their phone loaded it), "Seen" = they opened the chat.
alter table public.conversation_members add column if not exists delivered_at timestamptz;

/** My app has everything up to now: mark every chat with newer messages as delivered to me. */
create or replace function public.mark_delivered() returns void language sql security definer set search_path = public as $$
  update conversation_members cm set delivered_at = now()
    from conversations c
   where cm.user_id = auth.uid() and c.id = cm.conversation_id
     and c.last_message_at is not null and (cm.delivered_at is null or cm.delivered_at < c.last_message_at);
$$;
revoke all on function public.mark_delivered() from public, anon;
grant execute on function public.mark_delivered() to authenticated;

-- ================================================================ last seen
-- Kept apart from profiles so nobody can read it directly: only seen_of() answers, and only for people you chat with.
create table if not exists public.presence (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

alter table public.profiles add column if not exists show_seen boolean not null default true;
grant update (show_seen) on public.profiles to authenticated;

/** The app calls this about once a minute while it is open. */
create or replace function public.seen_now() returns void language sql security definer set search_path = public as $$
  insert into presence (user_id, last_seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at where presence.last_seen_at < now() - interval '30 seconds';
$$;
revoke all on function public.seen_now() from public, anon;
grant execute on function public.seen_now() to authenticated;

/** When these people were last here. Only for people I share a chat with; nothing when either of us hides it
    (if you hide yours, you don't see other people's), and nothing across a block. */
create or replace function public.seen_of(p_users uuid[]) returns table (id uuid, last_seen_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.user_id, s.last_seen_at
    from presence s join profiles p on p.id = s.user_id
   where s.user_id = any(p_users) and s.user_id <> auth.uid()
     and p.show_seen and coalesce((select me.show_seen from profiles me where me.id = auth.uid()), false)
     and not is_blocked(auth.uid(), s.user_id)
     and exists (select 1 from conversation_members a join conversation_members b on b.conversation_id = a.conversation_id
                  where a.user_id = auth.uid() and b.user_id = s.user_id);
$$;
revoke all on function public.seen_of(uuid[]) from public, anon;
grant execute on function public.seen_of(uuid[]) to authenticated;

-- ================================================================ an edited job tells the people who applied
create or replace function public.on_post_edit() returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if new.kind <> 'request' or new.status <> 'open' then return new; end if;
  if new.title is not distinct from old.title and new.body is not distinct from old.body and new.budget_num is not distinct from old.budget_num
     and new.area is not distinct from old.area and (new.data->>'when') is not distinct from (old.data->>'when') then
    return new;
  end if;
  for a in select applicant_id from applications where post_id = new.id and stage not in ('declined', 'withdrawn') loop
    perform bolo_notify_upsert(a.applicant_id, new.author_id, 'stage', 'jobs',
      'changed “' || coalesce(nullif(new.title, ''), 'a job') || '”. Have another look at the details.',
      jsonb_build_object('k', 'job', 'id', new.id), 'edit:' || new.id);
  end loop;
  return new;
end $$;
drop trigger if exists posts_edit_notify on public.posts;
create trigger posts_edit_notify after update on public.posts for each row execute function public.on_post_edit();
