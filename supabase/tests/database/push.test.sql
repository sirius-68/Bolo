-- Push notifications: phones register themselves; only the server sets where pushes go.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ select public.register_push_token('tok-ben-phone', 'android', '130') $$, 'Ben registers his phone');
select throws_ok($$ select public.set_push_config('https://evil.example/push', 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') $$, null, null, 'people cannot redirect pushes');
select throws_ok($$ select * from private.push_config $$, null, null, 'people cannot read the push secret');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.push_tokens), 0, 'Ana cannot see Ben''s phone');
select lives_ok($$ select public.start_direct('b0000000-0000-0000-0000-000000000002') $$, 'Ana opens a chat with Ben');
select lives_ok($$ insert into public.messages (conversation_id, body) values ((select id from public.conversations limit 1), 'hi Ben') $$,
  'a message still goes through with push switched on');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.notifications where type = 'message'), 1, 'Ben is notified');

-- the server sets the push address (as the push function does at deploy), then a new message is pushed
reset role;
select lives_ok($$ select public.set_push_config('https://example.invalid/functions/v1/push', repeat('s', 32)) $$, 'the server sets where pushes go');
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ insert into public.messages (conversation_id, body) values ((select id from public.conversations limit 1), 'are you free?') $$,
  'a message is queued for push without errors');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ delete from public.push_tokens where token = 'tok-ben-phone' $$, 'Ben''s phone removes its token at sign-out');

select * from finish();
rollback;
