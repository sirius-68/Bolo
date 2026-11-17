-- 0018: pop-ups that clear on every phone, admin roles that mean something, and one page of all content.
--   • Reading a chat (or any notification) on one phone removes its pop-up from the person's other phones.
--   • Admin roles: support reads and answers; moderators also review, remove and suspend; admins also announce;
--     owners also change settings, the admin team and close accounts. Checked in one place, on the server.
--   • admin_latest_content: the newest posts, jobs and comments of everyone, for the panel's Content page.
-- Safe to run more than once.
set search_path = public, extensions;

-- ================================================================ pop-ups clear on the other phones
/** The name a notification's pop-up is shown under on the phone (the push function uses the same rule). */
create or replace function private.push_tag(n public.notifications) returns text language sql immutable as $$
  select case when n.type in ('call', 'missed') and n.target->>'k' = 'chat' then 'calls:' || (n.target->>'id') else n.event_key end;
$$;

/** Notifications were read: tell the reader's phones to take their pop-ups down. One request per person and
    statement, only for people who have a phone that can do it ("r2"). Never blocks the update itself. */
create or replace function public.push_clear_on_read() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare cfg private.push_config; r record;
begin
  select * into cfg from private.push_config where id = 1;
  if cfg.url is null or to_regnamespace('net') is null then return null; end if;
  for r in
    select n.recipient_id as uid, jsonb_agg(distinct private.push_tag(n)) as tags
      from new_rows n join old_rows o on o.id = n.id
     where o.read_at is null and n.read_at is not null and n.event_key is not null
       and exists (select 1 from push_tokens t where t.user_id = n.recipient_id and t.app_version ~ '\mr2\M')
     group by n.recipient_id
     limit 50
  loop
    begin
      perform net.http_post(
        url := cfg.url,
        body := jsonb_build_object('clear', jsonb_build_object('user', r.uid, 'tags', r.tags)),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret),
        timeout_milliseconds := 8000
      );
    exception when others then
      raise warning 'push: could not queue a clear: %', sqlerrm;
    end;
  end loop;
  return null;
end $$;
revoke all on function public.push_clear_on_read() from public, anon, authenticated;

drop trigger if exists notification_cleared on public.notifications;
create trigger notification_cleared after update on public.notifications
referencing old table as old_rows new table as new_rows
for each statement execute function public.push_clear_on_read();

-- ================================================================ admin roles
-- Every admin action is written to the audit log through bolo_audit, in the same transaction as the action
-- itself. Checking the role here covers all of them at once: an action the role may not take is refused and
-- undone, and nothing is logged. (Owner-only and owner-or-admin actions keep their own checks as well.)
create or replace function public.bolo_audit(p_action text, p_table text, p_id text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  select role into v_role from admin_users where user_id = auth.uid();
  if v_role = 'support' and p_action !~ '^(feedback\.|message\.send$|account\.delete_requested$)' then
    raise exception 'Support can read everything, answer feedback and message people. Ask a moderator to do this.' using errcode = '42501';
  end if;
  if v_role = 'moderator' and p_action ~ '^(announce\.|pro\.|config\.|admin\.|account\.close$)' then
    raise exception 'Only an owner or an admin can do this.' using errcode = '42501';
  end if;
  insert into public.audit_log (actor_id, action, target_table, target_id, data) values (auth.uid(), p_action, p_table, p_id, coalesce(p_data, '{}'));
end $$;
revoke all on function public.bolo_audit(text, text, text, jsonb) from public, anon, authenticated;

-- ================================================================ the Content page
/** The newest content of everyone: 'posts' (feed posts), 'jobs' (jobs and vacancies) or 'comments', with who
    wrote it. p_query looks in the text. */
create or replace function public.admin_latest_content(p_kind text default 'posts', p_query text default null, p_limit int default 60)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare q text := nullif(trim(coalesce(p_query, '')), ''); n int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  perform private.need_admin();
  if p_kind = 'comments' then
    return (select coalesce(jsonb_agg(x), '[]') from (
      select 'comment' as type, c.id::text as id, null::text as title, left(c.body, 400) as body, c.created_at, c.author_id, pr.name as author,
             null::text as business, null::text as status, (select count(*)::int from reports r where r.target_type = 'comment' and r.target_id = c.id::text) as reports
        from comments c left join profiles pr on pr.id = c.author_id
       where q is null or c.body ilike '%' || q || '%'
       order by c.created_at desc limit n) x);
  elsif p_kind in ('posts', 'jobs') then
    return (select coalesce(jsonb_agg(x), '[]') from (
      select case when p.kind = 'request' then 'job' else 'post' end as type, p.id::text as id, p.title, left(p.body, 400) as body, p.created_at, p.author_id, pr.name as author,
             b.name as business, p.status, (select count(*)::int from reports r where r.target_type in ('post', 'job') and r.target_id = p.id::text) as reports,
             coalesce(array_length(p.photos, 1), 0) as photos
        from posts p left join profiles pr on pr.id = p.author_id left join businesses b on b.id = p.business_id
       where (p.kind = 'request') = (p_kind = 'jobs')
         and (q is null or p.body ilike '%' || q || '%' or p.title ilike '%' || q || '%')
       order by p.created_at desc limit n) x);
  end if;
  raise exception 'unknown kind';
end $$;
revoke all on function public.admin_latest_content(text, text, int) from public, anon;
grant execute on function public.admin_latest_content(text, text, int) to authenticated;
