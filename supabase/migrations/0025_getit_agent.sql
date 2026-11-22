-- getit · the agent (for people hiring)
--
-- Someone hands a request to the getit agent with a budget and a time. The agent then does what they would do
-- themselves: asks the best-placed workers a few at a time, collects their prices, asks a worker whose price is
-- above the budget whether the budget works for them, and comes back with the best offer; or books it, when the
-- person allowed that. Everything here is plain rules, so a price is never agreed and a job never booked on a
-- guess (the AI only words things: what the request is, and why an offer was picked).
--
-- Rules, in one place:
--   asking     3 workers first (those who say they do the service, then the closest); 5 more when nobody
--              answered after 4 minutes, twice; "nobody" 6 minutes after the last round.
--   counter    a worker whose price is above the budget is asked once whether the budget works, but never below
--              their own listed price for that service, and never below 60% of what they asked. They say yes or
--              keep their price. Nothing changes without their yes.
--   deciding   when 3 offers are in, or everyone asked has answered, or 6 minutes after the first offer
--              (3 when it is wanted now), and no worker is still thinking about a counter (5 minutes at most).
--   the pick   offers within the budget that can come in time first; then the soonest; then the best rating for
--              THIS service (their overall rating when they have none for it); then the lowest price.
--   booking    only when the person switched it on, and only an offer within the budget and in time.
--   free       3 tries for every account (a try counts when the agent comes back with an offer); then getit Pro.
-- Safe to run more than once.

set search_path = public, extensions;

alter table public.applications add column if not exists counter integer;
alter table public.applications add column if not exists counter_state text;
alter table public.applications add column if not exists counter_at timestamptz;
do $$ begin
  alter table public.applications add constraint applications_counter_ok
    check ((counter is null or counter > 0) and (counter_state is null or counter_state in ('asked', 'yes', 'no', 'skip')));
exception when duplicate_object then null; end $$;

