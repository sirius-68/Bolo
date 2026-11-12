-- Push notifications (Firebase Cloud Messaging).
-- Every new notification row (a message, an offer, a booking step, a call…) asks the `push` server
-- function to send a phone pop-up to the recipient's phones. Category switches and muted chats are
-- already respected when the notification row is made (bolo_notify / bolo_notify_upsert).
-- The function address and its shared secret are written by the function itself at deploy time
-- (set_push_config, service role only), so nothing secret lives in this file or the repo.

do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available here: push notifications stay off';
end $$;

create table if not exists private.push_config (
  id     int primary key default 1 check (id = 1),
  url    text not null,
  secret text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.push_config from public, anon, authenticated;

/** Called by the push function when it is deployed: where to send new notifications, and the secret it checks. */
create or replace function public.set_push_config(p_url text, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_url, '') !~ '^https://' or char_length(coalesce(p_secret, '')) < 24 then
    raise exception 'bad push config';
  end if;
  insert into private.push_config (id, url, secret) values (1, p_url, p_secret)
  on conflict (id) do update set url = excluded.url, secret = excluded.secret, updated_at = now();
end $$;
revoke all on function public.set_push_config(text, text) from public, anon, authenticated;
grant execute on function public.set_push_config(text, text) to service_role;

/** New (or re-raised) notification → ask the push function to send it. Never blocks the notification itself. */
create or replace function public.push_on_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg private.push_config;
begin
  if new.read_at is not null then return new; end if;
  -- updates only count when the notification was raised again (a new message in the same chat)
  if tg_op = 'UPDATE' and new.created_at is not distinct from old.created_at then return new; end if;
  if not exists (select 1 from push_tokens where user_id = new.recipient_id) then return new; end if;
  select * into cfg from private.push_config where id = 1;
  if cfg.url is null or to_regnamespace('net') is null then return new; end if;
  begin
    perform net.http_post(
      url := cfg.url,
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret),
      timeout_milliseconds := 8000
    );
  exception when others then
    raise warning 'push: could not queue %', sqlerrm;
  end;
  return new;
end $$;
revoke all on function public.push_on_notification() from public, anon, authenticated;

drop trigger if exists notification_push on public.notifications;
create trigger notification_push after insert or update of created_at on public.notifications
for each row execute function public.push_on_notification();

-- a phone that signs out removes its own token (already allowed by the "remove own push tokens" policy)
grant delete on public.push_tokens to authenticated;
