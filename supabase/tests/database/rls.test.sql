-- Security rules, tested against the real migrations. Runs in CI on every change (supabase test db).
-- People: Ana (worker), Ben (client with a business and a course), Carl (student), Mo (admin).
-- Each block switches to "signed in as X" the same way the app's requests do.
begin;
create extension if not exists pgtap with schema extensions;
select plan(54);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'mo@test.bolo', '{"name": "Mo"}');
insert into public.admin_users (user_id, role) values ('d0000000-0000-0000-0000-000000000004', 'admin');
insert into public.businesses (id, owner_id, client_id, name) values ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'biz1', 'Ben Build');
insert into public.business_private (business_id, rccm, niu) values ('e0000000-0000-0000-0000-000000000005', 'RC/BUE/2024/B/1', 'M0123');
insert into public.courses (id, owner_id, title) values ('course1', 'b0000000-0000-0000-0000-000000000002', 'Tiling basics');

-- ================================================================ accounts
select is((select count(*)::int from public.profiles where id in ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002')), 2, 'sign-up creates a profile');
select is((select name from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'), 'Ana', 'profile takes the sign-up name');

set local role anon;
set local request.jwt.claims = '';
select ok((select count(*) from public.profiles) >= 4, 'anyone can read public profiles');
select is((select count(*)::int from public.profiles_private), 0, 'anyone cannot read private profiles');
select throws_ok($$ update public.app_config set value = '{}' where key = 'min_version' $$, null, null, 'app config cannot be changed from the app');
select ok((select count(*) from public.app_config) >= 2, 'app config is readable');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ update public.profiles set name = 'Ana N.' where id = 'a0000000-0000-0000-0000-000000000001' $$, 'Ana edits her profile');
select throws_ok($$ update public.profiles set pro_regular = true where id = 'a0000000-0000-0000-0000-000000000001' $$, null, null, 'Ana cannot give herself Pro');
select throws_ok($$ update public.profiles set verified = true where id = 'a0000000-0000-0000-0000-000000000001' $$, null, null, 'Ana cannot verify herself');
update public.profiles set name = 'hacked' where id = 'b0000000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.profiles_private), 1, 'Ana reads only her own private profile');
select is((select count(*)::int from public.business_private), 0, 'Ana cannot read Ben''s RCCM/NIU');
select throws_ok($$ insert into public.businesses (owner_id, client_id, name) values ('b0000000-0000-0000-0000-000000000002', 'x', 'Fake') $$, null, null, 'Ana cannot create a business in Ben''s name');
select throws_ok($$ update public.businesses set verified = 'verified' $$, null, null, 'nobody can verify a business from the app');
select is((select count(*)::int from public.admin_users), 0, 'Ana cannot see who the admins are');
reset role;
select is((select name from public.profiles where id = 'b0000000-0000-0000-0000-000000000002'), 'Ben', 'Ana cannot edit Ben''s profile');

-- ================================================================ posts, comments, notifications, blocks
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ insert into public.posts (id, author_id, kind, body) values ('post1', 'a0000000-0000-0000-0000-000000000001', 'work', 'New tiles done') $$, 'Ana posts');
select throws_ok($$ insert into public.posts (id, author_id, body) values ('post-fake', 'b0000000-0000-0000-0000-000000000002', 'x') $$, null, null, 'Ana cannot post as Ben');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ insert into public.comments (post_id, body) values ('post1', 'Great work') $$, 'Ben comments on Ana''s post');
select throws_ok($$ insert into public.comments (post_id, author_id, body) values ('post1', 'c0000000-0000-0000-0000-000000000003', 'as Carl') $$, null, null, 'Ben cannot comment as Carl');
select is((select count(*)::int from public.notifications where recipient_id = 'a0000000-0000-0000-0000-000000000001'), 0, 'Ben cannot read Ana''s notifications');
select throws_ok($$ insert into public.notifications (recipient_id, type, category, body, event_key) values ('a0000000-0000-0000-0000-000000000001', 'x', 'social', 'fake', 'k') $$, null, null, 'the app cannot create notifications');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.notifications where type = 'comment'), 1, 'Ana is notified of Ben''s comment once');
select lives_ok($$ update public.notifications set read_at = now() $$, 'Ana marks her notifications read');
select throws_ok($$ update public.notifications set body = 'changed' $$, null, null, 'Ana cannot rewrite a notification');
delete from public.comments where post_id = 'post1';
select is((select count(*)::int from public.comments where post_id = 'post1'), 1, 'Ana cannot delete Ben''s comment');
select lives_ok($$ insert into public.blocks (blocked_id) values ('b0000000-0000-0000-0000-000000000002') $$, 'Ana blocks Ben');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ insert into public.comments (post_id, body) values ('post1', 'again') $$, null, null, 'a blocked person cannot comment');
select lives_ok($$ do $b$ begin for i in 1..20 loop insert into public.posts (id, author_id, body) values ('rl' || i, auth.uid(), 'x'); end loop; end $b$ $$, 'Ben can post 20 times in an hour');
select throws_ok($$ insert into public.posts (id, author_id, body) values ('rl21', auth.uid(), 'x') $$, null, null, 'the 21st post in an hour is refused');

