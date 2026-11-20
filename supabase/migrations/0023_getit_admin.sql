-- getit · the admin panel follows the new app
--
-- The panel was built for bolo (posts, vacancies, businesses, career experts). getit is one thing: someone
-- asks for a worker, workers send a price, one is booked, the job is done and rated. The panel now shows that:
--   * admin_overview / admin_stats: workers, who is available, requests, offers, jobs, and how well requests
--     get answered (how many got a price, how many got booked, how long the first price took, which trades
--     people ask for and how many workers offer each).
--   * admin_requests: the requests people sent, with who was told and how many prices came back.
--   * admin_jobs: the bookings, with both people, the price and the stage.
--   * admin_people: filters for workers / available now / people hiring, with the trade and the rating.
--   * admin_person: the account's work side (trade, how they work, rating) and its latest jobs.
-- Only admins can call these. Message contents are never shown. Safe to run more than once.

set search_path = public, extensions;

-- ================================================================ dashboard
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return jsonb_build_object(
    'people', (select count(*) from profiles where deleted_at is null),
    'people_7d', (select count(*) from profiles where deleted_at is null and created_at > now() - interval '7 days'),
    'people_today', (select count(*) from profiles where deleted_at is null and created_at > now() - interval '1 day'),
    'workers', (select count(*) from profiles where deleted_at is null and coalesce(array_length(skills, 1), 0) > 0),
    'workers_open', (select count(*) from profiles where deleted_at is null and suspended_at is null and coalesce(visible, true)
                       and coalesce(array_length(skills, 1), 0) > 0 and coalesce(work_status, 'open') <> 'off'),
    'jobs_open', (select count(*) from posts where kind = 'request' and business_id is null and status = 'open'),
    -- open for more than 30 minutes and nobody has sent a price
    'unanswered', (select count(*) from posts p where p.kind = 'request' and p.business_id is null and p.status = 'open'
                     and p.created_at < now() - interval '30 minutes'
                     and not exists (select 1 from applications a where a.post_id = p.id)),
    'jobs_live', (select count(*) from bookings where state in ('booked', 'onway', 'working', 'done')),
    'bookings', (select count(*) from bookings),
    'bookings_done', (select count(*) from bookings where state = 'confirmed'),
    'messages_7d', (select count(*) from messages where created_at > now() - interval '7 days'),
    'calls_7d', (select count(*) from calls where created_at > now() - interval '7 days'),
    'suspended', (select count(*) from profiles where suspended_at is not null and deleted_at is null),
    -- kept for older copies of the panel
    'businesses', 0,
    'posts', (select count(*) from posts where kind = 'request'),
    'queue', jsonb_build_object(
      'id_checks', (select count(*) from verifications where status = 'pending'),
      'reports', (select count(*) from reports where status in ('open', 'reviewing')),
      'feedback', (select count(*) from feedback where status = 'open'),
      'business_checks', 0,
      'experts', 0
    ),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', n) order by d), '[]')
                from (select g.d, (select count(*) from profiles p where p.created_at >= g.d and p.created_at < g.d + interval '1 day') as n
                      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as g(d)) t)
  );
end $$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_stats(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 7), 180);
  t0 timestamptz := date_trunc('day', now()) - make_interval(days => v_days - 1);   -- first day of this period
  p0 timestamptz := t0 - make_interval(days => v_days);                             -- first day of the period before
  r jsonb;
