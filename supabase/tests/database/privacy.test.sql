-- Profile visibility and feedback.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.set_my_location(4.05, 9.7) $$, 'Ana shares her area');
select lives_ok($$ update public.profiles set visible = false where id = auth.uid() $$, 'Ana hides her profile from search');
select lives_ok($$ insert into public.feedback (topic, body, app_version) values ('problem', 'The map is slow on my phone', '1.0.0 (130)') $$, 'Ana sends feedback');
select throws_ok($$ insert into public.feedback (body) values ('hi') $$, null, null, 'feedback needs a real message');
select throws_ok($$ insert into public.feedback (user_id, body) values ('b0000000-0000-0000-0000-000000000002', 'pretending to be Ben') $$, null, null, 'feedback cannot be sent in someone else''s name');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.profile_cards where visible and id = 'a0000000-0000-0000-0000-000000000001'), 0, 'Ana is not in the people list');
select is((select name from public.profile_cards where id = 'a0000000-0000-0000-0000-000000000001'), 'Ana', 'someone who deals with Ana can still open her profile');
select ok((select lng is null and lat is null from public.profile_cards where id = 'a0000000-0000-0000-0000-000000000001'), 'a hidden profile shares no position');
select is((select count(*)::int from public.feedback), 0, 'Ben cannot read Ana''s feedback');

select * from finish();
rollback;
