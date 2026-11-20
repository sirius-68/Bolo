-- A new request reaches the workers who fit, and only them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-0000000000a1', 'hira@test.getit', '{"name": "Hira"}'),
  ('b0000000-0000-0000-0000-0000000000b2', 'paul@test.getit', '{"name": "Paul"}'),
  ('c0000000-0000-0000-0000-0000000000c3', 'rest@test.getit', '{"name": "Rest"}'),
  ('d0000000-0000-0000-0000-0000000000d4', 'tess@test.getit', '{"name": "Tess"}'),
  ('e0000000-0000-0000-0000-0000000000e5', 'bloc@test.getit', '{"name": "Bloc"}');
-- Paul is an available plumber; Rest is a plumber who paused; Tess is a tailor; Bloc is a plumber Hira blocked
update public.profiles set skills = '{Plumber}', work_status = 'open' where id = 'b0000000-0000-0000-0000-0000000000b2';
update public.profiles set skills = '{Plumber}', work_status = 'off' where id = 'c0000000-0000-0000-0000-0000000000c3';
update public.profiles set skills = '{Tailor}', work_status = 'open' where id = 'd0000000-0000-0000-0000-0000000000d4';
update public.profiles set skills = '{Plumber}', work_status = 'open' where id = 'e0000000-0000-0000-0000-0000000000e5';
insert into public.blocks (blocker_id, blocked_id) values ('a0000000-0000-0000-0000-0000000000a1', 'e0000000-0000-0000-0000-0000000000e5');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.posts (id, author_id, kind, title, body, cat, urgent) values ('r1', auth.uid(), 'request', 'Leaking kitchen sink', 'Water under the sink', 'Plumber', true);
reset role;

select is((select count(*)::int from public.notifications where event_key = 'newjob:r1'), 1, 'one worker is told about the request');
select is((select recipient_id from public.notifications where event_key = 'newjob:r1'), 'b0000000-0000-0000-0000-0000000000b2'::uuid, 'the available plumber');
select is((select target ->> 'id' from public.notifications where event_key = 'newjob:r1'), 'r1', 'and the notification opens the job');
select ok((select body like '%as soon as possible%' from public.notifications where event_key = 'newjob:r1'), 'an urgent request says so');
select is((select count(*)::int from public.notifications where recipient_id = 'c0000000-0000-0000-0000-0000000000c3'), 0, 'a paused worker is left alone');
select is((select count(*)::int from public.notifications where recipient_id = 'e0000000-0000-0000-0000-0000000000e5'), 0, 'so is someone the person blocked');

-- an ordinary post (not a request) tells nobody
set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-0000000000a1"}';
insert into public.posts (id, author_id, kind, body, cat) values ('p9', auth.uid(), 'text', 'Hello', 'Plumber');
reset role;
select is((select count(*)::int from public.notifications where event_key = 'newjob:p9'), 0, 'only requests are sent to workers');

select * from finish();
rollback;
