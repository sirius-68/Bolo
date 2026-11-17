-- Admin controls: dashboard numbers, feature switches (sign-ups, calls, posting) and blocked words.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'dora@test.bolo', '{"name": "Dora"}');
insert into public.admin_users (user_id, role) values ('a0000000-0000-0000-0000-000000000001', 'owner'), ('d0000000-0000-0000-0000-000000000004', 'moderator');
update public.profiles set city = 'Buea', skills = '{Plumber}' where id = 'b0000000-0000-0000-0000-000000000002';
update public.profiles set city = 'buea ' where id = 'c0000000-0000-0000-0000-000000000003';

set local role authenticated;
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
insert into public.posts (id, author_id, kind, body) values ('p1', auth.uid(), 'text', 'Fixed a leaking tap today');
insert into public.posts (id, author_id, kind, title, body) values ('j1', auth.uid(), 'request', 'Paint a wall', 'One wall, white');
select throws_ok($$ select public.admin_stats(30) $$, '42501', null, 'a member cannot read the dashboard numbers');

-- ---- dashboard numbers
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select is((public.admin_stats(30) ->> 'days')::int, 30, 'a period of 30 days');
select is(jsonb_array_length(public.admin_stats(30) -> 'series'), 30, 'one line per day');
select is(jsonb_array_length(public.admin_stats(1) -> 'series'), 7, 'at least a week');
select is((public.admin_stats(30) -> 'now' ->> 'signups')::int, 4, 'new accounts in the period');
select is((public.admin_stats(30) -> 'now' ->> 'jobs')::int, 1, 'jobs posted in the period');
select is((public.admin_stats(30) -> 'now' ->> 'posts')::int, 1, 'posts that are not jobs');
select is((public.admin_stats(30) -> 'now' ->> 'active')::int, 1, 'people who did something');
select is((public.admin_stats(30) -> 'series' -> -1 ->> 'jobs')::int, 1, 'today''s line counts today''s job');
select is((public.admin_stats(30) -> 'prev' ->> 'signups')::int, 0, 'the period before, for trends');
select is((public.admin_stats(30) -> 'types' ->> 'workers')::int, 1, 'people who offer work');
select is(public.admin_stats(30) -> 'cities' -> 0 ->> 'city', 'Buea', 'top city, however it was typed');
select is((public.admin_stats(30) -> 'cities' -> 0 ->> 'n')::int, 2, 'counted together');
select is((public.admin_stats(30) -> 'funnel' ->> 'profile')::int, 1, 'funnel: profiles filled in');
select is((public.admin_stats(30) -> 'funnel' ->> 'acted')::int, 1, 'funnel: did something');

-- ---- feature switches
select throws_ok($$ select public.admin_set_config('features', '{"calls": false}') $$, '42501', null, 'a moderator cannot pause parts of bolo');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.admin_set_config('features', '{"calls": false, "posting": false, "signups": false, "extra": "x"}') $$, 'the owner pauses calls, posting and sign-ups');
select is((select value from public.app_config where key = 'features'), '{"calls": false, "posting": false, "signups": false}'::jsonb, 'only the known switches are kept');
select lives_ok($$ insert into public.posts (id, author_id, kind, body) values ('p_admin', auth.uid(), 'text', 'Maintenance tonight') $$, 'admins can still post while posting is paused');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_like($$ insert into public.posts (id, author_id, kind, body) values ('p2', auth.uid(), 'text', 'another one') $$, '%paused%', 'a member cannot post while posting is paused');
select throws_like($$ insert into public.comments (post_id, body) values ('p1', 'nice') $$, '%paused%', 'nor comment');
select throws_like($$ select public.start_call(public.start_direct('c0000000-0000-0000-0000-000000000003'), 'voice') $$, '%paused%', 'calls are refused while paused');
reset role;
select throws_like($$ insert into auth.users (id, email) values ('e0000000-0000-0000-0000-000000000005', 'eve@test.bolo') $$, '%sign-ups are paused%', 'no new accounts while sign-ups are paused');
update public.app_config set value = '{"calls": true, "posting": true, "signups": true}' where key = 'features';
select lives_ok($$ insert into auth.users (id, email) values ('e0000000-0000-0000-0000-000000000005', 'eve@test.bolo') $$, 'sign-ups work again when switched back on');

-- ---- blocked words
set local role authenticated;
set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select throws_ok($$ select public.admin_set_blocked_words('{western union}') $$, '42501', null, 'a moderator cannot change the blocked words');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is(public.admin_set_blocked_words('{"Western Union", " upfront fee ", "x", "western union"}'), '["upfront fee", "western union"]'::jsonb, 'the owner saves the list: lower case, trimmed, no repeats, nothing too short');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select throws_like($$ insert into public.posts (id, author_id, kind, body) values ('p3', auth.uid(), 'text', 'Send the money by WESTERN UNION first') $$, '%not allowed%', 'a post with a blocked phrase is refused, in any case');
select throws_like($$ insert into public.comments (post_id, body) values ('p1', 'pay the upfront fee') $$, '%not allowed%', 'a comment too');
select lives_ok($$ insert into public.posts (id, author_id, kind, body) values ('p4', auth.uid(), 'text', 'Western food and unions of workers welcome') $$, 'only whole words count');
select throws_ok($$ select public.admin_blocked_words() $$, '42501', null, 'members cannot read the list');

select * from finish();
rollback;
