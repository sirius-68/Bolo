-- Admin panel: only admins get in; suspension really stops an account; every change leaves a trace.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'dora@test.bolo', '{"name": "Dora"}');
-- Ana owns the panel, Dora is a moderator
insert into public.admin_users (user_id, role) values ('a0000000-0000-0000-0000-000000000001', 'owner'), ('d0000000-0000-0000-0000-000000000004', 'moderator');

set local role authenticated;

-- ---- someone who is not an admin gets nothing
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is(public.admin_me(), null, 'Ben is not an admin');
select throws_ok($$ select public.admin_overview() $$, '42501', null, 'the overview is for admins');
select throws_ok($$ select public.admin_people() $$, '42501', null, 'the people list (with emails) is for admins');
select throws_ok($$ select public.admin_person('a0000000-0000-0000-0000-000000000001') $$, '42501', null, 'details of a person are for admins');
select throws_ok($$ select public.admin_suspend('c0000000-0000-0000-0000-000000000003', true, 'no reason') $$, '42501', null, 'Ben cannot suspend anyone');
select throws_ok($$ select public.admin_feedback() $$, '42501', null, 'feedback is for admins');
select throws_ok($$ select public.admin_set_config('maintenance', '{"on": true, "message": "hacked"}') $$, '42501', null, 'Ben cannot switch maintenance on');
select throws_ok($$ select public.admin_grant('ben@test.bolo', 'owner') $$, '42501', null, 'Ben cannot make himself an admin');
select throws_ok($$ update public.profiles set suspended_at = null where id = auth.uid() $$, null, null, 'nobody can lift their own suspension');

-- Ben posts something, Carl reports it and writes to bolo
select lives_ok($$ insert into public.posts (id, author_id, kind, title, body) values ('p_bad', auth.uid(), 'request', 'Send me money first', 'Pay before the job') $$, 'Ben posts');
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ insert into public.reports (target_type, target_id, reason, details) values ('post', 'p_bad', 'scam', 'asks for money first') $$, 'Carl reports the post');
select lives_ok($$ insert into public.feedback (topic, body) values ('safety', 'Someone asked me to pay before the job') $$, 'Carl writes to bolo');

-- ---- a moderator works the queues
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select is(public.admin_me() ->> 'role', 'moderator', 'Dora is a moderator');
select is((public.admin_overview() -> 'queue' ->> 'reports')::int, 1, 'the overview counts the open report');
select is(public.admin_reports('open') -> 0 -> 'target' ->> 'owner', 'Ben', 'the report shows who is behind the post');
select is(jsonb_array_length(public.admin_feedback('open')), 1, 'Dora sees the feedback');
select is(public.admin_people('carl', 'all') -> 0 ->> 'email', 'carl@test.bolo', 'Dora can find a person by name and see the email');
select lives_ok($$ select public.admin_remove_content('post', 'p_bad', 'asks for payment before work') $$, 'Dora removes the post');
select is((select count(*)::int from public.posts where id = 'p_bad'), 0, 'the post is gone');
select is((select status from public.reports where target_id = 'p_bad'), 'actioned', 'the report is closed');
select lives_ok($$ select public.admin_suspend('b0000000-0000-0000-0000-000000000002', true, 'scam posts') $$, 'Dora suspends Ben');
select lives_ok($$ select public.admin_set_feedback((select id from public.feedback limit 1), 'answered', 'removed the post, suspended the account') $$, 'Dora marks the feedback answered');
select throws_ok($$ select public.admin_grant('carl@test.bolo', 'moderator') $$, '42501', null, 'a moderator cannot add admins');

-- ---- the suspended account
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ insert into public.posts (id, author_id, kind, title) values ('p_again', auth.uid(), 'request', 'again') $$, 'P0001', null, 'a suspended account cannot post');
select lives_ok($$ insert into public.feedback (topic, body) values ('account', 'Why was I suspended?') $$, 'but it can still write to bolo');
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select is((select count(*)::int from public.profile_cards where visible and id = 'b0000000-0000-0000-0000-000000000002'), 0, 'a suspended profile is out of the people list');

-- ---- the owner
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.admin_grant('carl@test.bolo', 'support') $$, 'the owner adds an admin');
select lives_ok($$ select public.admin_set_config('min_version', '{"android": 144, "ios": 1, "message": "Update bolo"}') $$, 'the owner raises the minimum version');
select ok((select count(*) from public.audit_log where action in ('content.remove', 'account.suspend', 'feedback.answered', 'admin.grant', 'config.set')) = 5, 'every change is in the audit log');

select * from finish();
rollback;
