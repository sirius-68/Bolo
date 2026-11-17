-- Admin roles (support, moderator, admin, owner), the Content page, and pop-ups that clear when read.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'dora@test.bolo', '{"name": "Dora"}'),
  ('e0000000-0000-0000-0000-000000000005', 'eve@test.bolo', '{"name": "Eve"}');
insert into public.admin_users (user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', 'owner'), ('d0000000-0000-0000-0000-000000000004', 'moderator'),
  ('e0000000-0000-0000-0000-000000000005', 'support'), ('c0000000-0000-0000-0000-000000000003', 'admin');

set local role authenticated;
-- Ben is an ordinary member with a post, a job and a comment
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
insert into public.posts (id, author_id, kind, body) values ('p1', auth.uid(), 'text', 'Fresh paint on the gate');
insert into public.posts (id, author_id, kind, title, body) values ('j1', auth.uid(), 'request', 'Fix my roof', 'Two sheets came loose');
insert into public.comments (post_id, body) values ('p1', 'Looks good');
select throws_ok($$ select public.admin_latest_content('posts') $$, '42501', null, 'a member cannot open the Content page');

-- ---- support: reads and answers
set local request.jwt.claims = '{"sub": "e0000000-0000-0000-0000-000000000005"}';
select is(public.admin_latest_content('posts') -> 0 ->> 'author', 'Ben', 'support sees the newest posts and who wrote them');
select is(jsonb_array_length(public.admin_latest_content('jobs')), 1, 'jobs are listed apart from posts');
select is(public.admin_latest_content('comments') -> 0 ->> 'body', 'Looks good', 'and the newest comments');
select is(jsonb_array_length(public.admin_latest_content('posts', 'roof')), 0, 'the search looks in posts only when posts are asked for');
select is(jsonb_array_length(public.admin_latest_content('jobs', 'ROOF')), 1, 'the search finds a job by a word in it');
select lives_ok($$ select public.admin_message('b0000000-0000-0000-0000-000000000002', 'Thanks for writing to us, Ben') $$, 'support can write to a person');
select throws_ok($$ select public.admin_remove_content('post', 'p1', 'spam') $$, '42501', null, 'support cannot remove content');
select is((select count(*)::int from public.posts where id = 'p1'), 1, 'and the post is still there');
select throws_ok($$ select public.admin_suspend('b0000000-0000-0000-0000-000000000002', true, 'spam') $$, '42501', null, 'support cannot suspend');
select is((select suspended_at from public.profiles where id = 'b0000000-0000-0000-0000-000000000002'), null, 'and nobody was suspended');
select throws_ok($$ select public.admin_set_verified('b0000000-0000-0000-0000-000000000002', true) $$, '42501', null, 'support cannot give the badge');

-- ---- moderator: also removes and suspends
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select lives_ok($$ select public.admin_remove_content('comment', (select id::text from public.comments limit 1), 'off topic') $$, 'a moderator removes a comment');
select lives_ok($$ select public.admin_suspend('b0000000-0000-0000-0000-000000000002', true, 'spam') $$, 'a moderator suspends');
select lives_ok($$ select public.admin_suspend('b0000000-0000-0000-0000-000000000002', false, 'sorted') $$, 'and restores');
select throws_ok($$ select public.admin_set_pro('b0000000-0000-0000-0000-000000000002', true, false) $$, '42501', null, 'a moderator cannot give Pro');
select throws_ok($$ select public.admin_set_config('maintenance', '{"on": false}') $$, '42501', null, 'a moderator cannot change settings');

-- ---- admin: also Pro and announcements, not settings
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ select public.admin_set_pro('b0000000-0000-0000-0000-000000000002', true, false) $$, 'an admin can give Pro');
select throws_ok($$ select public.admin_grant('ben@test.bolo', 'moderator') $$, '42501', null, 'an admin cannot change the admin team');

-- ---- owner
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.admin_remove_content('post', 'p1', 'spam') $$, 'the owner removes a post');

-- ---- pop-ups
reset role;
select is((select count(*)::int from public.audit_log where action = 'content.remove'), 2, 'only the actions that went through are in the activity log');
select is((select private.push_tag(n) from public.notifications n where n.type = 'removed' or n.event_key like 'removed:%' limit 1) like 'removed:%', true, 'a notice is shown on the phone under its own name');
select public.bolo_notify('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'missed', 'messages', 'Missed voice call', '{"k": "chat", "id": "c-1"}', 'call:x1');
select is((select private.push_tag(n) from public.notifications n where n.event_key = 'call:x1'), 'calls:c-1', 'calls of one chat share one pop-up');
set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ update public.notifications set read_at = now() where recipient_id = auth.uid() and read_at is null $$, 'reading notifications works with or without the push service');

select * from finish();
rollback;
