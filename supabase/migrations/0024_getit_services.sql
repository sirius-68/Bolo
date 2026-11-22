-- getit · a skill, and the services under it
--
-- A worker has one main skill (Electrician). Under it are the services they do (House wiring, Sockets and
-- switches…). A request can name a service; workers who say they do that service are asked first; and ratings
-- are kept per service, so a number never hides what kind of job it was earned on.
--
-- 1. bookings.service: the service the job was for (from the request, or from the offer made in chat).
-- 2. reviews.service and reviews.as_worker: what the rating is for, and whether the person rated was the worker
--    or the client of that job. Both are copied from the booking by the server, never taken from the app.
-- 3. A worker's rating now only counts what clients said about their WORK. Until now it also averaged in what
--    workers said about them as a client, so someone who hires a lot looked like a better (or worse) worker
--    than they are. The rating as a client is kept apart (client_rating).
-- 4. service_ratings(user): the rating, number of ratings and jobs done, per service.
-- 5. Who is asked about a request: one list (private.getit_fit_workers) used by the trigger and by the agent;
--    workers who offer the request's service come first, then the closest.
-- Safe to run more than once.

set search_path = public, extensions;

-- ================================================================ 1. the service a job is for
alter table public.bookings add column if not exists service text;
do $$ begin
  alter table public.bookings add constraint bookings_service_len check (service is null or char_length(service) between 2 and 60);
exception when duplicate_object then null; end $$;

create or replace function public.booking_service() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.service is null and new.post_id is not null then
    select nullif(left(trim(p.data ->> 'service'), 60), '') into new.service from posts p where p.id = new.post_id;
  end if;
  if new.service is not null and char_length(new.service) < 2 then new.service := null; end if;
  return new;
end $$;
drop trigger if exists bookings_service on public.bookings;
create trigger bookings_service before insert on public.bookings for each row execute function public.booking_service();

-- old jobs: the service of their request, when it had one
update public.bookings b set service = nullif(left(trim(p.data ->> 'service'), 60), '')
  from public.posts p where p.id = b.post_id and b.service is null and char_length(trim(coalesce(p.data ->> 'service', ''))) >= 2;

