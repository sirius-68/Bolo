-- Calls: who can call, answer and hang up; the call log in the chat.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.start_direct('b0000000-0000-0000-0000-000000000002') $$, 'Ana and Ben have a chat');
select lives_ok($$ select public.start_call(public.start_direct('b0000000-0000-0000-0000-000000000002'), 'video') $$, 'Ana video-calls Ben');
select is(public.start_call(public.start_direct('b0000000-0000-0000-0000-000000000002'), 'video'), (select id from public.calls limit 1), 'tapping call again while it rings is the same call');
select is((select count(*)::int from public.calls), 1, 'repeated taps do not start more calls');
select throws_ok($$ select public.answer_call((select id from public.calls limit 1), true) $$, null, null, 'Ana cannot answer her own call');
select throws_ok($$ insert into public.calls (conversation_id, caller_id, callee_id) values ((select conversation_id from public.calls limit 1), auth.uid(), 'b0000000-0000-0000-0000-000000000002') $$, null, null, 'calls are only started through the server');

set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select is((select count(*)::int from public.calls), 0, 'Carl cannot see their call');
select throws_ok($$ select public.start_call((select id from public.conversations limit 1)) $$, null, null, 'Carl cannot call into a chat he is not in');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select status from public.calls limit 1), 'ringing', 'Ben sees it ringing');
select is((select count(*)::int from public.notifications where type = 'call'), 1, 'Ben is notified of the call');
select lives_ok($$ select public.answer_call((select id from public.calls limit 1), true) $$, 'Ben accepts');
select throws_ok($$ select public.answer_call((select id from public.calls limit 1), false) $$, null, null, 'a call is answered once');
select lives_ok($$ select public.end_call((select id from public.calls limit 1)) $$, 'Ben hangs up');
select is((select status from public.calls limit 1), 'ended', 'the call has ended');
select ok((select count(*) from public.messages where kind = 'sys' and body like 'Video call · %') = 1, 'the chat shows the call and its length');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.end_call((select id from public.calls limit 1)) $$, 'hanging up twice is harmless');

-- missed calls: one notification per chat that counts up; a declined call is not reported as missed
select public.start_call(public.start_direct('b0000000-0000-0000-0000-000000000002'), 'voice');
select public.end_call((select id from public.calls where status = 'ringing' limit 1));
select public.start_call(public.start_direct('b0000000-0000-0000-0000-000000000002'), 'voice');
select public.end_call((select id from public.calls where status = 'ringing' limit 1));
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.notifications where type in ('missed', 'call')), 1, 'two missed calls are one notification');
select is((select body from public.notifications where type = 'missed'), '2 missed calls', 'and it counts them');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select public.start_call(public.start_direct('b0000000-0000-0000-0000-000000000002'), 'voice');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ select public.answer_call((select id from public.calls where status = 'ringing' limit 1), false) $$, 'Ben declines a call');
select is((select body from public.notifications where type in ('missed', 'call')), '2 missed calls', 'a call Ben declined himself is not added as missed, and the ringing line is gone');

select * from finish();
rollback;