-- ================================================================ courses
select throws_ok($$ insert into public.course_enrollments (course_id) values ('course1') $$, null, null, 'Ben cannot enrol in his own course');
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ insert into public.course_enrollments (course_id) values ('course1') $$, 'Carl enrols');
select lives_ok($$ insert into public.course_reviews (course_id, stars, body) values ('course1', 5, 'Clear and practical') $$, 'an enrolled student rates the course');
select throws_ok($$ update public.course_reviews set stars = 6 $$, null, null, 'ratings are 1 to 5');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select throws_ok($$ insert into public.course_reviews (course_id, stars) values ('course1', 1) $$, null, null, 'someone not enrolled cannot rate');
select lives_ok($$ insert into public.course_enrollments (course_id, status) values ('course1', 'pending') $$, 'Ana asks to join');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ update public.course_enrollments set status = 'rejected' where student_id = 'a0000000-0000-0000-0000-000000000001' $$, 'the owner rejects Ana');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select throws_ok($$ update public.course_enrollments set status = 'active' where student_id = auth.uid() $$, null, null, 'Ana cannot approve herself');
select lives_ok($$ update public.course_enrollments set status = 'left' where student_id = auth.uid() $$, 'Ana can leave the course');

-- ================================================================ reports, admins, audit log
select lives_ok($$ insert into public.reports (target_type, target_id, reason) values ('post', 'rl1', 'spam') $$, 'Ana reports a post');
select throws_ok($$ insert into public.reports (target_type, target_id, reason) values ('post', 'rl1', 'spam') $$, null, null, 'the same report cannot be sent twice');
select throws_ok($$ select public.admin_resolve_report((select id from public.reports limit 1), 'dismissed') $$, null, null, 'Ana cannot close reports');
select is((select count(*)::int from public.audit_log), 0, 'Ana cannot read the audit log');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.reports), 0, 'Ben cannot see who reported him');
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select is((select count(*)::int from public.reports), 1, 'the admin sees the report');
select lives_ok($$ select public.admin_resolve_report((select id from public.reports limit 1), 'actioned', 'spam removed') $$, 'the admin closes it');
select is((select count(*)::int from public.business_private), 1, 'the admin can read RCCM/NIU for verification');
reset role;
select throws_ok($$ delete from public.audit_log $$, null, null, 'the audit log can never be deleted');

-- ================================================================ ID verification and private documents
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('verifications', 'a0000000-0000-0000-0000-000000000001/id-front.jpg') $$, 'Ana uploads her ID to her own folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('verifications', 'b0000000-0000-0000-0000-000000000002/id.jpg') $$, null, null, 'Ana cannot upload into Ben''s folder');
select lives_ok($$ insert into public.verifications (kind, files) values ('id', array['a0000000-0000-0000-0000-000000000001/id-front.jpg']) $$, 'Ana asks to be verified');
select throws_ok($$ insert into public.verifications (kind, status) values ('id', 'approved') $$, null, null, 'Ana cannot approve her own verification');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from storage.objects where bucket_id = 'verifications'), 0, 'Ben cannot see Ana''s ID');
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select lives_ok($$ select public.admin_review_verification((select id from public.verifications limit 1), true) $$, 'the admin approves Ana''s ID');
reset role;
select is((select verified from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'), true, 'Ana gets the verified badge');

select * from finish();
rollback;
