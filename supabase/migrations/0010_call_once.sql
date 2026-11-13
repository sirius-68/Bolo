-- 0010: one call at a time.
-- Tapping the call button several times (or a slow network) used to start a new call per tap, leaving a row of
-- "Missed call" lines in the chat. Now a second start while the first is still ringing gives back the same call.
set search_path = public, extensions;

create or replace function public.start_call(p_conversation uuid, p_kind text default 'voice')
returns uuid language plpgsql security definer set search_path = public as $$
declare other uuid; cid uuid; old public.calls;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_kind not in ('voice', 'video') then raise exception 'bad call type'; end if;
  if not exists (select 1 from conversations where id = p_conversation and kind = 'direct') or not is_member(p_conversation) then raise exception 'calls are for 1-to-1 chats'; end if;
  select user_id into other from conversation_members where conversation_id = p_conversation and user_id <> auth.uid() limit 1;
  if other is null then raise exception 'this person isn’t in the chat any more'; end if;
  if is_blocked(auth.uid(), other) then raise exception 'you can’t call this person'; end if;
  -- two starts at the same moment wait for each other here, so they can't both create a call
  perform pg_advisory_xact_lock(hashtextextended('call:' || p_conversation::text, 0));
  -- calls left ringing (app closed, no network) become missed
  for old in update calls set status = 'missed', ended_at = now()
             where status = 'ringing' and created_at < now() - interval '60 seconds' and auth.uid() in (caller_id, callee_id) returning * loop
    perform log_call(old);
  end loop;
  -- already ringing in this chat: it is the same call (the caller tapped again)
  select id into cid from calls where conversation_id = p_conversation and status = 'ringing' and caller_id = auth.uid() order by created_at desc limit 1;
  if cid is not null then return cid; end if;
  perform bolo_hit('call', 20, interval '10 minutes');
  -- the person is already on another call: tell the caller they're busy
  if exists (select 1 from calls where other in (caller_id, callee_id) and status = 'accepted' and ended_at is null and answered_at > now() - interval '3 hours') then
    insert into calls (conversation_id, caller_id, callee_id, kind, status, ended_at) values (p_conversation, auth.uid(), other, p_kind, 'busy', now()) returning id into cid;
    return cid;
  end if;
  insert into calls (conversation_id, caller_id, callee_id, kind) values (p_conversation, auth.uid(), other, p_kind) returning id into cid;
  perform bolo_notify_upsert(other, auth.uid(), 'call', 'messages', 'is calling you (' || p_kind || ')', jsonb_build_object('k', 'chat', 'id', p_conversation), 'call:' || cid);
  return cid;
end $$;
revoke all on function public.start_call(uuid, text) from public, anon;
grant execute on function public.start_call(uuid, text) to authenticated;

-- ================================================================ call notifications
-- A call that was not answered left one notification per call, so a few tries filled the bell with the same line.
-- Now there is one "missed call" notification per chat (it counts up), a call you declined yourself is not
-- reported back to you as missed, and the "is calling you" line goes away when the call is over.
create or replace function public.log_call(c public.calls) returns void
language plpgsql security definer set search_path = public as $$
declare secs int; label text; n int;
begin
  secs := case when c.answered_at is not null and c.ended_at is not null then greatest(0, extract(epoch from c.ended_at - c.answered_at)::int) end;
  label := case
    when secs is not null then initcap(c.kind) || ' call · ' || (secs / 60) || ':' || lpad((secs % 60)::text, 2, '0')
    when c.status = 'declined' then initcap(c.kind) || ' call declined'
    else 'Missed ' || c.kind || ' call' end;
  insert into messages (conversation_id, sender_id, kind, body, data)
  values (c.conversation_id, null, 'sys', label, jsonb_build_object('call', c.id, 'missed', secs is null, 'by', c.caller_id, 'kind', c.kind));
  -- the ringing line is over either way
  delete from notifications where recipient_id = c.callee_id and event_key = 'call:' || c.id;
  if secs is null and c.status <> 'declined' then
    select coalesce((target->>'n')::int, 1) into n from notifications
      where recipient_id = c.callee_id and event_key = 'missed:' || c.conversation_id and read_at is null;
    n := coalesce(n, 0) + 1;
    perform bolo_notify_upsert(c.callee_id, c.caller_id, 'missed', 'messages',
      case when n > 1 then n || ' missed calls' else 'Missed ' || c.kind || ' call' end,
      jsonb_build_object('k', 'chat', 'id', c.conversation_id, 'n', n), 'missed:' || c.conversation_id);
  end if;
end $$;
revoke all on function public.log_call(public.calls) from public, anon, authenticated;

-- tidy what is already there: one line per chat instead of one per call
do $$
declare r record;
begin
  for r in
    select recipient_id, target->>'id' as conv, count(*) filter (where read_at is null) as unread, count(*) as total,
           (array_agg(id order by created_at desc))[1] as keep
    from notifications
    where type in ('missed', 'call') and event_key like 'call:%' and created_at < now() - interval '2 minutes' and target->>'id' is not null
    group by recipient_id, target->>'id'
  loop
    delete from notifications where recipient_id = r.recipient_id and type in ('missed', 'call') and event_key like 'call:%'
      and created_at < now() - interval '2 minutes' and target->>'id' = r.conv and id <> r.keep;
    delete from notifications where recipient_id = r.recipient_id and event_key = 'missed:' || r.conv and id <> r.keep;
    update notifications set type = 'missed', event_key = 'missed:' || r.conv,
      body = case when r.unread > 1 then r.unread || ' missed calls' else 'Missed call' end,
      target = jsonb_build_object('k', 'chat', 'id', r.conv::uuid, 'n', greatest(r.unread, 1))
    where id = r.keep;
  end loop;
end $$;
