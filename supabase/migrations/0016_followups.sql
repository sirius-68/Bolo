-- Follow-ups to 0014 and 0015.
-- 1. A job that is already booked keeps its pay: the description and photos can still be corrected.
-- 2. People who blocked each other cannot like each other's comments (they already could not comment).
-- 3. Announcements can go to accounts that have not verified their ID yet.
-- Safe to run more than once.

set search_path = public, extensions;

-- ================================================================ a booked job keeps its pay
create or replace function public.keep_booked_pay() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.kind = 'request' and old.status = 'booked' and new.status = 'booked'
     and (new.budget_num is distinct from old.budget_num or (new.data->>'budget') is distinct from (old.data->>'budget')) then
    raise exception 'This job is already booked: its pay can no longer be changed. You can still correct the description and photos.';
  end if;
  return new;
end $$;
drop trigger if exists posts_keep_pay on public.posts;
create trigger posts_keep_pay before update on public.posts for each row execute function public.keep_booked_pay();

-- ================================================================ no likes across a block
drop policy if exists "own comment likes" on public.comment_likes;
create policy "own comment likes" on public.comment_likes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.is_blocked(auth.uid(), (select c.author_id from public.comments c where c.id = comment_id)));

-- ================================================================ announcements: also to people who are not verified yet
/** An announcement to many accounts at once. Returns how many received it. People who switched "News" off are skipped. */
create or replace function public.admin_announce(p_text text, p_audience text default 'all', p_city text default null)
returns int language plpgsql security definer set search_path = public, private as $$
declare n int; t text := trim(coalesce(p_text, '')); v_city text := nullif(trim(coalesce(p_city, '')), '');
        k text := 'announce:' || replace(gen_random_uuid()::text, '-', '');
begin
  perform private.need_admin();
  perform private.need_senior();
  if char_length(t) not between 10 and 500 then raise exception 'write between 10 and 500 characters'; end if;
  if p_audience not in ('all', 'workers', 'hirers', 'businesses', 'verified', 'unverified') then raise exception 'unknown audience'; end if;
  perform bolo_hit('announce', 5, interval '1 day');
  if p_audience = 'businesses' then
    insert into notifications (recipient_id, actor_id, type, category, body, target, event_key, business_id)
    select distinct on (b.owner_id) b.owner_id, null, 'account', 'news', t, jsonb_build_object('k', 'notifs'), k, b.id
      from businesses b join profiles p on p.id = b.owner_id
     where p.deleted_at is null and p.suspended_at is null and (v_city is null or b.city ilike v_city)
       and not exists (select 1 from notification_prefs np where np.user_id = b.owner_id and np.category = 'news' and not np.enabled)
     order by b.owner_id, b.created_at
    on conflict (recipient_id, event_key) do nothing;
  else
    insert into notifications (recipient_id, actor_id, type, category, body, target, event_key)
    select p.id, null, 'account', 'news', t, jsonb_build_object('k', 'notifs'), k
      from profiles p
     where p.deleted_at is null and p.suspended_at is null and (v_city is null or p.city ilike v_city)
       and case p_audience when 'workers' then cardinality(p.skills) > 0 when 'hirers' then cardinality(p.skills) = 0 when 'verified' then p.verified when 'unverified' then not p.verified else true end
       and not exists (select 1 from notification_prefs np where np.user_id = p.id and np.category = 'news' and not np.enabled)
    on conflict (recipient_id, event_key) do nothing;
  end if;
  get diagnostics n = row_count;
  perform bolo_audit('announce.send', 'notifications', k, jsonb_build_object('note', left(t, 200), 'audience', p_audience, 'city', v_city, 'sent', n));
  return n;
end $$;
revoke all on function public.admin_announce(text, text, text) from public, anon;
grant execute on function public.admin_announce(text, text, text) to authenticated;
