-- Jobs, offers, chat, bookings with live location, reviews, follows, mentorships.
-- People: Ana (posts a job), Ben (worker), Carl (another worker), Dee (stranger).
begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'dee@test.bolo', '{"name": "Dee"}');

set local role authenticated;

-- ================================================================ a job and offers
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ insert into public.posts (id, author_id, kind, title, cat, area, data) values ('job1', auth.uid(), 'request', 'Fix kitchen tap', 'Plumber', 'Molyko', '{"budget": "XAF 15,000"}') $$, 'Ana posts a job');
select throws_ok($$ insert into public.applications (post_id, price) values ('job1', 'XAF 1') $$, null, null, 'Ana cannot make an offer on her own job');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ insert into public.applications (post_id, price, when_text, msg) values ('job1', 'XAF 14,000', 'Tomorrow, 10:00', 'I can do it') $$, 'Ben sends an offer');
select throws_ok($$ insert into public.applications (post_id, price) values ('job1', 'XAF 13,000') $$, null, null, 'one offer per person per job');
select throws_ok($$ update public.applications set stage = 'short' $$, null, null, 'Ben cannot shortlist himself');

set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ insert into public.applications (post_id, price) values ('job1', 'XAF 16,000') $$, 'Carl sends an offer');
select is((select count(*)::int from public.applications), 1, 'Carl sees only his own offer');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.applications where post_id = 'job1'), 2, 'Ana sees both offers on her job');
select is((select count(*)::int from public.notifications where type = 'newoffer'), 2, 'Ana is notified of each offer');
select throws_ok($$ update public.applications set price = 'XAF 1' $$, null, null, 'Ana cannot change someone''s offer');
select lives_ok($$ select public.accept_application((select id from public.applications where applicant_id = 'b0000000-0000-0000-0000-000000000002')) $$, 'Ana accepts Ben''s offer');
select is((select status from public.posts where id = 'job1'), 'booked', 'the job is marked booked');
select is((select count(*)::int from public.bookings where worker_id = 'b0000000-0000-0000-0000-000000000002' and state = 'booked'), 1, 'a booking exists for Ben');
select ok((select count(*) from public.messages m where m.kind = 'sys' and m.body like 'Job booked%') = 1, 'the chat shows the booking');

set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select throws_ok($$ insert into public.applications (post_id, price) values ('job1', 'XAF 9') $$, null, null, 'no new offers on a booked job');
select is((select count(*)::int from public.bookings), 0, 'Carl cannot see Ana and Ben''s booking');
select is((select count(*)::int from public.messages), 0, 'Carl cannot read their chat');

-- ================================================================ booking steps and live location
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select throws_ok($$ select public.booking_step((select id from public.bookings limit 1), 'onway') $$, null, null, 'the client cannot say the worker is on the way');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ insert into public.booking_locations (booking_id, lat, lng) values ((select id from public.bookings limit 1), 4.15, 9.24) $$, null, null, 'no location before setting off');
select lives_ok($$ select public.booking_step((select id from public.bookings limit 1), 'onway', 12) $$, 'Ben sets off');
select lives_ok($$ insert into public.booking_locations (booking_id, lat, lng, eta_min) values ((select id from public.bookings limit 1), 4.1527, 9.2410, 11) $$, 'Ben shares his location');
select lives_ok($$ update public.booking_locations set lat = 4.153, eta_min = 6 $$, 'his location updates');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select eta_min from public.booking_locations limit 1), 6, 'Ana follows Ben''s location');
select throws_ok($$ insert into public.booking_locations (booking_id, lat, lng) values ((select id from public.bookings limit 1), 1, 1) on conflict (booking_id) do update set lat = 1 $$, null, null, 'Ana cannot move Ben''s pin');

set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select is((select count(*)::int from public.booking_locations), 0, 'a stranger cannot see where Ben is');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ select public.booking_step((select id from public.bookings limit 1), 'working') $$, 'Ben arrives');
select is((select count(*)::int from public.booking_locations), 0, 'location sharing stops on arrival');
select lives_ok($$ select public.booking_step((select id from public.bookings limit 1), 'done') $$, 'Ben finishes');
select throws_ok($$ select public.booking_step((select id from public.bookings limit 1), 'confirmed') $$, null, null, 'Ben cannot confirm his own job');
select throws_ok($$ insert into public.reviews (booking_id, reviewee_id, stars) values ((select id from public.bookings limit 1), 'a0000000-0000-0000-0000-000000000001', 5) $$, null, null, 'no reviews before the client confirms');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.booking_step((select id from public.bookings limit 1), 'confirmed') $$, 'Ana confirms the job');
select lives_ok($$ insert into public.reviews (booking_id, reviewee_id, stars, body) values ((select id from public.bookings limit 1), 'b0000000-0000-0000-0000-000000000002', 5, 'Fast and tidy') $$, 'Ana reviews Ben');
select throws_ok($$ insert into public.reviews (booking_id, reviewee_id, stars) values ((select id from public.bookings limit 1), 'b0000000-0000-0000-0000-000000000002', 1) $$, null, null, 'one review per job');
select is((select jobs_done from public.profile_stats where id = 'b0000000-0000-0000-0000-000000000002'), 1, 'Ben''s profile counts the job');

