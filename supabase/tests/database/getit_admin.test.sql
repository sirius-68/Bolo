-- The admin panel's view of getit: requests, the prices sent for them, jobs, workers.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-0000000000a1', 'ada@test.getit', '{"name": "Ada"}'),
  ('b0000000-0000-0000-0000-0000000000b2', 'hira@test.getit', '{"name": "Hira"}'),
  ('c0000000-0000-0000-0000-0000000000c3', 'paul@test.getit', '{"name": "Paul"}'),
  ('d0000000-0000-0000-0000-0000000000d4', 'rest@test.getit', '{"name": "Rest"}');
insert into public.admin_users (user_id, role) values ('a0000000-0000-0000-0000-0000000000a1', 'moderator');
-- Paul is an available plumber, Rest a plumber who paused; Hira and Ada hire
update public.profiles set skills = '{Plumber}', work_status = 'open' where id = 'c0000000-0000-0000-0000-0000000000c3';
update public.profiles set skills = '{Plumber}', work_status = 'off' where id = 'd0000000-0000-0000-0000-0000000000d4';

-- Hira asked for a plumber an hour ago, and for a tailor just now
set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b2"}';
insert into public.posts (id, author_id, kind, title, body, cat, area, urgent, data) values
  ('q1', auth.uid(), 'request', 'Leaking kitchen sink', 'Water under the sink', 'Plumber', 'Molyko, Buea', true, '{"type": "place", "when": "Today"}'),
  ('q2', auth.uid(), 'request', 'Sew a dress', '', 'Tailor', 'Molyko, Buea', false, '{"type": "shop"}');
select throws_ok($$ select public.admin_requests() $$, '42501', null, 'requests of everyone are for admins');
select throws_ok($$ select public.admin_jobs() $$, '42501', null, 'so are the jobs');
select throws_ok($$ select public.admin_request_offers('q1') $$, '42501', null, 'and the prices people sent');
reset role;
update public.posts set created_at = now() - interval '1 hour' where id = 'q1';

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(jsonb_array_length(public.admin_requests('open')), 2, 'both open requests are listed');
select is(public.admin_requests('unanswered') -> 0 ->> 'id', 'q1', 'the one waiting 30+ minutes with no price is "unanswered"');
select is(jsonb_array_length(public.admin_requests('unanswered')), 1, 'a request sent just now is not unanswered yet');
select is((public.admin_requests('open', 'sink') -> 0 ->> 'told')::int, 1, 'it shows how many workers were told (the available plumber)');
select is(public.admin_requests('open', 'sink') -> 0 ->> 'author', 'Hira', 'and who asked');
select is((public.admin_overview() ->> 'unanswered')::int, 1, 'the dashboard counts it');
select is((public.admin_overview() ->> 'workers')::int, 2, 'two workers');
select is((public.admin_overview() ->> 'workers_open')::int, 1, 'one of them available');

-- Paul sends a price
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-0000000000c3"}';
insert into public.applications (post_id, price, when_text, msg) values ('q1', '6000', 'Today, now', 'I have the parts');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(jsonb_array_length(public.admin_requests('unanswered')), 0, 'with a price it is no longer unanswered');
select is((public.admin_requests('open', 'sink') -> 0 ->> 'offers')::int, 1, 'the request shows one price');
select is(public.admin_request_offers('q1') -> 0 ->> 'worker', 'Paul', 'from Paul');
select is(public.admin_request_offers('q1') -> 0 ->> 'price', '6000', 'for 6000');
select is((public.admin_stats(30) -> 'match' ->> 'answered')::int, 1, 'the numbers: one of two requests got a price');
select is(public.admin_stats(30) -> 'trades' -> 0 ->> 'trade', 'Plumber', 'what people ask for, by trade');
select is((public.admin_stats(30) -> 'trades' -> 0 ->> 'workers')::int, 2, 'next to how many workers offer it');
reset role;

-- Hira books Paul
insert into public.bookings (id, worker_id, client_id, post_id, title, price, amount, state)
  values ('e0000000-0000-0000-0000-0000000000e5', 'c0000000-0000-0000-0000-0000000000c3', 'b0000000-0000-0000-0000-0000000000b2', 'q1', 'Leaking kitchen sink', '6000', 6000, 'onway');
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(public.admin_jobs('live') -> 0 ->> 'worker', 'Paul', 'the job is listed while it is live, with the worker');
select is(public.admin_jobs('live') -> 0 ->> 'client', 'Hira', 'and the client');
select is(jsonb_array_length(public.admin_people(null, 'available')), 1, 'People → Available now: only Paul');
select is(public.admin_person('c0000000-0000-0000-0000-0000000000c3') -> 'jobs' -> 0 ->> 'side', 'worker', 'Paul''s account shows the job, as the worker');

select * from finish();
rollback;