create table if not exists public.agent_runs (
  post_id    text primary key references public.posts(id) on delete cascade,
  client_id  uuid not null references auth.users(id) on delete cascade,
  budget     integer check (budget is null or budget > 0),            -- FCFA; null = no limit
  want       text not null default 'today' check (want in ('now', 'today', 'tomorrow', 'week')),
  auto       boolean not null default false,                          -- book the pick without asking
  state      text not null default 'asking' check (state in ('asking', 'pick', 'booked', 'nobody', 'stopped')),
  round      integer not null default 1,
  asked_at   timestamptz not null default now(),                      -- when more workers were last asked
  pick       uuid references public.applications(id) on delete set null,
  booking    uuid references public.bookings(id) on delete set null,
  log        jsonb not null default '[]',                             -- what it did: [{k, at, t, s}]
  counted    boolean not null default false,                          -- used one of the free tries
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_runs_client on public.agent_runs(client_id, created_at desc);
alter table public.agent_runs enable row level security;
revoke all on public.agent_runs from anon, authenticated;
grant select on public.agent_runs to authenticated;
drop policy if exists "own agent runs" on public.agent_runs;
create policy "own agent runs" on public.agent_runs for select to authenticated using (client_id = auth.uid());
drop trigger if exists agent_runs_touch on public.agent_runs;
create trigger agent_runs_touch before update on public.agent_runs for each row execute function public.touch_updated_at();

-- ================================================================ small helpers
create or replace function private.amount_of(p_price text) returns integer language sql immutable as $$
  select least(coalesce(nullif(replace((regexp_match(coalesce(p_price, ''), '[0-9][0-9,]*'))[1], ',', ''), '')::bigint, 0), 2000000000)::int;
$$;
create or replace function private.fcfa(p_amount integer) returns text language sql immutable as $$
  select trim(to_char(coalesce(p_amount, 0), 'FM999,999,999,990')) || ' FCFA';
$$;
create or replace function private.first_name(p_name text) returns text language sql immutable as $$
  select coalesce(nullif(split_part(trim(coalesce(p_name, '')), ' ', 1), ''), 'A worker');
$$;
/** How soon an offer can come, as a number: now 0, within the hour 1, today 2, tomorrow 3, later 4. */
create or replace function private.when_rank(p_when text) returns integer language sql immutable as $$
  select case when p_when ~* '\mnow\M' then 0 when p_when ~* 'hour' then 1 when p_when ~* '^\s*today' then 2 when p_when ~* 'tomorrow' then 3 else 4 end;
$$;
/** The latest that still counts as "in time" for what the person wanted. */
create or replace function private.want_rank(p_want text) returns integer language sql immutable as $$
  select case p_want when 'now' then 2 when 'today' then 2 when 'tomorrow' then 3 else 9 end;
$$;
/** A worker's own listed price for a service (0 when they list none). */
create or replace function private.listed_price(p_services jsonb, p_service text) returns integer language sql immutable as $$
  select coalesce((
    select private.amount_of(e ->> 'price') from jsonb_array_elements(case when jsonb_typeof(p_services) = 'array' then p_services else '[]'::jsonb end) e
     where p_service is not null and lower(e ->> 'skill') = lower(p_service) and coalesce(e ->> 'pub', 'true') <> 'false' limit 1), 0);
$$;
revoke all on function private.amount_of(text), private.fcfa(integer), private.first_name(text), private.when_rank(text), private.want_rank(text), private.listed_price(jsonb, text) from public, anon, authenticated;

/** One line in "What I've done". A step with the same key is written once. */
create or replace function private.agent_log(p_post text, p_key text, p_title text, p_sub text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update agent_runs
     set log = log || jsonb_build_array(jsonb_build_object('k', p_key, 'at', now(), 't', p_title, 's', coalesce(p_sub, '')))
   where post_id = p_post and not exists (select 1 from jsonb_array_elements(log) e where e ->> 'k' = p_key);
end $$;
revoke all on function private.agent_log(text, text, text, text) from public, anon, authenticated;

-- ================================================================ booking on someone's behalf
/** The one chat between two people (made if there is none), without needing a signed-in caller. */
create or replace function private.direct_between(p_a uuid, p_b uuid, p_business uuid, p_topic text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('dm:' || least(p_a, p_b)::text || greatest(p_a, p_b)::text || coalesce(p_business::text, ''), 0));
  select c.id into cid from conversations c
   where c.kind = 'direct' and c.business_id is not distinct from p_business
     and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = p_a)
     and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = p_b)
   order by c.created_at limit 1;
  if cid is null then
    insert into conversations (kind, business_id, topic, created_by) values ('direct', p_business, coalesce(p_topic, ''), p_a) returning id into cid;
    insert into conversation_members (conversation_id, user_id, role) values (cid, p_a, 'owner'), (cid, p_b, 'member');
  elsif coalesce(p_topic, '') <> '' then
    update conversations set topic = p_topic where id = cid;
  end if;
  return cid;
end $$;
revoke all on function private.direct_between(uuid, uuid, uuid, text) from public, anon, authenticated;

/** Books the person who made an offer, for the person who posted the job (`p_by`). The checks are the same
    whoever asks: the app (accept_application) or the agent, for the person who switched booking on.
    New here: a request that is already booked can't be booked a second time. */