/** Answer a quote or hire request sent in chat. Accepting books the job (with the service named in the quote). */
create or replace function public.answer_offer(p_message uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare m messages; c conversations; w uuid; cl uuid; biz uuid; bid uuid; dest geography; svc text;
begin
  select * into m from messages where id = p_message for update;
  if not found or m.kind <> 'offer' then raise exception 'offer not found'; end if;
  if not is_member(m.conversation_id) or m.sender_id = auth.uid() then raise exception 'only the other person can answer this'; end if;
  if m.data ? 'state' then raise exception 'this offer was already answered'; end if;
  select * into c from conversations where id = m.conversation_id;
  if not p_accept then
    update messages set data = data || '{"state": "dec"}' where id = m.id;
    return null;
  end if;
  -- data.worker = 'sender' (a quote from the worker) or 'recipient' (a hire request from the client)
  if coalesce(m.data->>'worker', 'sender') = 'sender' then w := m.sender_id; cl := auth.uid(); else w := auth.uid(); cl := m.sender_id; end if;
  biz := case when c.business_id is not null and exists (select 1 from businesses b where b.id = c.business_id and b.owner_id = cl) then c.business_id end;
  if (m.data ? 'lng') and (m.data ? 'lat') and cl = m.sender_id then
    dest := st_setsrid(st_makepoint((m.data->>'lng')::float8, (m.data->>'lat')::float8), 4326)::geography;
  end if;
  bid := make_booking(w, cl, biz, m.data->>'job', m.data->>'when', m.data->>'price', coalesce(m.data->>'area', ''), null, null, m.conversation_id, dest);
  svc := nullif(left(trim(coalesce(m.data->>'service', '')), 60), '');
  if svc is not null and char_length(svc) >= 2 then update bookings set service = svc where id = bid; end if;
  update messages set data = data || jsonb_build_object('state', 'acc', 'booking', bid) where id = m.id;
  return bid;
end $$;
revoke all on function public.answer_offer(uuid, boolean) from public, anon;
grant execute on function public.answer_offer(uuid, boolean) to authenticated;

-- ================================================================ 2. what a rating is for
alter table public.reviews add column if not exists service text;
alter table public.reviews add column if not exists as_worker boolean not null default true;

create or replace function public.review_context() returns trigger language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = new.booking_id;
  if found then
    new.service := b.service;
    new.as_worker := (b.worker_id = new.reviewee_id);
  else
    new.service := null;
  end if;
  return new;
end $$;
drop trigger if exists reviews_context on public.reviews;
create trigger reviews_context before insert on public.reviews for each row execute function public.review_context();

update public.reviews r set as_worker = (b.worker_id = r.reviewee_id), service = b.service
  from public.bookings b where b.id = r.booking_id and (r.as_worker is distinct from (b.worker_id = r.reviewee_id) or r.service is distinct from b.service);
create index if not exists reviews_worker on public.reviews(reviewee_id) where as_worker;

-- ================================================================ 3. the numbers on a profile
-- rating / reviews: about their work only. client_rating / client_reviews: what workers said about them as a client.
create or replace view public.profile_stats as
  select p.id,
         (select count(*)::int from public.follows f where f.followee_id = p.id) as followers,
         (select count(*)::int from public.follows f where f.follower_id = p.id) as following,
         (select count(*)::int from public.bookings b where b.worker_id = p.id and b.state = 'confirmed') as jobs_done,
         (select count(*)::int from public.bookings b where b.client_id = p.id and b.state = 'confirmed') as hires,
         (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.reviewee_id = p.id and r.as_worker) as rating,
         (select count(*)::int from public.reviews r where r.reviewee_id = p.id and r.as_worker) as reviews,
         (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.reviewee_id = p.id and not r.as_worker) as client_rating,
         (select count(*)::int from public.reviews r where r.reviewee_id = p.id and not r.as_worker) as client_reviews
  from public.profiles p where p.deleted_at is null;

create or replace view public.profile_cards with (security_invoker = true) as
  select p.id, p.name, p.avatar_url, p.city, p.bio, p.role, p.biz_only, p.intents, p.skills, p.skill_list, p.level, p.years,
         p.work_status, p.hire_status, p.area, p.experience, p.education, p.languages, p.services, p.verified, p.availability, p.created_at,
         case when p.visible then st_x(p.location_approx::geometry) end as lng, case when p.visible then st_y(p.location_approx::geometry) end as lat,
         coalesce(s.followers, 0) as followers, coalesce(s.following, 0) as following, coalesce(s.jobs_done, 0) as jobs_done,
         coalesce(s.hires, 0) as hires, s.rating, coalesce(s.reviews, 0) as reviews,
         (p.visible and p.suspended_at is null) as visible,
         s.client_rating, coalesce(s.client_reviews, 0) as client_reviews
  from public.profiles p left join public.profile_stats s on s.id = p.id
  where p.deleted_at is null;
grant select on public.profile_cards to anon, authenticated;

-- ================================================================ 4. ratings per service
/** A worker's record, one line per service: rating and number of ratings (from clients), and jobs done.
    service '' = jobs where no service was named. Public, like the profile it is shown on. */
create or replace function public.service_ratings(p_user uuid)
returns table (service text, rating numeric, reviews int, jobs int)
language sql stable security definer set search_path = public as $$
  with j as (
    select coalesce(b.service, '') as service, count(*)::int as jobs
      from bookings b where b.worker_id = p_user and b.state = 'confirmed' group by 1
  ), r as (
    select coalesce(v.service, '') as service, round(avg(v.stars)::numeric, 1) as rating, count(*)::int as reviews
      from reviews v where v.reviewee_id = p_user and v.as_worker group by 1
  )
  select coalesce(j.service, r.service), r.rating, coalesce(r.reviews, 0), coalesce(j.jobs, 0)
    from j full join r on r.service = j.service
   order by coalesce(r.reviews, 0) desc, coalesce(j.jobs, 0) desc, 1;
$$;
revoke all on function public.service_ratings(uuid) from public;
grant execute on function public.service_ratings(uuid) to anon, authenticated;

-- ================================================================ 5. who is asked about a request
/** The workers a request could go to, best first: those who say they do the request's service, then the
    closest. Same rules as before (0022): the skill, available, not blocked, within their own travel distance
    (15 km for a shop) or the same town; online jobs go to people who work online. `n` counts from 1. */
create or replace function private.getit_fit_workers(p_post text)
returns table (id uuid, n int, does_service boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  po posts;
  online boolean;
  town text;
  svc text;
begin
  select * into po from posts p where p.id = p_post;
  if not found or coalesce(po.cat, '') = '' then return; end if;
  online := coalesce(po.data ->> 'type', '') = 'online';
  svc := lower(nullif(trim(coalesce(po.data ->> 'service', '')), ''));
  select lower(trim(city)) into town from profiles where profiles.id = po.author_id;
  return query
    select q.id, (row_number() over (order by q.does desc, q.far, q.joined))::int, q.does
    from (
      select p.id,
             (svc is not null and jsonb_typeof(p.services) = 'array' and exists (
                select 1 from jsonb_array_elements(p.services) e
                 where lower(e ->> 'skill') = svc and coalesce(e ->> 'pub', 'true') <> 'false' and coalesce(e ->> 'draft', 'false') <> 'true')) as does,
             case when po.location is not null and p.location_approx is not null then st_distance(p.location_approx, po.location) else 1e12 end as far,
             p.created_at as joined
        from profiles p
        cross join lateral (
          select case when jsonb_typeof(p.area -> 'ways') = 'array' then p.area -> 'ways' else '[]'::jsonb end as ways,
                 case when coalesce(p.area ->> 'radius', '') ~ '^[0-9]+(\.[0-9]+)?$'
                      then least(greatest((p.area ->> 'radius')::numeric, 2), 50) else 10 end as km
        ) a
       where p.id <> po.author_id
         and coalesce(p.visible, true)
         and p.suspended_at is null
         and p.deleted_at is null
         and coalesce(p.work_status, 'open') <> 'off'
         and p.skills @> array[po.cat]
         -- someone who switched job alerts off is not counted as "asked" (they still see requests in the app)
         and not exists (select 1 from notification_prefs np where np.user_id = p.id and np.category = 'jobs' and not np.enabled)
         and not exists (
           select 1 from blocks b
            where (b.blocker_id = p.id and b.blocked_id = po.author_id)
               or (b.blocker_id = po.author_id and b.blocked_id = p.id))
         and case
           when online then
             (a.ways ? 'online' or jsonb_array_length(a.ways) = 0)
             and (coalesce(p.area ->> 'reach', '') <> 'city' or lower(trim(p.city)) = town)
           else
             (a.ways ? 'go' or a.ways ? 'come' or jsonb_array_length(a.ways) = 0)
             and case
               when po.location is not null and p.location_approx is not null then
                 st_dwithin(p.location_approx, po.location,
                   1000 * case when a.ways ? 'go' or jsonb_array_length(a.ways) = 0 then a.km else 15 end)
               else lower(trim(p.city)) = town
             end
         end
    ) q;
end $$;
revoke all on function private.getit_fit_workers(text) from public, anon, authenticated;

/** Tell the next `p_count` workers on that list who haven't been told yet. Returns how many were told. */
create or replace function private.getit_ask(p_post text, p_count int)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare po posts; w record; told int := 0;
begin
  select * into po from posts p where p.id = p_post;
  if not found or po.kind <> 'request' or coalesce(po.status, 'open') <> 'open' or po.business_id is not null then return 0; end if;
  for w in
    select f.id from private.getit_fit_workers(p_post) f
     where not exists (select 1 from notifications x where x.recipient_id = f.id and x.event_key = 'newjob:' || p_post)
     order by f.n limit greatest(p_count, 0)
  loop
    perform bolo_notify(w.id, po.author_id, 'newjob', 'jobs',
      'needs a ' || lower(po.cat) || ': “' || coalesce(nullif(po.title, ''), 'a job') || '”'
        || case when po.urgent then ' · as soon as possible' else '' end,
      jsonb_build_object('k', 'job', 'id', po.id), 'newjob:' || po.id);
    told := told + 1;
  end loop;
  return told;
end $$;
revoke all on function private.getit_ask(text, int) from public, anon, authenticated;

/** A new request: the workers who fit are told. A request handed to the getit agent (data.agent) starts with
    the 3 best placed, and the agent asks more if needed; any other request goes to up to 12 at once. */
create or replace function public.getit_ask_workers() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.kind <> 'request' or coalesce(new.status, 'open') <> 'open' or new.business_id is not null or coalesce(new.cat, '') = '' then
    return new;
  end if;
  perform private.getit_ask(new.id, case when coalesce(new.data ->> 'agent', '') = '1' then 3 else 12 end);
  return new;
end $$;
revoke all on function public.getit_ask_workers() from public, anon, authenticated;
