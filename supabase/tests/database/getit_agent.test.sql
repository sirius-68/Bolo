-- Services under a skill, ratings per service, and the getit agent.
begin;
create extension if not exists pgtap with schema extensions;
select plan(53);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-0000000000a1', 'hira@test.getit', '{"name": "Hira M"}'),
  ('b0000000-0000-0000-0000-0000000000b1', 'paul@test.getit', '{"name": "Paul N"}'),
  ('b0000000-0000-0000-0000-0000000000b2', 'sam@test.getit', '{"name": "Sam K"}'),
  ('b0000000-0000-0000-0000-0000000000b3', 'mary@test.getit', '{"name": "Mary T"}'),
  ('b0000000-0000-0000-0000-0000000000b4', 'tom@test.getit', '{"name": "Tom A"}'),
  ('b0000000-0000-0000-0000-0000000000b5', 'uma@test.getit', '{"name": "Uma B"}'),
  ('b0000000-0000-0000-0000-0000000000b6', 'quinn@test.getit', '{"name": "Quinn Q"}');
-- six plumbers in Buea. Paul and Sam say they do "Leak repair" (Paul from 5,000, Sam from 9,000); the others list
-- no services. Mary is the closest, then Tom, then Uma. Quinn switched job alerts off.
update public.profiles set skills = '{Plumber}', work_status = 'open', area = '{"ways": ["go"], "radius": 10}' where id::text like 'b0000000%';
update public.profiles set services = '[{"id": "s1", "skill": "Leak repair", "price": 5000, "pub": true}, {"id": "s2", "skill": "Water heater", "price": 60000, "pub": true}]',
  location_approx = st_setsrid(st_makepoint(9.2600, 4.1600), 4326)::geography where id = 'b0000000-0000-0000-0000-0000000000b1';
update public.profiles set services = '[{"id": "s1", "skill": "Leak repair", "price": 9000, "pub": true}]',
  location_approx = st_setsrid(st_makepoint(9.2650, 4.1600), 4326)::geography where id = 'b0000000-0000-0000-0000-0000000000b2';
update public.profiles set location_approx = st_setsrid(st_makepoint(9.2411, 4.1531), 4326)::geography where id = 'b0000000-0000-0000-0000-0000000000b3';
update public.profiles set location_approx = st_setsrid(st_makepoint(9.2450, 4.1531), 4326)::geography where id = 'b0000000-0000-0000-0000-0000000000b4';
update public.profiles set location_approx = st_setsrid(st_makepoint(9.2500, 4.1531), 4326)::geography where id = 'b0000000-0000-0000-0000-0000000000b5';
update public.profiles set location_approx = st_setsrid(st_makepoint(9.2412, 4.1531), 4326)::geography where id = 'b0000000-0000-0000-0000-0000000000b6';
insert into public.notification_prefs (user_id, category, enabled) values ('b0000000-0000-0000-0000-0000000000b6', 'jobs', false);

-- ---- a request for a service, handed to the agent: 3 workers first, those who do the service before the closest
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.posts (id, author_id, kind, title, body, cat, urgent, data, location) values
  ('g1', auth.uid(), 'request', 'Leaking kitchen sink', 'Water under the sink', 'Plumber', false, '{"type": "place", "service": "Leak repair", "agent": "1"}',
   st_setsrid(st_makepoint(9.2410, 4.1530), 4326)::geography);
reset role;
select is((select count(*)::int from public.notifications where event_key = 'newjob:g1'), 3, 'an agent request starts with 3 workers, not everyone');
select is((select count(*)::int from public.notifications where event_key = 'newjob:g1' and recipient_id in ('b0000000-0000-0000-0000-0000000000b1', 'b0000000-0000-0000-0000-0000000000b2')), 2, 'the two who say they do this service are asked first, though they are further away');
select is((select count(*)::int from public.notifications where event_key = 'newjob:g1' and recipient_id = 'b0000000-0000-0000-0000-0000000000b3'), 1, 'then the closest');
select is((select count(*)::int from public.notifications where recipient_id = 'b0000000-0000-0000-0000-0000000000b6'), 0, 'someone who switched job alerts off is not counted as asked');

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b1"}';
select throws_ok($$ select public.agent_start('g1', 6000, 'today', false) $$, null, null, 'only the person who asked can hand their request to the agent');
select is(public.agent_tick('g1'), null, 'and nobody else can look at it');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(public.agent_start('g1', 6000, 'today', false) ->> 'state', 'asking', 'Hira hands it over: budget 6,000, today, ask me before booking');
select is((public.agent_tick('g1') ->> 'told')::int, 3, 'the agent knows 3 were asked');
select is((public.agent_left() ->> 'used')::int, 0, 'no free try is used before it brings an offer');