create or replace function private.accept_application_as(p_application uuid, p_by uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a applications; p posts; cid uuid; bid uuid;
begin
  select * into a from applications where id = p_application for update;
  if not found then raise exception 'offer not found'; end if;
  select * into p from posts where id = a.post_id for update;
  if p.author_id <> p_by then raise exception 'only the person who posted the job can accept'; end if;
  if a.stage in ('withdrawn', 'declined', 'accepted', 'hired') then raise exception 'this offer can’t be accepted any more'; end if;
  if p.business_id is null and p.status <> 'open' then raise exception 'you already booked someone for this request'; end if;
  if is_blocked(p_by, a.applicant_id) then raise exception 'you can’t book this person'; end if;
  update applications set stage = case when p.business_id is null then 'accepted' else 'hired' end where id = a.id;
  if p.business_id is null then update posts set status = 'booked' where id = p.id; end if;
  cid := private.direct_between(p_by, a.applicant_id, p.business_id, p.title);
  bid := make_booking(a.applicant_id, p.author_id, p.business_id, p.title, nullif(a.when_text, ''), nullif(a.price, ''), p.area, p.id, a.id, cid, p.location);
  return bid;
end $$;
revoke all on function private.accept_application_as(uuid, uuid) from public, anon, authenticated;

create or replace function public.accept_application(p_application uuid)
returns uuid language plpgsql security definer set search_path = public, private as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  return private.accept_application_as(p_application, auth.uid());
end $$;
revoke all on function public.accept_application(uuid) from public, anon;
grant execute on function public.accept_application(uuid) to authenticated;

-- ================================================================ the agent's rules
/** One look at a request the agent is handling: note new offers, ask about the budget, ask more workers,
    decide. Safe to call any number of times; called when an offer arrives or changes, when the person's app
    is open on it, and once a minute by the database when it can (see the end of this file). */
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
         ((r.budget is null or private.amount_of(x.price) <= r.budget) and private.when_rank(x.when_text) <= private.want_rank(r.want)) as fit
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
   order by ((r.budget is null or private.amount_of(x.price) <= r.budget) and private.when_rank(x.when_text) <= private.want_rank(r.want)) desc,
            (r.budget is null or private.amount_of(x.price) <= r.budget) desc,
            private.when_rank(x.when_text),
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

/** The door to the rules above. While it is at work, its own changes to offers don't start it a second time
    (one look at a time, so nothing is decided or booked twice). */
create or replace function private.agent_eval(p_post text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if coalesce(current_setting('getit.agent_busy', true), '') = '1' then return; end if;
  perform set_config('getit.agent_busy', '1', true);
  begin
    perform private.agent_eval_do(p_post);
  exception when others then
    perform set_config('getit.agent_busy', '', true);
    raise;
  end;
  perform set_config('getit.agent_busy', '', true);
end $$;
revoke all on function private.agent_eval(text) from public, anon, authenticated;

-- an offer arrives, changes price, is withdrawn, or a worker answers about the budget
create or replace function public.agent_on_offer() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if exists (select 1 from agent_runs where post_id = coalesce(new.post_id, old.post_id)) then
    perform private.agent_eval(coalesce(new.post_id, old.post_id));
  end if;
  return null;
end $$;
drop trigger if exists applications_agent on public.applications;
create trigger applications_agent after insert or update of price, when_text, stage, counter_state on public.applications
  for each row execute function public.agent_on_offer();

-- the person booked someone themselves (from the pick, or from the list of offers), or the job was cancelled
create or replace function public.agent_on_booking() returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.post_id is null then return null; end if;
  if tg_op = 'INSERT' then
    update agent_runs set state = 'booked', booking = new.id, counted = true where post_id = new.post_id and state in ('asking', 'pick', 'nobody');
  elsif new.state = 'cancelled' and old.state <> 'cancelled' then
    update agent_runs set state = 'stopped', booking = null where post_id = new.post_id and booking = new.id;
    perform private.agent_log(new.post_id, 'cancelled:' || new.id, 'The booking was cancelled', 'Your request is open again, with the other offers. Choose one yourself, or start the agent again.');
  end if;
  return null;
end $$;
drop trigger if exists bookings_agent on public.bookings;
create trigger bookings_agent after insert or update of state on public.bookings for each row execute function public.agent_on_booking();

-- ================================================================ what the app calls
/** Free tries: how many are used, and whether this account has getit Pro. */
create or replace function public.agent_left() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'used', (select count(*) from agent_runs where client_id = auth.uid() and counted),
    'free', 3,
    'pro', coalesce((select pro_regular from profiles where id = auth.uid()), false));
$$;
revoke all on function public.agent_left() from public, anon;
grant execute on function public.agent_left() to authenticated;

/** What the agent screen shows: where things stand, what it did, the offers, and its pick. Owner only. */
create or replace function private.agent_view(p_post text) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare r agent_runs; po posts; svc text;
begin
  select * into r from agent_runs where post_id = p_post;
  if not found then return null; end if;
  select * into po from posts where id = p_post;
  svc := nullif(trim(coalesce(po.data ->> 'service', '')), '');
  return jsonb_build_object(
    'post', r.post_id, 'state', r.state, 'budget', r.budget, 'want', r.want, 'auto', r.auto, 'round', r.round,
    'pick', r.pick, 'booking', r.booking, 'log', r.log, 'service', svc, 'title', po.title, 'trade', po.cat,
    'told', (select count(*) from notifications x where x.event_key = 'newjob:' || p_post),
    'offers', (select coalesce(jsonb_agg(o order by o.created_at), '[]') from (
        select x.id, x.applicant_id as worker_id, pr.name, x.price, private.amount_of(x.price) as amount, x.when_text as "when", left(x.msg, 200) as note,
               x.counter, x.counter_state, x.created_at,
               ((r.budget is null or private.amount_of(x.price) <= r.budget) and private.when_rank(x.when_text) <= private.want_rank(r.want)) as fit,
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

/** Hand a request to the agent (or change what it was told). p_budget in FCFA, null for no limit. */
create or replace function public.agent_start(p_post text, p_budget integer default null, p_want text default 'today', p_auto boolean default false)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare po posts; used int; told int; many text;
begin
  select * into po from posts where id = p_post for update;
  if not found or po.author_id <> auth.uid() then raise exception 'request not found'; end if;
  if po.kind <> 'request' or po.business_id is not null then raise exception 'the agent only handles requests for a worker'; end if;
  if po.status <> 'open' then raise exception 'this request is no longer open'; end if;
  if p_want not in ('now', 'today', 'tomorrow', 'week') then raise exception 'unknown time'; end if;
  if p_budget is not null and (p_budget < 100 or p_budget > 100000000) then raise exception 'the budget doesn’t look right'; end if;
  if not exists (select 1 from agent_runs where post_id = p_post) then
    select count(*) into used from agent_runs where client_id = auth.uid() and counted;
    if used >= 3 and not coalesce((select pro_regular from profiles where id = auth.uid()), false) then
      raise exception 'pro_needed' using hint = 'pro';
    end if;
    insert into agent_runs (post_id, client_id, budget, want, auto) values (p_post, auth.uid(), p_budget, p_want, coalesce(p_auto, false));
    select count(*) into told from notifications x where x.event_key = 'newjob:' || p_post;
    if told = 0 then told := private.getit_ask(p_post, 3); end if;
    many := lower(po.cat) || case when told = 1 then '' else 's' end;
    perform private.agent_log(p_post, 'start',
      case when told > 0 then 'Asked the ' || case when told = 1 then 'closest ' else told || ' closest ' end || many else 'Looked for ' || lower(po.cat) || 's near you' end,
      case when told > 0 then 'Those who do this kind of job first. More if needed.' else 'Nobody nearby offers this yet. Your request stays open, and I’ll tell you when someone answers.' end);
  else
    -- told again (a new budget, a new time): it looks at the offers afresh
    update agent_runs set budget = p_budget, want = p_want, auto = coalesce(p_auto, false),
           state = case when state in ('pick', 'nobody', 'stopped') then 'asking' else state end, pick = null, asked_at = now()
     where post_id = p_post and state <> 'booked';
    update applications set counter = null, counter_state = null, counter_at = null where post_id = p_post and counter_state in ('asked', 'skip');
  end if;
  perform private.agent_eval(p_post);
  return private.agent_view(p_post);
end $$;
revoke all on function public.agent_start(text, integer, text, boolean) from public, anon;
grant execute on function public.agent_start(text, integer, text, boolean) to authenticated;

/** The app, open on the agent's screen, asks where things stand (and lets the clock-based rules move on). */
create or replace function public.agent_tick(p_post text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from agent_runs where post_id = p_post and client_id = auth.uid()) then return null; end if;
  perform private.agent_eval(p_post);
  return private.agent_view(p_post);
end $$;
revoke all on function public.agent_tick(text) from public, anon;
grant execute on function public.agent_tick(text) to authenticated;

/** "Stop. I'll choose myself": the request carries on as an ordinary one, and more workers get to see it. */
create or replace function public.agent_stop(p_post text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from agent_runs where post_id = p_post and client_id = auth.uid()) then return null; end if;
  update agent_runs set state = 'stopped', pick = null where post_id = p_post and state in ('asking', 'pick', 'nobody');
  if found then
    update applications set counter_state = 'skip' where post_id = p_post and counter_state = 'asked';
    perform private.agent_log(p_post, 'stopped:' || extract(epoch from now())::bigint, 'You took over', 'The offers so far are yours to choose from.');
    perform private.getit_ask(p_post, 9);
  end if;
  return private.agent_view(p_post);
end $$;
revoke all on function public.agent_stop(text) from public, anon;
grant execute on function public.agent_stop(text) to authenticated;

/** "Keep asking" (after nobody answered) or "Look for a better one" (after a pick): asks more workers and waits again. */
create or replace function public.agent_more(p_post text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare told int;
begin
  if not exists (select 1 from agent_runs where post_id = p_post and client_id = auth.uid() and state in ('nobody', 'pick')) then
    return private.agent_view(p_post);
  end if;
  told := private.getit_ask(p_post, 5);
  update agent_runs set state = 'asking', pick = null, round = 2, asked_at = now() where post_id = p_post;
  perform private.agent_log(p_post, 'more:' || extract(epoch from now())::bigint,
    case when told > 0 then 'Asked ' || told || ' more' else 'Still asking' end,
    case when told > 0 then 'I’ll come back when they answer.' else 'Nobody new to ask nearby. Waiting for those who have your request.' end);
  return private.agent_view(p_post);
end $$;
revoke all on function public.agent_more(text) from public, anon;
grant execute on function public.agent_more(text) to authenticated;

/** A worker answers "can you do it for the budget?": yes changes their price to it; no keeps their price. */
create or replace function public.agent_answer(p_application uuid, p_yes boolean) returns void
language plpgsql security definer set search_path = public, private as $$
declare a applications;
begin
  select * into a from applications where id = p_application for update;
  if not found or a.applicant_id <> auth.uid() then raise exception 'offer not found'; end if;
  if a.counter_state is distinct from 'asked' then raise exception 'there is nothing to answer here any more'; end if;
  if a.stage in ('withdrawn', 'declined', 'accepted', 'hired') then raise exception 'this offer is closed'; end if;
  if p_yes then
    update applications set price = 'XAF ' || trim(to_char(a.counter, 'FM999,999,999,990')), counter_state = 'yes', counter_at = now() where id = a.id;
  else
    update applications set counter_state = 'no', counter_at = now() where id = a.id;
  end if;
end $$;
revoke all on function public.agent_answer(uuid, boolean) from public, anon;
grant execute on function public.agent_answer(uuid, boolean) to authenticated;

-- workers may read the agent's question on their own offer; nobody may write these columns directly
revoke update (counter, counter_state, counter_at) on public.applications from anon, authenticated;

-- ================================================================ once a minute, when the database can
create or replace function private.agent_eval_all() returns void
language plpgsql security definer set search_path = public, private as $$
declare x record;
begin
  for x in select post_id from agent_runs where state in ('asking', 'pick') and updated_at > now() - interval '6 hours' loop
    begin
      perform private.agent_eval(x.post_id);
    exception when others then
      raise warning 'agent_eval(%) failed: %', x.post_id, sqlerrm;
    end;
  end loop;
end $$;
revoke all on function private.agent_eval_all() from public, anon, authenticated;

do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'getit-agent';
  perform cron.schedule('getit-agent', '* * * * *', 'select private.agent_eval_all()');
exception when others then
  raise notice 'no scheduler here (%): the agent moves on when offers arrive and while the app is open on it', sqlerrm;
end $$;
