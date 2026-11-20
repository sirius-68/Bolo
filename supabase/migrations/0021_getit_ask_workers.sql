-- getit: when someone asks for prices, the workers who fit are told.
--
-- Until now a request only showed up for a worker who happened to open the app. Now each new request goes to
-- the workers who offer that trade and are available: the closest first, at most 12 of them (never everyone),
-- as a notification that opens the job. People who paused themselves, are suspended, or are blocked by (or
-- have blocked) the person asking are left out. Workers can switch these off under Notifications → Jobs.
-- Safe to run more than once.

set search_path = public, extensions;

create or replace function public.getit_ask_workers() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare w record;
begin
  if new.kind <> 'request' or coalesce(new.status, 'open') <> 'open' or new.business_id is not null or coalesce(new.cat, '') = '' then
    return new;
  end if;
  for w in
    select p.id
      from profiles p
     where p.id <> new.author_id
       and coalesce(p.visible, true)
       and p.suspended_at is null
       and coalesce(p.work_status, 'open') <> 'off'
       and p.skills @> array[new.cat]
       and not exists (
         select 1 from blocks b
          where (b.blocker_id = p.id and b.blocked_id = new.author_id)
             or (b.blocker_id = new.author_id and b.blocked_id = p.id))
     order by case when new.location is not null and p.location_approx is not null
                   then st_distance(p.location_approx, new.location) else 1e12 end,
              p.created_at
     limit 12
  loop
    perform bolo_notify(w.id, new.author_id, 'newjob', 'jobs',
      'needs a ' || lower(new.cat) || ': “' || coalesce(nullif(new.title, ''), 'a job') || '”'
        || case when new.urgent then ' · as soon as possible' else '' end,
      jsonb_build_object('k', 'job', 'id', new.id), 'newjob:' || new.id);
  end loop;
  return new;
end $$;
revoke all on function public.getit_ask_workers() from public, anon, authenticated;

drop trigger if exists getit_ask_workers on public.posts;
create trigger getit_ask_workers after insert on public.posts for each row execute function public.getit_ask_workers();