-- ---- prices come in. Above the budget: the worker is asked once, never below their own listed price
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b1"}';
insert into public.applications (post_id, price, when_text, msg) values ('g1', 'XAF 7,000', 'Today, now', 'I have the parts');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b2"}';
insert into public.applications (post_id, price, when_text, msg) values ('g1', 'XAF 9,000', 'Today', '');
reset role;
select is((select counter_state from public.applications where post_id = 'g1' and applicant_id = 'b0000000-0000-0000-0000-0000000000b1'), 'asked', 'Paul (7,000, lists this from 5,000) is asked if the budget works');
select is((select counter from public.applications where post_id = 'g1' and applicant_id = 'b0000000-0000-0000-0000-0000000000b1'), 6000, 'the question is the budget, not less');
select is((select count(*)::int from public.notifications where recipient_id = 'b0000000-0000-0000-0000-0000000000b1' and type = 'counter'), 1, 'Paul gets the question');
select is((select counter_state from public.applications where post_id = 'g1' and applicant_id = 'b0000000-0000-0000-0000-0000000000b2'), 'skip', 'Sam (lists this from 9,000) is not asked to go below his own price');
select is((select price from public.applications where post_id = 'g1' and applicant_id = 'b0000000-0000-0000-0000-0000000000b1'), 'XAF 7,000', 'nothing changes without Paul’s yes');

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b3"}';
insert into public.applications (post_id, price, when_text, msg) values ('g1', 'XAF 6,000', 'Tomorrow', '');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(public.agent_tick('g1') ->> 'state', 'asking', 'three offers are in, but it waits for Paul’s answer before deciding');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b2"}';
select throws_ok($$ select public.agent_answer((select id from public.applications where post_id = 'g1' and applicant_id = auth.uid()), true) $$, null, null, 'Sam was not asked, so he has nothing to answer');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b1"}';
select lives_ok($$ select public.agent_answer((select id from public.applications where post_id = 'g1' and applicant_id = auth.uid()), true) $$, 'Paul says yes');
reset role;
select is((select price from public.applications where post_id = 'g1' and applicant_id = 'b0000000-0000-0000-0000-0000000000b1'), 'XAF 6,000', 'his price is now the budget');
select is((select state from public.agent_runs where post_id = 'g1'), 'pick', 'everyone answered: the agent comes back with its pick');
select is((select applicant_id from public.applications where id = (select pick from public.agent_runs where post_id = 'g1')), 'b0000000-0000-0000-0000-0000000000b1'::uuid, 'Paul: within the budget and today (Mary is within budget but tomorrow, Sam is today but above it)');
select is((select count(*)::int from public.bookings where post_id = 'g1'), 0, 'nothing is booked: Hira asked to be asked first');
select is((select count(*)::int from public.notifications where recipient_id = 'a0000000-0000-0000-0000-0000000000a1' and type = 'agent'), 1, 'Hira is told');
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is((public.agent_left() ->> 'used')::int, 1, 'one free try is used now');
select is((select (o ->> 'fit')::boolean from jsonb_array_elements(public.agent_tick('g1') -> 'offers') o where o ->> 'name' = 'Mary T'), false, 'the screen knows Mary’s offer is not in time');
select ok((select (o ->> 'does_service')::boolean from jsonb_array_elements(public.agent_tick('g1') -> 'offers') o where o ->> 'name' = 'Paul N'), 'and that Paul lists this service');

-- ---- Hira books the pick; a request is booked once
select lives_ok($$ select public.accept_application((select pick from public.agent_runs where post_id = 'g1')) $$, 'Hira books Paul');
select throws_ok($$ select public.accept_application((select id from public.applications where post_id = 'g1' and applicant_id = 'b0000000-0000-0000-0000-0000000000b3')) $$, null, null, 'a second worker can’t be booked for the same request');
reset role;
select is((select service from public.bookings where post_id = 'g1'), 'Leak repair', 'the job carries the service it is for');
select is((select state from public.agent_runs where post_id = 'g1'), 'booked', 'and the agent is done');

