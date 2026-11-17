-- Ringing on the lock screen: the one-time pass that lets a phone decline a call without being signed in,
-- and the room for long descriptions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select public.start_call(public.start_direct('b0000000-0000-0000-0000-000000000002'), 'voice');
select throws_ok($$ select public.call_ring_token((select id from public.calls limit 1)) $$, null, null, 'the caller cannot get the pass');
select throws_ok($$ select * from private.call_rings $$, null, null, 'passes cannot be read');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ select public.call_ring_token((select id from public.calls limit 1)) $$, null, null, 'nor can the person being called: it only travels in the push');

reset role;
-- kept in settings so the next steps (as other roles) can use them
select set_config('t.call', id::text, true), length(set_config('t.token', public.call_ring_token(id), true)) from public.calls;
select ok(length(current_setting('t.token')) >= 40, 'the push function gets a long random pass');
select is(public.call_ring_token(current_setting('t.call')::uuid), current_setting('t.token'), 'the same pass every time for the same call');

-- a phone with nobody signed in
set local role anon;
set local request.jwt.claims = '{}';
select is(public.call_state_token(current_setting('t.call')::uuid, current_setting('t.token')), 'ringing', 'the phone can see the call is still ringing');
select is(public.call_state_token(current_setting('t.call')::uuid, 'wrong'), 'gone', 'a wrong pass learns nothing');
select is(public.call_state_token(current_setting('t.call')::uuid, null), 'gone', 'no pass learns nothing');
select is(public.decline_call_token(current_setting('t.call')::uuid, 'wrong'), 'gone', 'a wrong pass cannot decline');
select is(public.decline_call_token(gen_random_uuid(), current_setting('t.token')), 'gone', 'a pass is for its own call only');
select is(public.decline_call_token(current_setting('t.call')::uuid, current_setting('t.token')), 'declined', 'Decline on the lock screen declines the call');
select is(public.decline_call_token(current_setting('t.call')::uuid, current_setting('t.token')), 'declined', 'tapping twice is harmless');
select is(public.call_state_token(current_setting('t.call')::uuid, current_setting('t.token')), 'declined', 'and the phone sees it is over');

reset role;
select is((select status from public.calls limit 1), 'declined', 'the call is declined');
select is((select count(*)::int from public.messages where kind = 'sys' and body = 'Voice call declined'), 1, 'the chat shows it once');
select is(public.call_ring_token(current_setting('t.call')::uuid), null, 'no pass is handed out for a call that is over');

-- long descriptions
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ insert into public.course_listings (owner_id, url, title, data) values (auth.uid(), 'https://example.org/course', 'A long course', jsonb_build_object('desc', repeat('A course with a lot to say. ', 2000))) $$, 'a course can carry a description of many pages');

select * from finish();
rollback;