begin
  perform private.need_admin();
  with days as (
    select g.d from generate_series(t0, date_trunc('day', now()), interval '1 day') as g(d)
  ),
  req as (   -- requests for a worker (not the old business vacancies)
    select id, author_id, cat, created_at from posts where kind = 'request' and business_id is null and created_at >= p0
  ),
  acts as (   -- who did something, and when: asked, wrote, sent a price, booked
    select author_id as u, created_at as ts from req
    union all select sender_id, created_at from messages where created_at >= p0 and sender_id is not null
    union all select applicant_id, created_at from applications where created_at >= p0
    union all select client_id, created_at from bookings where created_at >= p0
  ),
  series as (
    select d.d::date as day,
      (select count(*) from profiles p where p.created_at >= d.d and p.created_at < d.d + interval '1 day' and p.deleted_at is null)::int as signups,
      (select count(distinct a.u) from acts a where a.ts >= d.d and a.ts < d.d + interval '1 day')::int as active,
      (select count(*) from req x where x.created_at >= d.d and x.created_at < d.d + interval '1 day')::int as jobs,
      (select count(*) from applications x where x.created_at >= d.d and x.created_at < d.d + interval '1 day')::int as offers,
      (select count(*) from bookings b where b.created_at >= d.d and b.created_at < d.d + interval '1 day')::int as bookings,
      (select count(*) from messages m where m.created_at >= d.d and m.created_at < d.d + interval '1 day')::int as messages,
      0 as posts
    from days d
  ),
  tot as (
    select jsonb_build_object(
      'signups', (select count(*) from profiles where created_at >= v.a and created_at < v.b and deleted_at is null),
      'active', (select count(distinct x.u) from acts x where x.ts >= v.a and x.ts < v.b),
      'jobs', (select count(*) from req where created_at >= v.a and created_at < v.b),
      'offers', (select count(*) from applications where created_at >= v.a and created_at < v.b),
      'bookings', (select count(*) from bookings where created_at >= v.a and created_at < v.b),
      'done', (select count(*) from bookings where state = 'confirmed' and updated_at >= v.a and updated_at < v.b),
      'paid', (select coalesce(sum(amount), 0) from bookings where state = 'confirmed' and updated_at >= v.a and updated_at < v.b),
      'messages', (select count(*) from messages where created_at >= v.a and created_at < v.b),
      'calls', (select count(*) from calls where created_at >= v.a and created_at < v.b),
      'reports', (select count(*) from reports where created_at >= v.a and created_at < v.b),
      'posts', 0) as j, k
    from (values (t0, now() + interval '1 second', 'now'), (p0, t0, 'prev')) v(a, b, k)
  ),
  cohort as (select id from profiles where created_at >= t0 and deleted_at is null),
  mine as (   -- this period's requests, each with its first price and whether it was booked
    select q.id, q.cat, q.created_at,
           (select min(a.created_at) from applications a where a.post_id = q.id) as first_offer,
           exists (select 1 from bookings b where b.post_id = q.id and b.state <> 'cancelled') as booked
    from req q where q.created_at >= t0
  )
  select jsonb_build_object(
    'days', v_days,
    'series', (select coalesce(jsonb_agg(to_jsonb(s) order by s.day), '[]') from series s),
    'now', (select j from tot where k = 'now'),
    'prev', (select j from tot where k = 'prev'),
    'types', jsonb_build_object(
      'workers', (select count(*) from profiles where deleted_at is null and coalesce(array_length(skills, 1), 0) > 0),
      'hirers', (select count(*) from profiles where deleted_at is null and coalesce(array_length(skills, 1), 0) = 0),
      'business_accounts', 0,
      'businesses', 0),
    -- how well requests get answered
    'match', jsonb_build_object(
      'requests', (select count(*) from mine),
      'answered', (select count(*) from mine where first_offer is not null),
      'booked', (select count(*) from mine where booked),
      'first_offer_min', (select round((percentile_cont(0.5) within group (order by extract(epoch from first_offer - created_at) / 60))::numeric)
                            from mine where first_offer is not null)),
    -- what people ask for, next to how many workers offer it
    'trades', (select coalesce(jsonb_agg(t), '[]') from (
        select m.cat as trade, count(*)::int as asked, count(*) filter (where m.first_offer is not null)::int as answered,
               count(*) filter (where m.booked)::int as booked,
               (select count(*) from profiles p where p.deleted_at is null and p.suspended_at is null and p.skills @> array[m.cat])::int as workers
        from mine m where coalesce(m.cat, '') <> '' group by m.cat order by asked desc, m.cat limit 8) t),
    'supply', (select coalesce(jsonb_agg(t), '[]') from (
        select s as trade, count(*)::int as workers
        from profiles p, unnest(p.skills) s where p.deleted_at is null and p.suspended_at is null group by s order by workers desc, s limit 8) t),
    'cities', (select coalesce(jsonb_agg(c), '[]') from (
        select initcap(trim(city)) as city, count(*)::int as n from profiles
         where deleted_at is null and coalesce(trim(city), '') <> '' group by initcap(trim(city)) order by n desc, city limit 6) c),
    'funnel', jsonb_build_object(
      'signed_up', (select count(*) from cohort),
      'profile', (select count(*) from profiles p join cohort c on c.id = p.id
                   where coalesce(trim(p.city), '') <> '' and (coalesce(array_length(p.skills, 1), 0) > 0 or coalesce(p.bio, '') <> '')),
      'verified', (select count(*) from profiles p join cohort c on c.id = p.id where p.verified),
      'acted', (select count(*) from cohort c where exists (select 1 from acts a where a.u = c.id)),
      'booked', (select count(*) from cohort c where exists (select 1 from bookings b where c.id in (b.worker_id, b.client_id)))),
    'bookings_by_state', (select coalesce(jsonb_object_agg(state, n), '{}') from (select state, count(*)::int as n from bookings group by state) b)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;

-- ================================================================ requests (someone asked for a worker)
/** The newest requests. p_status: open · unanswered (open 30+ minutes, no price yet) · booked · closed · all. */
create or replace function public.admin_requests(p_status text default 'open', p_query text default null, p_limit int default 80)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare q text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform private.need_admin();
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]') from (
      select p.id, p.title, left(p.body, 400) as body, p.cat as trade, p.area, p.data ->> 'type' as place, p.data ->> 'when' as "when",
             p.urgent, p.status, p.created_at, p.author_id, nullif(pr.name, '') as author, pr.city,
             coalesce(array_length(p.photos, 1), 0) as photos,
             (select count(*) from applications a where a.post_id = p.id) as offers,
             (select min(a.created_at) from applications a where a.post_id = p.id) as first_offer_at,
             (select count(*) from notifications n where n.event_key = 'newjob:' || p.id) as told,
             (select b.state from bookings b where b.post_id = p.id order by b.created_at desc limit 1) as booking,
             (select count(*) from reports r where r.target_type in ('post', 'job') and r.target_id = p.id) as reports
      from posts p left join profiles pr on pr.id = p.author_id
      where p.kind = 'request' and p.business_id is null
        and (q is null or p.title ilike '%' || q || '%' or p.body ilike '%' || q || '%' or p.cat ilike '%' || q || '%' or p.area ilike '%' || q || '%' or pr.name ilike '%' || q || '%')
        and case p_status
              when 'open' then p.status = 'open'
              when 'unanswered' then p.status = 'open' and p.created_at < now() - interval '30 minutes'
                                     and not exists (select 1 from applications a where a.post_id = p.id)
              when 'booked' then p.status = 'booked'
              when 'closed' then p.status = 'closed'
              else true end
      order by p.created_at desc
      limit least(greatest(coalesce(p_limit, 80), 1), 200)
    ) t
  );
