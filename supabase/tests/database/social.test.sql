-- Comments with replies and likes, delivered marks, last seen, and the notice when a job is edited.
-- People: Ana (posts), Ben, Carl, Dee.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'ana@test.bolo', '{"name": "Ana"}'),
  ('b0000000-0000-0000-0000-000000000002', 'ben@test.bolo', '{"name": "Ben"}'),
  ('c0000000-0000-0000-0000-000000000003', 'carl@test.bolo', '{"name": "Carl"}'),
  ('d0000000-0000-0000-0000-000000000004', 'dee@test.bolo', '{"name": "Dee"}');

set local role authenticated;

-- ================================================================ comments, replies, likes
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ insert into public.posts (id, author_id, kind, body) values ('p1', auth.uid(), 'text', 'Finished a new kitchen today') $$, 'Ana shares a post');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select lives_ok($$ insert into public.comments (id, post_id, body) values ('11111111-0000-0000-0000-000000000001', 'p1', 'Clean work') $$, 'Ben comments');

set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ insert into public.comments (id, post_id, body, parent_id) values ('11111111-0000-0000-0000-000000000002', 'p1', '@Ben agreed', '11111111-0000-0000-0000-000000000001') $$, 'Carl replies to Ben');
select is((select reply_to from public.comments where id = '11111111-0000-0000-0000-000000000002'), 'b0000000-0000-0000-0000-000000000002'::uuid, 'the reply knows who it answers');
select throws_ok($$ insert into public.comments (post_id, body, parent_id) values ('p1', 'lost', '99999999-0000-0000-0000-000000000009') $$, null, null, 'no reply to a comment that is not there');

set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select lives_ok($$ insert into public.comments (id, post_id, body, parent_id) values ('11111111-0000-0000-0000-000000000003', 'p1', '@Carl same here', '11111111-0000-0000-0000-000000000002') $$, 'Dee replies to Carl''s reply');
select is((select parent_id from public.comments where id = '11111111-0000-0000-0000-000000000003'), '11111111-0000-0000-0000-000000000001'::uuid, 'a reply to a reply joins the same thread');
select is((select reply_to from public.comments where id = '11111111-0000-0000-0000-000000000003'), 'c0000000-0000-0000-0000-000000000003'::uuid, 'and still answers Carl');
select lives_ok($$ insert into public.comment_likes (comment_id) values ('11111111-0000-0000-0000-000000000001') $$, 'Dee likes Ben''s comment');
select throws_ok($$ insert into public.comment_likes (comment_id) values ('11111111-0000-0000-0000-000000000001') $$, null, null, 'one like per person');
select throws_ok($$ insert into public.comment_likes (comment_id, user_id) values ('11111111-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001') $$, null, null, 'nobody likes in someone else''s name');
select is((select likes from public.comment_feed where id = '11111111-0000-0000-0000-000000000001'), 1, 'the comment shows one like');
select is((select liked from public.comment_feed where id = '11111111-0000-0000-0000-000000000001'), true, 'Dee sees that she liked it');
delete from public.comments where id = '11111111-0000-0000-0000-000000000001';
select is((select count(*)::int from public.comments where id = '11111111-0000-0000-0000-000000000001'), 1, 'Dee cannot delete Ben''s comment');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select is((select liked from public.comment_feed where id = '11111111-0000-0000-0000-000000000001'), false, 'Ben did not like his own comment');
select is((select count(*)::int from public.notifications where body like 'replied to your comment%'), 1, 'Ben is told about the reply');
select is((select count(*)::int from public.notifications where body like 'liked your comment%'), 1, 'and about the like');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.notifications where type = 'comment'), 3, 'Ana hears about each comment and reply on her post');
select lives_ok($$ delete from public.comments where id = '11111111-0000-0000-0000-000000000002' $$, 'Ana removes a reply under her own post');
select is((select count(*)::int from public.comments where post_id = 'p1'), 2, 'only that reply is gone');

-- ================================================================ delivered and last seen
set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
select public.start_direct('a0000000-0000-0000-0000-000000000001');
select lives_ok($$ insert into public.messages (conversation_id, body) values ((select public.start_direct('a0000000-0000-0000-0000-000000000001')), 'Hello Ana') $$, 'Ben writes to Ana');
select lives_ok($$ select public.seen_now() $$, 'Ben''s app says he is here');

set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select lives_ok($$ select public.mark_delivered() $$, 'Ana''s phone receives it');
select is((select count(*)::int from public.conversation_members where user_id = auth.uid() and delivered_at is not null), 1, 'the chat is marked delivered to Ana');
select is((select count(*)::int from public.seen_of(array['b0000000-0000-0000-0000-000000000002'::uuid])), 1, 'Ana sees when Ben was last here');

set local request.jwt.claims = '{"sub": "d0000000-0000-0000-0000-000000000004"}';
select is((select count(*)::int from public.seen_of(array['b0000000-0000-0000-0000-000000000002'::uuid])), 0, 'Dee, who has no chat with Ben, does not');

set local request.jwt.claims = '{"sub": "b0000000-0000-0000-0000-000000000002"}';
update public.profiles set show_seen = false where id = auth.uid();
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
select is((select count(*)::int from public.seen_of(array['b0000000-0000-0000-0000-000000000002'::uuid])), 0, 'nor does Ana once Ben hides it');

-- ================================================================ an edited job tells the people who applied
select lives_ok($$ insert into public.posts (id, author_id, kind, title, cat) values ('job5', auth.uid(), 'request', 'Paint a room', 'Painter') $$, 'Ana posts a job');
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select lives_ok($$ insert into public.applications (post_id, price) values ('job5', 'XAF 20,000') $$, 'Carl sends an offer');
set local request.jwt.claims = '{"sub": "a0000000-0000-0000-0000-000000000001"}';
update public.posts set title = 'Paint two rooms' where id = 'job5';
update public.posts set urgent = true where id = 'job5';
set local request.jwt.claims = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
select is((select count(*)::int from public.notifications where event_key = 'edit:job5'), 1, 'Carl is told once that the job changed');

select * from finish();
rollback;
