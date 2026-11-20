-- getit: a request only reaches workers who could take it.
--
-- 0021 told the 12 closest workers who offer the trade, however far away they were: a plumber in Buea was
-- told about a job in Douala. Now:
--   * a job at a place goes to workers who go to clients or have a shop, and only within reach:
--     their own travel distance (profiles.area.radius, in km) for those who go to clients, 15 km for a shop.
--     When a location is missing on either side, the same town is enough.
--   * an online job goes to workers who work online (and, for those who only take work from their own town,
--     only from that town).
--   * profiles that never said how they work (older accounts) are treated as "go to clients, 10 km".
-- Safe to run more than once.

set search_path = public, extensions;

create or replace function public.getit_ask_workers() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  w record;
  online boolean := coalesce(new.data ->> 'type', '') = 'online';
  town text;
begin
  if new.kind <> 'request' or coalesce(new.status, 'open') <> 'open' or new.business_id is not null or coalesce(new.cat, '') = '' then
    return new;
  end if;
  select lower(trim(city)) into town from profiles where id = new.author_id;
  for w in
    select p.id
      from profiles p
      cross join lateral (
        select case when jsonb_typeof(p.area -> 'ways') = 'array' then p.area -> 'ways' else '[]'::jsonb end as ways,
               case when coalesce(p.area ->> 'radius', '') ~ '^[0-9]+(\.[0-9]+)?$'
                    then least(greatest((p.area ->> 'radius')::numeric, 2), 50) else 10 end as km
      ) a
     where p.id <> new.author_id
       and coalesce(p.visible, true)
       and p.suspended_at is null
       and coalesce(p.work_status, 'open') <> 'off'
       and p.skills @> array[new.cat]
       and not exists (
         select 1 from blocks b
          where (b.blocker_id = p.id and b.blocked_id = new.author_id)
             or (b.blocker_id = new.author_id and b.blocked_id = p.id))
       and case
         when online then
           (a.ways ? 'online' or jsonb_array_length(a.ways) = 0)
           and (coalesce(p.area ->> 'reach', '') <> 'city' or lower(trim(p.city)) = town)
         else
           (a.ways ? 'go' or a.ways ? 'come' or jsonb_array_length(a.ways) = 0)
           and case
             when new.location is not null and p.location_approx is not null then
               st_dwithin(p.location_approx, new.location,
                 1000 * case when a.ways ? 'go' or jsonb_array_length(a.ways) = 0 then a.km else 15 end)
             else lower(trim(p.city)) = town
           end
       end
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