end $$;
revoke all on function public.admin_requests(text, text, int) from public, anon;
grant execute on function public.admin_requests(text, text, int) to authenticated;

/** The prices sent for one request (who, how much, when they can come). */
create or replace function public.admin_request_offers(p_post text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]') from (
      select a.id, a.applicant_id as worker_id, nullif(pr.name, '') as worker, a.price, a.when_text, left(a.msg, 300) as note, a.stage, a.created_at
      from applications a left join profiles pr on pr.id = a.applicant_id
      where a.post_id = p_post order by a.created_at
    ) t
  );
end $$;
revoke all on function public.admin_request_offers(text) from public, anon;
grant execute on function public.admin_request_offers(text) to authenticated;

-- ================================================================ jobs (bookings)
/** The newest jobs. p_state: live (booked, on the way, working, waiting to be confirmed) · done · cancelled · all. */
create or replace function public.admin_jobs(p_state text default 'live', p_query text default null, p_limit int default 80)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare q text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform private.need_admin();
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]') from (
      select b.id, b.title, b.state, b.price, b.amount, b.when_text, b.area, b.created_at, b.updated_at, b.log, b.post_id,
             b.worker_id, nullif(w.name, '') as worker, b.client_id, nullif(c.name, '') as client,
             case when b.cancelled_by = b.worker_id then 'worker' when b.cancelled_by = b.client_id then 'client' end as cancelled_by,
             (select jsonb_agg(jsonb_build_object('by', case when r.reviewer_id = b.client_id then 'client' else 'worker' end, 'stars', r.stars, 'body', left(r.body, 200)))
                from reviews r where r.booking_id = b.id) as reviews
      from bookings b left join profiles w on w.id = b.worker_id left join profiles c on c.id = b.client_id
      where (q is null or b.title ilike '%' || q || '%' or w.name ilike '%' || q || '%' or c.name ilike '%' || q || '%' or b.area ilike '%' || q || '%')
        and case p_state
              when 'live' then b.state in ('booked', 'onway', 'working', 'done')
              when 'done' then b.state = 'confirmed'
              when 'cancelled' then b.state = 'cancelled'
              else true end
      order by b.updated_at desc
      limit least(greatest(coalesce(p_limit, 80), 1), 200)
    ) t
  );
