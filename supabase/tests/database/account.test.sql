-- Push tokens, private location, account deletion and data export.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}');
insert into public.businesses (id, owner_id, client_id, name) values ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'biz1', 'Ben Build');

set local role authenticated;

-- ================================================================ push tokens
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.register_push_token('ExponentPushToken[phone-1]', 'android', '1.0.112') $$, 'Ana registers her phone for push');
select throws_ok($$ insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[x]', 'b0000000-0000-0000-0000-000000000002', 'android') $$, null, null, 'tokens cannot be written directly');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ select public.register_push_token('ExponentPushToken[phone-1]', 'android', '1.0.112') $$, 'Ben logs in on the same phone');
select is((select count(*)::int from public.push_tokens), 1, 'the phone now belongs to Ben');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.push_tokens), 0, 'Ana no longer gets Ben''s pushes');

-- ================================================================ location
select lives_ok($$ select public.set_my_location(4.15271, 9.24103) $$, 'Ana saves her location');
select throws_ok($$ select public.set_my_location(123, 9) $$, null, null, 'impossible coordinates are refused');
select ok((select location_approx is not null from public.profiles where id = auth.uid()), 'her public profile shows an area');
reset role;
select ok((select p.location_approx::text <> q.location::text from public.profiles p join public.profiles_private q using (id) where id = 'a0000000-0000-0000-0000-000000000001'), 'the public area is not her exact point');
set local role authenticated;

-- ================================================================ business verification
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select throws_ok($$ insert into public.verifications (kind, business_id) values ('business', 'e0000000-0000-0000-0000-000000000005') $$, null, null, 'Ana cannot ask to verify Ben''s business');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ insert into public.verifications (kind, business_id) values ('business', 'e0000000-0000-0000-0000-000000000005') $$, 'Ben asks to verify his business');
select throws_ok($$ insert into public.verifications (kind, business_id) values ('business', 'e0000000-0000-0000-0000-000000000005') $$, null, null, 'only one open request at a time');

-- ================================================================ export and deletion
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select public.export_my_data() -> 'profile' ->> 'name'), 'Ana', 'Ana downloads her data');
select lives_ok($$ select public.request_account_deletion() $$, 'Ana deletes her account');
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'), 0, 'her profile disappears for others at once');
set local role anon;
set local request.jwt.claims = '';
select throws_ok($$ select public.request_account_deletion() $$, null, null, 'signed-out visitors cannot delete anything');

select * from finish();
rollback;