-- ---- ratings: what they are for, and for which side of the job
update public.bookings set state = 'confirmed' where post_id = 'g1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.reviews (booking_id, reviewee_id, stars, body, what) values ((select id from public.bookings where post_id = 'g1'), 'b0000000-0000-0000-0000-0000000000b1', 5, 'Fast', 'Leaking kitchen sink');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b1"}';
insert into public.reviews (booking_id, reviewee_id, stars, body, what) values ((select id from public.bookings where post_id = 'g1'), 'a0000000-0000-0000-0000-0000000000a1', 2, 'Paid late', 'Leaking kitchen sink');
reset role;
select is((select service from public.reviews where reviewee_id = 'b0000000-0000-0000-0000-0000000000b1'), 'Leak repair', 'a rating is kept under the service of the job');
select ok((select as_worker from public.reviews where reviewee_id = 'b0000000-0000-0000-0000-0000000000b1'), 'Paul was rated as the worker');
select ok(not (select as_worker from public.reviews where reviewee_id = 'a0000000-0000-0000-0000-0000000000a1'), 'Hira was rated as the client');
select is((select rating from public.profile_stats where id = 'b0000000-0000-0000-0000-0000000000b1'), 5.0, 'Paul’s rating is what clients said about his work');
select is((select rating from public.profile_stats where id = 'a0000000-0000-0000-0000-0000000000a1'), null, 'Hira has no rating as a worker: the 2★ she got as a client is not mixed in');
select is((select client_rating from public.profile_cards where id = 'a0000000-0000-0000-0000-0000000000a1'), 2.0, 'it is kept apart, as her rating as a client');
select is((select reviews from public.profile_cards where id = 'a0000000-0000-0000-0000-0000000000a1'), 0, 'her profile card shows no worker reviews');
select is((select service from public.service_ratings('b0000000-0000-0000-0000-0000000000b1') limit 1), 'Leak repair', 'ratings per service: Leak repair');
select is((select rating from public.service_ratings('b0000000-0000-0000-0000-0000000000b1') where service = 'Leak repair'), 5.0, '5★');
select is((select jobs from public.service_ratings('b0000000-0000-0000-0000-0000000000b1') where service = 'Leak repair'), 1, 'from one job');
select is((select count(*)::int from public.service_ratings('b0000000-0000-0000-0000-0000000000b1') where service = 'Water heater'), 0, 'nothing is shown for a service he was never rated or booked for');

-- ---- "book it for me": only within the budget and in time, once the clock says so
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.posts (id, author_id, kind, title, cat, urgent, data, location) values
  ('g2', auth.uid(), 'request', 'Blocked drain', 'Plumber', true, '{"type": "place", "agent": "1"}', st_setsrid(st_makepoint(9.2410, 4.1530), 4326)::geography);
select is(public.agent_start('g2', 5000, 'now', true) ->> 'state', 'asking', 'a second request, with "book the best offer for me" on');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-0000000000b4"}';
insert into public.applications (post_id, price, when_text) values ('g2', 'XAF 4,000', 'Today, in 1 hour');
reset role;
select is((select state from public.agent_runs where post_id = 'g2'), 'asking', 'one offer of three asked: it waits a little for the others');
update public.applications set created_at = now() - interval '4 minutes' where post_id = 'g2';
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(public.agent_tick('g2') ->> 'state', 'booked', 'three minutes later (it was wanted now) it books the offer that is within budget and in time');
reset role;
select is((select worker_id from public.bookings where post_id = 'g2'), 'b0000000-0000-0000-0000-0000000000b4'::uuid, 'Tom is booked');
select is((select status from public.posts where id = 'g2'), 'booked', 'and the request is closed to others');

-- ---- nobody offers this: it asks again, then says so; the person can keep asking or take over
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.posts (id, author_id, kind, title, cat, data) values ('g3', auth.uid(), 'request', 'Sew a dress', 'Tailor', '{"type": "shop", "agent": "1"}');
select is((public.agent_start('g3', null, 'week', false) ->> 'told')::int, 0, 'no tailor nearby: nobody could be asked');
reset role;
update public.agent_runs set asked_at = now() - interval '5 minutes' where post_id = 'g3';
select private.agent_eval('g3');
update public.agent_runs set asked_at = now() - interval '5 minutes' where post_id = 'g3';
select private.agent_eval('g3');
select is((select round from public.agent_runs where post_id = 'g3'), 3, 'it tried three rounds');
update public.agent_runs set asked_at = now() - interval '7 minutes' where post_id = 'g3';
select private.agent_eval('g3');
select is((select state from public.agent_runs where post_id = 'g3'), 'nobody', 'then says nobody answered');
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(public.agent_more('g3') ->> 'state', 'asking', '"Keep asking" starts it again');
select is(public.agent_stop('g3') ->> 'state', 'stopped', '"I’ll choose myself" stops it');
select is((public.agent_left() ->> 'used')::int, 2, 'a request nobody answered did not use a free try');

-- ---- three free tries, then getit Pro
reset role;
update public.agent_runs set counted = true where post_id = 'g3';
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.posts (id, author_id, kind, title, cat, data) values ('g4', auth.uid(), 'request', 'Fix a tap', 'Plumber', '{"type": "place", "agent": "1"}');
select throws_ok($$ select public.agent_start('g4', null, 'today', false) $$, null, null, 'after three, the agent is for getit Pro');
reset role;
update public.profiles set pro_regular = true where id = 'a0000000-0000-0000-0000-0000000000a1';
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
select is(public.agent_start('g4', null, 'today', false) ->> 'state', 'asking', 'with Pro it starts');

select * from finish();
rollback;
