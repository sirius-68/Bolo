-- 0012: calls and chats that stay correct when phones misbehave.
--   • a connected call is kept alive by its phones (call_alive every 15 s); one whose phones went quiet for 90 s
--     is closed, instead of leaving both people "busy" for up to 3 hours
--   • calls left ringing (the caller's app closed mid-ring) are closed as missed whenever either person opens the app
--   • two people calling each other at the same moment get one call: the second one answers into the first
--   • two people writing to each other for the first time at the same moment get one chat, not two
set search_path = public, extensions;

alter table public.calls add column if not exists alive_at timestamptz;

/** Is this connected call still going? Phones that send the keep-alive are judged on it (90 s); older app versions,
    which don't, keep the old 3-hour rule so their calls are never cut short. */
create or replace function private.call_live(c public.calls) returns boolean
language sql stable as $$
  select c.status = 'accepted' and c.ended_at is null
     and case when c.alive_at is not null then c.alive_at > now() - interval '90 seconds'
              else coalesce(c.answered_at, c.created_at) > now() - interval '3 hours' end;
$$;

/** Close calls of these people that are over in fact but not on paper. */
create or replace function private.close_hanging(p_users uuid[]) returns void
language plpgsql security definer set search_path = public, private as $$
declare old public.calls;
begin
  for old in update calls set status = 'missed', ended_at = now()
             where status = 'ringing' and created_at < now() - interval '60 seconds'
               and (caller_id = any(p_users) or callee_id = any(p_users)) returning * loop
    perform log_call(old);
  end loop;
  for old in update calls c set status = 'ended', ended_at = coalesce(c.alive_at, c.answered_at, now())
             where c.status = 'accepted' and c.ended_at is null and not private.call_live(c)
               and (c.caller_id = any(p_users) or c.callee_id = any(p_users)) returning * loop
    perform log_call(old);
  end loop;
end $$;
revoke all on function private.close_hanging(uuid[]) from public, anon, authenticated;

/** A phone in a connected call says it is still there. */
create or replace function public.call_alive(p_call uuid) returns void
language sql security definer set search_path = public as $$
  update calls set alive_at = now() where id = p_call and status = 'accepted' and ended_at is null and auth.uid() in (caller_id, callee_id);
$$;
revoke all on function public.call_alive(uuid) from public, anon;
grant execute on function public.call_alive(uuid) to authenticated;

/** Called when the app opens its call list: tidies my own calls. */
create or replace function public.tidy_calls() returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if auth.uid() is null then return; end if;
  perform private.close_hanging(array[auth.uid()]);
end $$;
revoke all on function public.tidy_calls() from public, anon;
grant execute on function public.tidy_calls() to authenticated;

create or replace function public.start_call(p_conversation uuid, p_kind text default 'voice')
returns uuid language plpgsql security definer set search_path = public, private as $$
declare other uuid; cid uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_kind not in ('voice', 'video') then raise exception 'bad call type'; end if;
  if not exists (select 1 from conversations where id = p_conversation and kind = 'direct') or not is_member(p_conversation) then raise exception 'calls are for 1-to-1 chats'; end if;
  select user_id into other from conversation_members where conversation_id = p_conversation and user_id <> auth.uid() limit 1;
  if other is null then raise exception 'this person isn’t in the chat any more'; end if;
  if is_blocked(auth.uid(), other) then raise exception 'you can’t call this person'; end if;
  -- two starts at the same moment (taps, or both people calling) wait for each other here
  perform pg_advisory_xact_lock(hashtextextended('call:' || p_conversation::text, 0));
  perform private.close_hanging(array[auth.uid(), other]);
  -- already ringing in this chat: my own call (I tapped again), or theirs to me (we called each other): the same call
  select id into cid from calls where conversation_id = p_conversation and status = 'ringing' and auth.uid() in (caller_id, callee_id)
   order by (caller_id = auth.uid()) desc, created_at desc limit 1;
  if cid is not null then return cid; end if;
  perform bolo_hit('call', 20, interval '10 minutes');
  -- the person is on another call that is really still going: tell the caller they're busy
  if exists (select 1 from calls c where other in (c.caller_id, c.callee_id) and private.call_live(c)) then
    insert into calls (conversation_id, caller_id, callee_id, kind, status, ended_at) values (p_conversation, auth.uid(), other, p_kind, 'busy', now()) returning id into cid;
    return cid;
  end if;
  insert into calls (conversation_id, caller_id, callee_id, kind) values (p_conversation, auth.uid(), other, p_kind) returning id into cid;
  perform bolo_notify_upsert(other, auth.uid(), 'call', 'messages', 'is calling you (' || p_kind || ')', jsonb_build_object('k', 'chat', 'id', p_conversation), 'call:' || cid);
  return cid;
end $$;
revoke all on function public.start_call(uuid, text) from public, anon;
grant execute on function public.start_call(uuid, text) to authenticated;

-- answering marks the call alive from the first second
create or replace function public.answer_call(p_call uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.calls;
begin
  select * into c from calls where id = p_call for update;
  if not found or c.callee_id <> auth.uid() then raise exception 'call not found'; end if;
  if c.status <> 'ringing' then raise exception 'this call has ended'; end if;
  if p_accept then
    update calls set status = 'accepted', answered_at = now(), alive_at = now() where id = p_call;
    update notifications set read_at = now() where recipient_id = c.callee_id and event_key = 'call:' || c.id;
  else
    update calls set status = 'declined', ended_at = now() where id = p_call returning * into c;
    perform log_call(c);
  end if;
end $$;
revoke all on function public.answer_call(uuid, boolean) from public, anon;
grant execute on function public.answer_call(uuid, boolean) to authenticated;

-- ================================================================ one chat per pair
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
  -- both people opening the chat at the same moment wait for each other here, so only one chat is made
  perform pg_advisory_xact_lock(hashtextextended('dm:' || least(auth.uid(), p_other)::text || greatest(auth.uid(), p_other)::text || coalesce(p_business::text, ''), 0));
  select c.id into cid from conversations c
   where c.kind = 'direct' and c.business_id is not distinct from p_business
     and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid())
     and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
   order by c.created_at
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
