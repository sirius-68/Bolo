-- 0017: ringing on the lock screen, and room for long course descriptions.
--   • A phone that rings while bolo is closed shows "Decline" on the lock screen. Nobody is signed in at that
--     moment, so the phone gets a one-time pass for that one call (sent only in the push to the person being
--     called). With it the phone can decline the call and ask whether it is still ringing — nothing else.
--   • Internship, program, mentorship and course descriptions have no limit in the app; the server keeps a
--     generous ceiling (about 60 pages of text) so a mistake or abuse can't fill the database.
-- Safe to run more than once.
set search_path = public, extensions;

-- ================================================================ one-time pass for a ringing call
create table if not exists private.call_rings (
  call_id    uuid primary key references public.calls(id) on delete cascade,
  token      text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
revoke all on private.call_rings from public, anon, authenticated;

/** The pass for this call (made on first use). Only the push function asks for it. */
create or replace function public.call_ring_token(p_call uuid) returns text
language plpgsql security definer set search_path = public, private as $$
declare t text;
begin
  if not exists (select 1 from calls where id = p_call and status = 'ringing') then return null; end if;
  insert into private.call_rings (call_id) values (p_call) on conflict (call_id) do nothing;
  select token into t from private.call_rings where call_id = p_call;
  return t;
end $$;
revoke all on function public.call_ring_token(uuid) from public, anon, authenticated;
grant execute on function public.call_ring_token(uuid) to service_role;

/** Where a call stands, for the phone that holds its pass: 'ringing', 'accepted', 'declined', 'missed', 'ended'…
    or 'gone' when the call or the pass is not right. */
create or replace function public.call_state_token(p_call uuid, p_token text) returns text
language sql stable security definer set search_path = public, private as $$
  select coalesce((select c.status from calls c join private.call_rings r on r.call_id = c.id
                    where c.id = p_call and p_token is not null and r.token = p_token), 'gone');
$$;
revoke all on function public.call_state_token(uuid, text) from public;
grant execute on function public.call_state_token(uuid, text) to anon, authenticated;

/** "Decline" tapped on the lock screen. Does what answer_call(…, false) does, for the phone that holds the pass.
    Returns where the call stands afterwards. */
create or replace function public.decline_call_token(p_call uuid, p_token text) returns text
language plpgsql security definer set search_path = public, private as $$
declare c public.calls;
begin
  if p_token is null or not exists (select 1 from private.call_rings where call_id = p_call and token = p_token) then return 'gone'; end if;
  select * into c from calls where id = p_call for update;
  if not found then return 'gone'; end if;
  if c.status <> 'ringing' then return c.status; end if;
  update calls set status = 'declined', ended_at = now() where id = p_call returning * into c;
  perform log_call(c);
  return c.status;
end $$;
revoke all on function public.decline_call_token(uuid, text) from public;
grant execute on function public.decline_call_token(uuid, text) to anon, authenticated;

-- ================================================================ long descriptions
alter table public.opportunities drop constraint if exists opportunities_data_check;
alter table public.opportunities add constraint opportunities_data_check check (pg_column_size(data) <= 200000);
alter table public.mentorships drop constraint if exists mentorships_data_check;
alter table public.mentorships add constraint mentorships_data_check check (pg_column_size(data) <= 200000);
alter table public.course_listings drop constraint if exists course_listings_data_check;
alter table public.course_listings add constraint course_listings_data_check check (pg_column_size(data) <= 200000);