set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select throws_ok($$ insert into public.reviews (booking_id, reviewee_id, stars) values ((select id from public.bookings where state = 'confirmed' limit 1), 'b0000000-0000-0000-0000-000000000002', 1) $$, null, null, 'a stranger cannot review Ben');

-- ================================================================ chat, quotes, blocking
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ select public.start_direct('a0000000-0000-0000-0000-000000000001') $$, 'Carl opens a chat with Ana');
select is((select public.start_direct('a0000000-0000-0000-0000-000000000001')) = (select public.start_direct('a0000000-0000-0000-0000-000000000001')), true, 'the same chat is reused');
select lives_ok($$ insert into public.messages (conversation_id, body) values ((select public.start_direct('a0000000-0000-0000-0000-000000000001')), 'Hello Ana') $$, 'Carl writes');
select throws_ok($$ insert into public.messages (conversation_id, kind, body) values ((select public.start_direct('a0000000-0000-0000-0000-000000000001')), 'sys', 'Job booked') $$, null, null, 'nobody can fake a system message');
select lives_ok($$ insert into public.messages (conversation_id, kind, data) values ((select public.start_direct('a0000000-0000-0000-0000-000000000001')), 'offer', '{"job": "Fix shower", "price": "XAF 8,000", "when": "Friday", "worker": "sender", "state": "acc"}') $$, 'Carl sends a quote');
select is((select data ? 'state' from public.messages where kind = 'offer'), false, 'a quote cannot arrive already accepted');
select throws_ok($$ select public.answer_offer((select id from public.messages where kind = 'offer'), true) $$, null, null, 'Carl cannot accept his own quote');
select throws_ok($$ update public.messages set body = 'edited' where kind = 'text' $$, null, null, 'messages cannot be rewritten');

reset role;
select set_config('test.carl_chat', (select c.id::text from public.conversations c join public.conversation_members m on m.conversation_id = c.id where m.user_id = 'c0000000-0000-0000-0000-000000000003' limit 1), true);
set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_ok($$ insert into public.messages (conversation_id, body) values (current_setting('test.carl_chat')::uuid, 'sneaky') $$, null, null, 'Ben cannot write in a chat he is not in');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.notifications where type = 'message'), 1, 'Ana gets one notification for the chat');
select lives_ok($$ select public.answer_offer((select id from public.messages where kind = 'offer'), true) $$, 'Ana accepts Carl''s quote');
select is((select count(*)::int from public.bookings where worker_id = 'c0000000-0000-0000-0000-000000000003' and client_id = auth.uid()), 1, 'the quote became a booking with Carl as the worker');
select throws_ok($$ select public.answer_offer((select id from public.messages where kind = 'offer'), false) $$, null, null, 'a quote is answered once');
select lives_ok($$ insert into public.blocks (blocked_id) values ('c0000000-0000-0000-0000-000000000003') $$, 'Ana blocks Carl');

set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select throws_ok($$ insert into public.messages (conversation_id, body) values ((select public.start_direct('a0000000-0000-0000-0000-000000000001')), 'still there?') $$, null, null, 'a blocked person cannot message');

-- ================================================================ follows and mentorships
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select lives_ok($$ insert into public.follows (followee_id) values ('b0000000-0000-0000-0000-000000000002') $$, 'Dee follows Ben');
select lives_ok($$ insert into public.mentorships (id, title, data) values ('mt1', 'Start freelancing', '{"field": "Business"}') $$, 'Dee starts a mentorship');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ insert into public.mentorship_members (mentorship_id) values ('mt1') $$, 'Ben asks to join');
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select lives_ok($$ update public.mentorship_members set status = 'yes' where mentorship_id = 'mt1' $$, 'Dee accepts Ben');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.conversation_members cm join public.mentorships m on m.conversation_id = cm.conversation_id where m.id = 'mt1'), 2, 'Ben is in the mentorship group chat');

select * from finish();
rollback;
