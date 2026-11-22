-- getit · the app can read the service of a job, and the agent reads "when" the way the app writes it
--
-- 1. booking_cards is "bookings, plus where the job is as two numbers". It was made before bookings had a
--    service, and a view keeps the columns it was made with: it is made again so `service` is in it.
-- 2. When a worker says when they can come, the app saves a day ("Sun 22 Nov, now", "Mon 23 Nov", "By Sun 29
--    Nov"), so it still reads right tomorrow. The agent's rules (0025) looked for the words "today" and
--    "tomorrow", which the app never saves: every offer that wasn't "now" or "in 1 hour" counted as late.
--    private.when_rank now reads the day, against the day it was on the asker's phone when the offer was made
--    (the request carries their clock's distance from UTC, data.tz, in minutes). The two functions that use
--    it are the same as in 0025 except for that call.
-- 3. "Book the best offer for me" needs a budget: without one the agent would book at any price. With no
--    budget it always asks first.
-- Safe to run more than once.

set search_path = public, extensions;

drop view if exists public.booking_cards;
create view public.booking_cards with (security_invoker = true) as
  select b.*, st_x(b.dest::geometry) as dest_lng, st_y(b.dest::geometry) as dest_lat
  from public.bookings b;
grant select on public.booking_cards to anon, authenticated;

-- ================================================================ when can they come?
/** Minutes to add to UTC for the clock of the person who asked (from the request; West Africa when unknown). */
create or replace function private.tz_of(p_data jsonb) returns integer language sql immutable as $$
  select case when coalesce(p_data ->> 'tz', '') ~ '^-?[0-9]{1,3}$' then greatest(least((p_data ->> 'tz')::int, 840), -720) else 60 end;
$$;
/** How soon an offer can come: now 0, within the hour 1, the same day 2, the next day 3, later 4.
    `p_made`: when the offer was made; `p_tz`: minutes from UTC on the asker's phone. */
create or replace function private.when_rank(p_when text, p_made timestamptz, p_tz integer) returns integer
language plpgsql immutable as $$
declare
  m text[];
  base date := ((p_made at time zone 'UTC') + make_interval(mins => coalesce(p_tz, 60)))::date;
  d date;
  diff int;
begin
  if p_when is null then return 4; end if;
  if p_when ~* '\mnow\M' then return 0; end if;
  if p_when ~* 'hour' then return 1; end if;
  if p_when ~* '^\s*today' then return 2; end if;
  if p_when ~* 'tomorrow' then return 3; end if;
  m := regexp_match(p_when, '([0-9]{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)', 'i');
  if m is null then return 4; end if;
  begin
    d := make_date(extract(year from base)::int, (position(lower(m[2]) in 'janfebmaraprmayjunjulaugsepoctnovdec') + 2) / 3, m[1]::int);
  exception when others then
    return 4;
  end;
  if d < base - 180 then d := (d + interval '1 year')::date; end if;   -- "2 Jan" said on 30 Dec
  diff := d - base;
  -- "By Sun 29 Nov" is "some time this week": only as soon as today when that day is today
  if p_when ~* '^\s*by\M' and diff > 0 then return 4; end if;
  return case when diff <= 0 then 2 when diff = 1 then 3 else 4 end;
end $$;
revoke all on function private.tz_of(jsonb), private.when_rank(text, timestamptz, integer) from public, anon, authenticated;

-- ================================================================ the agent's rules, reading the day
create or replace function private.agent_eval_do(p_post text) returns void
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  r agent_runs;
  po posts;
  a record;
  best record;
  svc text;
  amt int;
  fl int;
  n_off int;
  n_wait int;
  n_told int;
  first_at timestamptz;
  told int;
  bid uuid;
  who text;
  tz int;
begin
  select * into r from agent_runs where post_id = p_post for update;
  if not found then return; end if;
  select * into po from posts where id = p_post;
  if not found then return; end if;

  -- the request was closed, or booked another way
  if r.state in ('asking', 'pick', 'nobody') and po.status = 'closed' then
    update agent_runs set state = 'stopped' where post_id = p_post;
    return;
  end if;
  -- the offer it picked is gone: look again
  if r.state = 'pick' and not exists (select 1 from applications x where x.id = r.pick and x.stage not in ('withdrawn', 'declined')) then
    update agent_runs set state = 'asking', pick = null where post_id = p_post;
    update agent_runs set log = log || jsonb_build_array(jsonb_build_object('k', 'gone:' || extract(epoch from now())::bigint, 'at', now(), 't', 'The offer I picked was withdrawn', 's', 'Looking at the others again.')) where post_id = p_post;
    r.state := 'asking';
  end if;
  if r.state <> 'asking' or po.status <> 'open' then return; end if;
  svc := nullif(trim(coalesce(po.data ->> 'service', '')), '');
  tz := private.tz_of(po.data);

  -- 1. offers: note each one; ask once about the budget when the price is above it
  for a in
    select x.id, x.applicant_id, x.price, x.when_text, x.counter, x.counter_state, pr.name, pr.services
      from applications x join profiles pr on pr.id = x.applicant_id
     where x.post_id = p_post and x.stage not in ('withdrawn', 'declined')
     order by x.created_at
  loop
    amt := private.amount_of(a.price);
    who := private.first_name(a.name);
    -- (written once, with the price they first gave)
    perform private.agent_log(p_post, 'offer:' || a.id, who || ' offered ' || private.fcfa(amt),
      case when coalesce(a.when_text, '') <> '' then 'Can come ' || lower(left(a.when_text, 1)) || substr(a.when_text, 2) || '.' else '' end);
    if r.budget is not null and amt > r.budget and a.counter_state is null then
      fl := private.listed_price(a.services, svc);
      if r.budget >= greatest(fl, ceil(amt * 0.6)::int) then
        update applications set counter = r.budget, counter_state = 'asked', counter_at = now() where id = a.id;
        perform bolo_notify(a.applicant_id, r.client_id, 'counter', 'jobs',
          'has a budget of ' || private.fcfa(r.budget) || ' for “' || coalesce(nullif(po.title, ''), 'the job') || '”. Your price was ' || private.fcfa(amt) || '. Can you do it?',
          jsonb_build_object('k', 'job', 'id', po.id), 'counter:' || a.id);
        perform private.agent_log(p_post, 'ask:' || a.id, 'Asked ' || who || ' if ' || private.fcfa(r.budget) || ' works',
          who || '’s price is ' || private.fcfa(amt) || ', above your budget. Waiting for their answer.');
      else
        update applications set counter_state = 'skip' where id = a.id;
        perform private.agent_log(p_post, 'skip:' || a.id, who || '’s price is above your budget',
          case when fl > r.budget then who || ' starts at ' || private.fcfa(fl) || ' for this, so I didn’t ask for less.' else 'Too far from your budget to ask for less.' end);
      end if;
    elsif a.counter_state = 'yes' then
      perform private.agent_log(p_post, 'yes:' || a.id, who || ' agreed to ' || private.fcfa(amt), 'Within your budget now.');
    elsif a.counter_state = 'no' then
      perform private.agent_log(p_post, 'no:' || a.id, who || ' keeps ' || private.fcfa(amt), 'Above your budget. It stays on the list for you to see.');
    end if;
  end loop;

  select count(*), min(x.created_at), count(*) filter (where x.counter_state = 'asked' and x.counter_at > now() - interval '5 minutes')
    into n_off, first_at, n_wait
    from applications x where x.post_id = p_post and x.stage not in ('withdrawn', 'declined');
  select count(*) into n_told from notifications x where x.event_key = 'newjob:' || p_post;

  -- 2. nobody has answered: ask more workers, then say so
  if n_off = 0 then
    if r.round < 3 and r.asked_at < now() - interval '4 minutes' then
      told := private.getit_ask(p_post, 5);
      update agent_runs set round = round + 1, asked_at = now() where post_id = p_post;
      perform private.agent_log(p_post, 'round:' || (r.round + 1),
        case when told > 0 then 'No answer yet: asked ' || told || ' more' else 'No answer yet' end,
        case when told > 0 then 'A little further away this time.' else 'Nobody else nearby offers this. Still waiting for those I asked.' end);
    elsif r.round >= 3 and r.asked_at < now() - interval '6 minutes' then
      update agent_runs set state = 'nobody' where post_id = p_post;
      perform private.agent_log(p_post, 'nobody:' || r.round, 'Nobody has answered yet', 'Your request stays open. I can keep asking, or you can call a worker yourself.');
      perform bolo_notify(r.client_id, null, 'agent', 'jobs',
        'getit agent: nobody has answered “' || coalesce(nullif(po.title, ''), 'your request') || '” yet. Keep asking, or call a worker yourself.',
        jsonb_build_object('k', 'job', 'id', po.id), 'agent:nobody:' || p_post || ':' || r.round);
    end if;
    return;
  end if;

  -- 3. decide?
  if n_wait > 0 then return; end if;
  if not (n_off >= 3 or n_off >= n_told or first_at < now() - (case when r.want = 'now' then interval '3 minutes' else interval '6 minutes' end)) then
    return;
  end if;

  select x.id, x.applicant_id, x.price, x.when_text, pr.name,
         private.amount_of(x.price) as amount,
         ((r.budget is null or private.amount_of(x.price) <= r.budget) and private.when_rank(x.when_text, x.created_at, tz) <= private.want_rank(r.want)) as fit
    into best
    from applications x
    join profiles pr on pr.id = x.applicant_id
    left join lateral (
      -- their record for this service; their whole record when they have none for it (a prior of two 4★ jobs
      -- keeps one lucky rating from beating a long good record)
      select coalesce(
        (select (sum(v.stars) + 8.0) / (count(*) + 2) from reviews v where v.reviewee_id = x.applicant_id and v.as_worker and svc is not null and lower(v.service) = lower(svc) having count(*) > 0),
        (select (sum(v.stars) + 8.0) / (count(*) + 2) from reviews v where v.reviewee_id = x.applicant_id and v.as_worker having count(*) > 0),
        4.0) as score
    ) q on true
   where x.post_id = p_post and x.stage not in ('withdrawn', 'declined')
   order by ((r.budget is null or private.amount_of(x.price) <= r.budget) and private.when_rank(x.when_text, x.created_at, tz) <= private.want_rank(r.want)) desc,
            (r.budget is null or private.amount_of(x.price) <= r.budget) desc,
            private.when_rank(x.when_text, x.created_at, tz),
            q.score desc,
            private.amount_of(x.price),
            x.created_at
   limit 1;
  if best.id is null then return; end if;
  who := private.first_name(best.name);

  if r.auto and best.fit then
    bid := private.accept_application_as(best.id, r.client_id);
    update agent_runs set state = 'booked', pick = best.id, booking = bid, counted = true where post_id = p_post;
    perform private.agent_log(p_post, 'booked', 'Booked ' || who || ' for ' || private.fcfa(best.amount),
      'Best of ' || n_off || case when n_off = 1 then ' offer' else ' offers' end || ', within your budget and in time. You can cancel free before work starts.');
    perform bolo_notify(r.client_id, best.applicant_id, 'agent', 'jobs',
      'was booked for you by the getit agent · “' || coalesce(nullif(po.title, ''), 'your request') || '” · ' || private.fcfa(best.amount),
      jsonb_build_object('k', 'track', 'id', bid), 'agent:booked:' || p_post);
  else
    update agent_runs set state = 'pick', pick = best.id, counted = true where post_id = p_post;
    perform private.agent_log(p_post, 'pick:' || best.id, 'Found your best offer',
      who || ' · ' || private.fcfa(best.amount) || case when best.fit then '' when r.budget is not null and best.amount > r.budget then ' · above your budget, so I didn’t book it' else ' · later than you wanted, so I didn’t book it' end);
    perform bolo_notify(r.client_id, best.applicant_id, 'agent', 'jobs',
      'is the getit agent’s pick for “' || coalesce(nullif(po.title, ''), 'your request') || '” · ' || private.fcfa(best.amount),
      jsonb_build_object('k', 'job', 'id', po.id), 'agent:pick:' || p_post || ':' || best.id);
  end if;
end $$;
revoke all on function private.agent_eval_do(text) from public, anon, authenticated;

create or replace function private.agent_view(p_post text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare r agent_runs; po posts; svc text; tz int;
begin
  select * into r from agent_runs where post_id = p_post;
  if not found then return null; end if;
  select * into po from posts where id = p_post;
  svc := nullif(trim(coalesce(po.data ->> 'service', '')), '');
  tz := private.tz_of(po.data);
  return jsonb_build_object(
    'post', r.post_id, 'state', r.state, 'budget', r.budget, 'want', r.want, 'auto', r.auto, 'round', r.round,
    'pick', r.pick, 'booking', r.booking, 'log', r.log, 'service', svc, 'title', po.title, 'trade', po.cat,
    'told', (select count(*) from notifications x where x.event_key = 'newjob:' || p_post),
    'offers', (select coalesce(jsonb_agg(o order by o.created_at), '[]') from (
        select x.id, x.applicant_id as worker_id, pr.name, x.price, private.amount_of(x.price) as amount, x.when_text as "when", left(x.msg, 200) as note,
               x.counter, x.counter_state, x.created_at,
               ((r.budget is null or private.amount_of(x.price) <= r.budget) and private.when_rank(x.when_text, x.created_at, tz) <= private.want_rank(r.want)) as fit,
               (r.budget is not null and private.amount_of(x.price) > r.budget) as over,
               (select round(avg(v.stars)::numeric, 1) from reviews v where v.reviewee_id = x.applicant_id and v.as_worker) as rating,
               (select count(*) from reviews v where v.reviewee_id = x.applicant_id and v.as_worker) as reviews,
               (select round(avg(v.stars)::numeric, 1) from reviews v where v.reviewee_id = x.applicant_id and v.as_worker and svc is not null and lower(v.service) = lower(svc)) as service_rating,
               (select count(*) from reviews v where v.reviewee_id = x.applicant_id and v.as_worker and svc is not null and lower(v.service) = lower(svc)) as service_reviews,
               (select count(*) from bookings b where b.worker_id = x.applicant_id and b.state = 'confirmed') as jobs,
               (private.listed_price(pr.services, svc) > 0 or (svc is not null and exists (
                  select 1 from jsonb_array_elements(case when jsonb_typeof(pr.services) = 'array' then pr.services else '[]'::jsonb end) e where lower(e ->> 'skill') = lower(svc)))) as does_service,
               pr.verified
          from applications x join profiles pr on pr.id = x.applicant_id
         where x.post_id = p_post and x.stage not in ('withdrawn', 'declined')) o),
    'tries', jsonb_build_object(
      'used', (select count(*) from agent_runs where client_id = r.client_id and counted),
      'free', 3,
      'pro', coalesce((select pro_regular from profiles where id = r.client_id), false)));
end $$;
revoke all on function private.agent_view(text) from public, anon, authenticated;

-- ================================================================ no budget, no booking on its own
create or replace function public.agent_no_blind_booking() returns trigger language plpgsql as $$
begin
  if new.budget is null then new.auto := false; end if;
  return new;
end $$;
drop trigger if exists agent_runs_budget on public.agent_runs;
create trigger agent_runs_budget before insert or update of budget, auto on public.agent_runs for each row execute function public.agent_no_blind_booking();

-- ================================================================ Pro, given by getit's team (until it can be paid for)
/** Admin: switch a person's Pro on or off and tell them. Pro lifts the agent's three free tries. */
create or replace function public.admin_give_pro(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  update profiles set pro_regular = coalesce(p_on, false) where id = p_user;
  if not found then raise exception 'account not found'; end if;
  perform bolo_audit('pro.set', 'profiles', p_user::text, jsonb_build_object('regular', coalesce(p_on, false)));
  perform bolo_notify(p_user, null, 'pro', 'account',
    case when p_on then 'getit Pro is on for your account. The getit agent can find and compare offers for you as often as you like.'
         else 'getit Pro is off for your account. Asking for prices yourself stays free.' end,
    jsonb_build_object('k', 'notifs'), 'pro:' || p_user || ':' || extract(epoch from now())::bigint);
end $$;
revoke all on function public.admin_give_pro(uuid, boolean) from public, anon;
grant execute on function public.admin_give_pro(uuid, boolean) to authenticated;
