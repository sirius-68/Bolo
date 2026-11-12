-- bolo · 0006 calls (voice and video, through Agora)
-- A call belongs to a 1-to-1 chat. The database decides who may call whom and keeps the call log;
-- the media goes through Agora, and the agora-token server function only gives a pass to the two people
-- in a call that is ringing or in progress. Safe to re-run.
--
-- Rules:
--   • only a member of a direct chat can call the other member; blocked people can't call
--   • only the person called can accept or decline; either person can hang up
--   • the call log ("Voice call · 3:05", "Missed video call") is written into the chat by the server
--   • at most 20 calls started per 10 minutes per person

set search_path = public, extensions;

create table if not exists public.calls (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id       uuid not null references auth.users(id) on delete cascade,
  callee_id       uuid not null references auth.users(id) on delete cascade,
  kind            text not null default 'voice' check (kind in ('voice', 'video')),
  status          text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended', 'busy')),
  created_at      timestamptz not null default now(),
  answered_at     timestamptz,
  ended_at        timestamptz,
  check (caller_id <> callee_id)
);
create index if not exists calls_callee on public.calls(callee_id, created_at desc);
create index if not exists calls_caller on public.calls(caller_id, created_at desc);
alter table public.calls enable row level security;
revoke insert, update, delete on public.calls from anon, authenticated;
drop policy if exists "parties see call" on public.calls;
create policy "parties see call" on public.calls for select to authenticated using (auth.uid() in (caller_id, callee_id));

/** Write the call into the chat's history. */
create or replace function public.log_call(c public.calls) returns void
language plpgsql security definer set search_path = public as $$
declare secs int; label text;
begin
  secs := case when c.answered_at is not null and c.ended_at is not null then greatest(0, extract(epoch from c.ended_at - c.answered_at)::int) end;
  label := case
    when secs is not null then initcap(c.kind) || ' call · ' || (secs / 60) || ':' || lpad((secs % 60)::text, 2, '0')
    when c.status = 'declined' then initcap(c.kind) || ' call declined'
    else 'Missed ' || c.kind || ' call' end;
  insert into messages (conversation_id, sender_id, kind, body, data)
  values (c.conversation_id, null, 'sys', label, jsonb_build_object('call', c.id, 'missed', secs is null, 'by', c.caller_id, 'kind', c.kind));
  if secs is null then
    perform bolo_notify_upsert(c.callee_id, c.caller_id, 'missed', 'messages', 'Missed ' || c.kind || ' call', jsonb_build_object('k', 'chat', 'id', c.conversation_id), 'call:' || c.id);
  end if;
end $$;
revoke all on function public.log_call(public.calls) from public, anon, authenticated;

/** Start a call in a 1-to-1 chat. Returns the call id. */
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
  perform bolo_hit('call', 20, interval '10 minutes');
  -- calls left ringing (app closed, no network) become missed
  for old in update calls set status = 'missed', ended_at = now()
             where status = 'ringing' and created_at < now() - interval '60 seconds' and auth.uid() in (caller_id, callee_id) returning * loop
    perform log_call(old);
  end loop;
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

/** The person called accepts or declines. */
create or replace function public.answer_call(p_call uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.calls;
begin
  select * into c from calls where id = p_call for update;
  if not found or c.callee_id <> auth.uid() then raise exception 'call not found'; end if;
  if c.status <> 'ringing' then raise exception 'this call has ended'; end if;
  if p_accept then
    update calls set status = 'accepted', answered_at = now() where id = p_call;
    update notifications set read_at = now() where recipient_id = c.callee_id and event_key = 'call:' || c.id;
  else
    update calls set status = 'declined', ended_at = now() where id = p_call returning * into c;
    perform log_call(c);
  end if;
end $$;
revoke all on function public.answer_call(uuid, boolean) from public, anon;
grant execute on function public.answer_call(uuid, boolean) to authenticated;

/** Either person hangs up (or the caller gives up while it rings). */
create or replace function public.end_call(p_call uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.calls;
begin
  select * into c from calls where id = p_call for update;
  if not found or auth.uid() not in (c.caller_id, c.callee_id) then raise exception 'call not found'; end if;
  if c.status in ('ended', 'declined', 'missed', 'busy') then return; end if;
  update calls set status = case when c.status = 'accepted' then 'ended' else 'missed' end, ended_at = now() where id = p_call returning * into c;
  perform log_call(c);
end $$;
revoke all on function public.end_call(uuid) from public, anon;
grant execute on function public.end_call(uuid) to authenticated;

select private.realtime_add('calls');