end $$;
revoke all on function public.admin_jobs(text, text, int) from public, anon;
grant execute on function public.admin_jobs(text, text, int) to authenticated;

-- ================================================================ people
create or replace function public.admin_people(p_query text default null, p_filter text default 'all', p_limit int default 50, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare q text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform private.need_admin();
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]') from (
      select p.id, p.name, u.email, u.phone, p.city, p.skills, p.verified, p.visible, p.biz_only, p.work_status,
             p.suspended_at, p.deleted_at, p.created_at, u.last_sign_in_at,
             (u.email_confirmed_at is not null or u.phone_confirmed_at is not null) as confirmed,
             s.rating, coalesce(s.reviews, 0) as reviews, coalesce(s.jobs_done, 0) as jobs_done,
             (select count(*) from posts where author_id = p.id and kind = 'request') as posts,
             (select count(*) from applications where applicant_id = p.id) as offers,
             (select count(*) from reports r where r.target_type = 'profile' and r.target_id = p.id::text) as reports
      from profiles p join auth.users u on u.id = p.id left join profile_stats s on s.id = p.id
      where (q is null or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%' or u.phone ilike '%' || q || '%' or p.city ilike '%' || q || '%'
             or p.id::text = q or exists (select 1 from unnest(p.skills) k where k ilike '%' || q || '%'))
        and case p_filter when 'suspended' then p.suspended_at is not null
                          when 'verified' then p.verified
                          when 'reported' then exists (select 1 from reports r where r.target_type = 'profile' and r.target_id = p.id::text)
                          when 'deleted' then p.deleted_at is not null
                          when 'workers' then p.deleted_at is null and coalesce(array_length(p.skills, 1), 0) > 0
                          when 'available' then p.deleted_at is null and p.suspended_at is null and coalesce(p.visible, true)
                                                and coalesce(array_length(p.skills, 1), 0) > 0 and coalesce(p.work_status, 'open') <> 'off'
                          when 'hirers' then p.deleted_at is null and coalesce(array_length(p.skills, 1), 0) = 0
                          else p.deleted_at is null end
      order by p.created_at desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
    ) t
  );
end $$;
revoke all on function public.admin_people(text, text, int, int) from public, anon;
grant execute on function public.admin_people(text, text, int, int) to authenticated;

