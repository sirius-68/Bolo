-- getit · the app's new name on the server, and a fair-use counter for server functions
--
-- 1. Every message the database writes for people ("Write to bolo from Settings → Help", "You're now a bolo
--    Career Expert"…) now says getit. The functions are the same; only the name inside their text changes.
--    Names of functions and tables (bolo_notify, bolo_hit…) stay: nobody sees them, and the app calls them.
-- 2. getit_hit(): counts uses of something per key (for example the "understand" function, per connection),
--    so one phone cannot use up what is meant for everyone. Only server code can call it.

-- ================================================================ 1. the name in messages
do $$
declare
  r   record;
  def text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind = 'f' and p.prosrc ~ '\mbolo\M(?!\.\w)'
  loop
    -- "bolo" as a word of its own: not bolo_notify, not a setting like bolo.something
    def := regexp_replace(pg_get_functiondef(r.oid), '\mbolo\M(?!\.\w)', 'getit', 'g');
    execute def;
  end loop;
end $$;

-- the "please update" message shown by old versions of the app
update public.app_config
set value = jsonb_set(value, '{message}', to_jsonb(regexp_replace(value ->> 'message', '\mbolo\M', 'getit', 'g'))), updated_at = now()
where key = 'min_version' and value ->> 'message' ~ '\mbolo\M';

-- ================================================================ 2. fair use for server functions
/** Count one use of `p_key` in the current window; false when that is more than `p_max`. */
create or replace function public.getit_hit(p_key text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = public, private as $$
declare
  secs double precision := extract(epoch from p_window);
  win  timestamptz := to_timestamp(floor(extract(epoch from now()) / secs) * secs);
  n    int;
begin
  insert into private.rate_hits as r (key, window_start, hits) values (left(p_key, 200), win, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;
  if random() < 0.01 then delete from private.rate_hits where window_start < now() - interval '2 days'; end if;
  return n <= p_max;
end $$;
revoke all on function public.getit_hit(text, int, interval) from public, anon, authenticated;
grant execute on function public.getit_hit(text, int, interval) to service_role;
