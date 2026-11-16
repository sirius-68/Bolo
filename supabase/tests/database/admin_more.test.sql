-- Admin panel, second part: notices come from "bolo" and reach the business inbox; verification requests,
-- messages, announcements, business suspension, closing an account.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'dora@test.bolo', '{"name": "Dora"}');
insert into public.admin_users (user_id, role) values ('a0000000-0000-0000-0000-000000000001', 'owner'), ('d0000000-0000-0000-0000-000000000004', 'moderator');
insert into public.businesses (id, owner_id, client_id, name, verified) values ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'biz1', 'Ben Build', 'review');

set local role authenticated;

-- ---- not an admin
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ select public.admin_message('c0000000-0000-0000-0000-000000000003', 'hello there') $$, '42501', null, 'Ben cannot write as bolo');
select throws_ok($$ select public.admin_announce('Free money for everyone today') $$, '42501', null, 'Ben cannot announce');
select throws_ok($$ select public.admin_request_verification('c0000000-0000-0000-0000-000000000003') $$, '42501', null, 'Ben cannot ask people to verify');
select throws_ok($$ select public.admin_close_account('c0000000-0000-0000-0000-000000000003', 'because') $$, '42501', null, 'Ben cannot close accounts');
select throws_ok($$ select public.admin_suspend_business('e0000000-0000-0000-0000-000000000005', false) $$, '42501', null, 'Ben cannot lift a suspension');
select lives_ok($$ insert into public.posts (id, author_id, business_id, kind, title) values ('vac1', auth.uid(), 'e0000000-0000-0000-0000-000000000005', 'request', 'Site foreman') $$, 'Ben posts a vacancy as his business');
-- Carl switched News off
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
insert into public.notification_prefs (user_id, category, enabled) values (auth.uid(), 'news', false);

-- ---- a moderator
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select lives_ok($$ select public.admin_request_verification('c0000000-0000-0000-0000-000000000003', null, 'before your first job') $$, 'Dora asks Carl to verify his ID');
select lives_ok($$ select public.admin_request_verification(null, 'e0000000-0000-0000-0000-000000000005') $$, 'Dora asks Ben Build to verify');
select lives_ok($$ select public.admin_message('c0000000-0000-0000-0000-000000000003', 'Welcome to bolo, Carl') $$, 'Dora writes to Carl');
select throws_ok($$ select public.admin_message('c0000000-0000-0000-0000-000000000003', 'hi') $$, null, null, 'not an empty message');
select throws_ok($$ select public.admin_announce('Maintenance on Sunday morning') $$, '42501', null, 'a moderator cannot announce');
select lives_ok($$ select public.admin_review_business('e0000000-0000-0000-0000-000000000005', true) $$, 'Dora verifies the business');
select is(public.admin_businesses('all', 'ben build') -> 0 ->> 'verified', 'verified', 'Dora finds the business by name');
select is(jsonb_array_length(public.admin_content('b0000000-0000-0000-0000-000000000002') -> 'posts'), 1, 'Dora sees what Ben posted');
select lives_ok($$ select public.admin_set_verified('c0000000-0000-0000-0000-000000000003', true) $$, 'Dora gives Carl the badge by hand');
select throws_ok($$ select public.admin_request_verification('c0000000-0000-0000-0000-000000000003') $$, null, null, 'no request to someone already verified');
select throws_ok($$ select public.admin_close_account('c0000000-0000-0000-0000-000000000003', 'spam') $$, '42501', null, 'a moderator cannot close accounts');

-- ---- what they received
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select is((select count(*)::int from public.notifications where actor_id is null and type = 'account'), 3, 'Carl has the request, the message and the badge notice');
select is((select count(*)::int from public.notifications where actor_id is not null), 0, 'none of them shows the admin''s own account');
select is((select target ->> 'k' from public.notifications where event_key like 'verifreq:id:%'), 'verify', 'the request opens the verification screen');
select is((select verified from public.profiles where id = auth.uid()), true, 'Carl is verified');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.notifications where business_id = 'e0000000-0000-0000-0000-000000000005'), 2, 'the business notices are in the business inbox');

-- ---- the owner: announcement, business suspension, closing an account
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is(public.admin_announce('bolo will be offline on Sunday from 2 to 4 am.'), 3, 'the announcement goes to everyone who has not switched News off');
select is(public.admin_announce('Please verify your identity to get the badge.', 'unverified'), 3, 'an announcement only to accounts that are not verified yet');
select lives_ok($$ select public.admin_suspend_business('e0000000-0000-0000-0000-000000000005', true, 'fake vacancies') $$, 'Ana suspends the business page');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ insert into public.posts (id, author_id, business_id, kind, title) values ('vac2', auth.uid(), 'e0000000-0000-0000-0000-000000000005', 'request', 'Driver') $$, 'P0001', null, 'a suspended business cannot publish');
select is((select count(*)::int from public.post_feed where id = 'vac1'), 1, 'its owner still sees the old vacancy');
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select is((select count(*)::int from public.post_feed where id = 'vac1'), 0, 'everyone else no longer does');
select is((select count(*)::int from public.notifications where category = 'news'), 0, 'Carl, with News off, got no announcement');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select throws_ok($$ select public.admin_close_account('d0000000-0000-0000-0000-000000000004', 'leaving') $$, null, null, 'an admin must be removed as admin first');
select lives_ok($$ select public.admin_close_account('c0000000-0000-0000-0000-000000000003', 'asked by email') $$, 'the owner closes Carl''s account');
select ok((select count(*) from public.audit_log where action in ('verification.request', 'message.send', 'business.approve', 'verified.set', 'announce.send', 'business.suspend', 'account.close')) = 9, 'every one of these is in the audit log');

select * from finish();
rollback;