/** One person, with what a reviewer needs to decide. Message contents are never shown. */
create or replace function public.admin_person(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return (
    select jsonb_build_object(
      'profile', to_jsonb(p) - 'location' - 'location_approx',
      'email', u.email, 'phone', u.phone, 'confirmed', u.email_confirmed_at is not null or u.phone_confirmed_at is not null,
      'last_sign_in_at', u.last_sign_in_at,
      'stats', (select jsonb_build_object('rating', s.rating, 'reviews', coalesce(s.reviews, 0), 'jobs_done', coalesce(s.jobs_done, 0), 'hires', coalesce(s.hires, 0))
                  from profile_stats s where s.id = p.id),
      'businesses', '[]'::jsonb,
      'counts', jsonb_build_object(
        'posts', (select count(*) from posts where author_id = p.id and kind = 'request'),
        'offers', (select count(*) from applications where applicant_id = p.id),
        'bookings', (select count(*) from bookings where worker_id = p.id or client_id = p.id),
        'cancelled', (select count(*) from bookings where cancelled_by = p.id),
        'messages', (select count(*) from messages where sender_id = p.id),
        'reviews', (select count(*) from reviews where reviewee_id = p.id),
        'blocked_by', (select count(*) from blocks where blocked_id = p.id)),
      'posts', (select coalesce(jsonb_agg(x), '[]') from (select id, kind, title, left(body, 200) as body, status, created_at from posts where author_id = p.id and kind = 'request' order by created_at desc limit 10) x),
      'jobs', (select coalesce(jsonb_agg(x), '[]') from (
          select b.id, b.title, b.state, b.price, b.updated_at, case when b.worker_id = p.id then 'worker' else 'client' end as side,
                 nullif((select name from profiles o where o.id = case when b.worker_id = p.id then b.client_id else b.worker_id end), '') as other
          from bookings b where p.id in (b.worker_id, b.client_id) order by b.updated_at desc limit 10) x),
      'reviews', (select coalesce(jsonb_agg(x), '[]') from (
          select r.stars, left(r.body, 200) as body, r.tags, r.created_at, nullif((select name from profiles o where o.id = r.reviewer_id), '') as "from"
          from reviews r where r.reviewee_id = p.id order by r.created_at desc limit 10) x),
      'reports', (select coalesce(jsonb_agg(x), '[]') from (
          select r.id, r.target_type, r.reason, r.details, r.status, r.created_at from reports r
          where (r.target_type = 'profile' and r.target_id = p.id::text)
             or (r.target_type in ('post', 'job') and r.target_id in (select id from posts where author_id = p.id))
          order by r.created_at desc limit 20) x),
      'verifications', (select coalesce(jsonb_agg(x), '[]') from (select id, kind, status, note, created_at from verifications where user_id = p.id order by created_at desc limit 10) x),
      'history', (select coalesce(jsonb_agg(x), '[]') from (select action, data, created_at from audit_log where target_id = p.id::text order by created_at desc limit 20) x)
    )
    from profiles p join auth.users u on u.id = p.id where p.id = p_user
  );
end $$;
revoke all on function public.admin_person(uuid) from public, anon;
grant execute on function public.admin_person(uuid) to authenticated;

-- ================================================================ removing a request
-- The notice now says "request" for a request (it said "post").
create or replace function public.admin_remove_content(p_type text, p_id text, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare owner uuid; label text; biz uuid; k text;
begin
  perform private.need_admin();
  if p_type in ('post', 'job') then
    delete from posts where id = p_id returning author_id, coalesce(nullif(title, ''), left(body, 60)), business_id, kind into owner, label, biz, k;
  elsif p_type = 'comment' then
    delete from comments where id::text = p_id returning author_id, left(body, 60) into owner, label;
  elsif p_type = 'course' then
    delete from course_listings where id = p_id returning owner_id, title, business_id into owner, label, biz;
  elsif p_type = 'opp' then
    delete from opportunities where id::text = p_id returning owner_id, title, business_id into owner, label, biz;
  elsif p_type = 'mentor' then
    delete from mentorships where id = p_id returning owner_id, title, business_id into owner, label, biz;
  else
    raise exception 'this kind of content cannot be removed here';
  end if;
  if not found then raise exception 'it is already gone'; end if;
  update reports set status = 'actioned', handled_by = auth.uid(), handled_at = now()
   where target_type in (p_type, case when p_type in ('post', 'job') then 'post' end, case when p_type in ('post', 'job') then 'job' end)
     and target_id = p_id and status in ('open', 'reviewing');
  perform bolo_audit('content.remove', p_type, p_id, jsonb_build_object('note', p_note, 'owner', owner, 'label', label));
  perform private.notice(owner,
    'We removed your ' || case when k = 'request' then 'request' when p_type = 'comment' then 'comment' when p_type = 'course' then 'course listing'
                               when p_type = 'opp' then 'listing' when p_type = 'mentor' then 'mentorship' else 'post' end
      || ' “' || coalesce(label, '') || '” because it breaks getit’s rules' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '.',
    jsonb_build_object('k', 'me'), 'removed:' || p_type || ':' || p_id, biz);
end $$;
revoke all on function public.admin_remove_content(text, text, text) from public, anon;
grant execute on function public.admin_remove_content(text, text, text) to authenticated;
