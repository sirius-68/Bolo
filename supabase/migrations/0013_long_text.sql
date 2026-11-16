-- Longer descriptions. A job or vacancy can carry a full pasted description (a page or two of text),
-- and internships, programs and mentorships can describe themselves properly.
-- Safe to run more than once.

alter table public.posts drop constraint if exists posts_text_len;
alter table public.posts add constraint posts_text_len
  check (char_length(coalesce(title, '')) <= 140 and char_length(coalesce(body, '')) <= 20000 and pg_column_size(data) <= 20000);

alter table public.opportunities drop constraint if exists opportunities_data_check;
alter table public.opportunities add constraint opportunities_data_check check (pg_column_size(data) <= 30000);
alter table public.mentorships drop constraint if exists mentorships_data_check;
alter table public.mentorships add constraint mentorships_data_check check (pg_column_size(data) <= 30000);
