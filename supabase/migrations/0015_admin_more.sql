-- More for the admin panel, and admin notices that reach the right inbox.
--
-- 1. Notices from the bolo team now come from "bolo", not from the admin's own account (the admin's name and
--    photo used to show on them), and a notice about a business lands in that business's inbox in the app.
-- 2. New: ask a person or a business to verify, write to one account, send an announcement, set the ID badge
--    by hand, suspend a business page, see and remove everything an account posted, close an account.
-- Every action is written to the audit log. Safe to run more than once.

set search_path = public, extensions;

/** A notice from the bolo team. No actor (the app shows "bolo"); always delivered, whatever the person muted. */
create or replace function private.notice(p_user uuid, p_text text, p_target jsonb, p_key text, p_business uuid default null, p_category text default 'account')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into notifications (recipient_id, actor_id, type, category, body, target, event_key, business_id)
  values (p_user, null, 'account', p_category, p_text, p_target, p_key, p_business)
  on conflict (recipient_id, event_key) do update
    set body = excluded.body, target = excluded.target, business_id = excluded.business_id, read_at = null, created_at = now();
end $$;
revoke all on function private.notice(uuid, text, jsonb, text, uuid, text) from public, anon, authenticated;

/** Owners and admins only (not moderators or support). */
create or replace function private.need_senior() returns void language plpgsql as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid() and role in ('owner', 'admin')) then
    raise exception 'only an owner or an admin can do this' using errcode = '42501';
  end if;
end $$;

-- ================================================================ the same actions as before, now from "bolo"
create or replace function public.admin_suspend(p_user uuid, p_on boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  if p_user = auth.uid() then raise exception 'you cannot suspend yourself'; end if;
  if p_on and exists (select 1 from admin_users where user_id = p_user) then raise exception 'remove them as an admin first'; end if;
  update profiles set suspended_at = case when p_on then now() end, suspended_note = case when p_on then nullif(trim(coalesce(p_note, '')), '') end where id = p_user;
  if not found then raise exception 'no such account'; end if;
  perform bolo_audit(case when p_on then 'account.suspend' else 'account.restore' end, 'profiles', p_user::text, jsonb_build_object('note', p_note));
  perform private.notice(p_user,
    case when p_on then 'Your account is suspended' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. Write to bolo from Settings → Help if you think this is a mistake.'
         else 'Your account is active again.' end,
    jsonb_build_object('k', 'me'), 'suspend:' || p_user || ':' || p_on || ':' || extract(epoch from now())::bigint);
end $$;

create or replace function public.admin_review_business(p_business uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare b businesses;
begin
  perform private.need_admin();
  select * into b from businesses where id = p_business for update;
  if not found then raise exception 'no such business'; end if;
  update businesses set verified = case when p_approve then 'verified' else 'none' end where id = p_business;
  update verifications set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   where business_id = p_business and status = 'pending';
  perform bolo_audit(case when p_approve then 'business.approve' else 'business.reject' end, 'businesses', p_business::text, jsonb_build_object('note', p_note, 'name', b.name));
  perform private.notice(b.owner_id,
    case when p_approve then '“' || b.name || '” is now a verified business.'
         else 'We couldn’t verify “' || b.name || '”' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. Check the RCCM and NIU and ask again.' end,
    jsonb_build_object('k', 'verify', 'id', 'business', 'biz', p_business), 'bizverif:' || p_business || ':' || p_approve || ':' || extract(epoch from now())::bigint, p_business);
end $$;

create or replace function public.admin_review_verification(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare v public.verifications;
begin
  perform private.need_admin();
  select * into v from verifications where id = p_id for update;
  if not found then raise exception 'no such verification'; end if;
  update verifications set status = case when p_approve then 'approved' else 'rejected' end, note = p_note, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  if v.kind = 'id' then
    update profiles set verified = p_approve where id = v.user_id;
  elsif v.kind = 'business' then
    update businesses set verified = case when p_approve then 'verified' else 'none' end where id = v.business_id;
  end if;
  perform bolo_audit(case when p_approve then 'verification.approve' else 'verification.reject' end, 'verifications', p_id::text, jsonb_build_object('kind', v.kind, 'user', v.user_id, 'note', p_note));
  perform private.notice(v.user_id,
    case when p_approve then 'Your ' || case v.kind when 'business' then 'business' when 'expert' then 'expert profile' else 'ID' end || ' is verified.'
         else 'Your verification needs another look' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. You can send new documents.' end,
    jsonb_build_object('k', 'verify', 'id', v.kind, 'biz', v.business_id), 'verif:' || p_id || ':' || p_approve,
    case when v.kind = 'business' then v.business_id end);
end $$;

create or replace function public.admin_review_expert(p_user uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  if p_status not in ('review', 'interview', 'approved', 'declined') then raise exception 'bad status'; end if;
  update experts set status = p_status, note = p_note, reviewed_by = auth.uid() where user_id = p_user;
  if not found then raise exception 'no such application'; end if;
  perform bolo_audit('expert.' || p_status, 'experts', p_user::text, jsonb_build_object('note', p_note));
  perform private.notice(p_user,
    case p_status when 'approved' then 'You’re now a bolo Career Expert. Your profile is live.'
                  when 'declined' then 'Your expert application wasn’t approved this time' || coalesce(': ' || p_note, '')
                  when 'interview' then 'Your expert application moved to the interview step.'
                  else 'Your expert application is being reviewed.' end,
    jsonb_build_object('k', 'experts'), 'expert:' || p_user || ':' || p_status);
end $$;

/** Take down a post, job, comment, course listing, internship/program or mentorship. The author is told. */
create or replace function public.admin_remove_content(p_type text, p_id text, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare owner uuid; label text; biz uuid;
begin
  perform private.need_admin();
  if p_type in ('post', 'job') then
    delete from posts where id = p_id returning author_id, coalesce(nullif(title, ''), left(body, 60)), business_id into owner, label, biz;
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
  update reports set status = 'actioned', handled_by = auth.uid(), handled_at = now() where target_type = p_type and target_id = p_id and status in ('open', 'reviewing');
  perform bolo_audit('content.remove', p_type, p_id, jsonb_build_object('note', p_note, 'owner', owner, 'label', label));
  perform private.notice(owner,
    'We removed your ' || case p_type when 'comment' then 'comment' when 'course' then 'course listing' when 'opp' then 'listing' when 'mentor' then 'mentorship' else 'post' end
      || ' “' || coalesce(label, '') || '” because it breaks bolo’s rules' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '.',
    jsonb_build_object('k', 'me'), 'removed:' || p_type || ':' || p_id, biz);
end $$;

-- ================================================================ ask someone to verify
/** Ask a person to verify their ID, or a business (p_business) to send its RCCM and NIU. They get a notice that opens the right screen. */
create or replace function public.admin_request_verification(p_user uuid default null, p_business uuid default null, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare b businesses; who uuid := p_user; v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform private.need_admin();
  if p_business is not null then
    select * into b from businesses where id = p_business;
    if not found then raise exception 'no such business'; end if;
    if b.verified = 'verified' then raise exception 'this business is already verified'; end if;
    who := b.owner_id;
    perform private.notice(who,
      'Please verify “' || b.name || '”: add its RCCM and NIU in your business page' || coalesce('. ' || v_note, '.') ,
      jsonb_build_object('k', 'verify', 'id', 'business', 'biz', p_business), 'verifreq:biz:' || p_business, p_business);
    perform bolo_audit('verification.request', 'businesses', p_business::text, jsonb_build_object('note', v_note, 'name', b.name));
  else
    if who is null then raise exception 'choose an account or a business'; end if;
    if not exists (select 1 from profiles where id = who and deleted_at is null) then raise exception 'no such account'; end if;
    if (select verified from profiles where id = who) then raise exception 'this account is already verified'; end if;
    perform private.notice(who,
      'Please verify your identity: it takes two minutes with your ID and a selfie' || coalesce('. ' || v_note, '.'),
      jsonb_build_object('k', 'verify', 'id', 'id'), 'verifreq:id:' || who);
    perform bolo_audit('verification.request', 'profiles', who::text, jsonb_build_object('note', v_note));
  end if;
end $$;
revoke all on function public.admin_request_verification(uuid, uuid, text) from public, anon;
grant execute on function public.admin_request_verification(uuid, uuid, text) to authenticated;

/** Give or remove the ID badge by hand (for example after checking documents another way). */
create or replace function public.admin_set_verified(p_user uuid, p_on boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  update profiles set verified = p_on where id = p_user and deleted_at is null;
  if not found then raise exception 'no such account'; end if;
  perform bolo_audit('verified.set', 'profiles', p_user::text, jsonb_build_object('on', p_on, 'note', p_note));
  perform private.notice(p_user,
    case when p_on then 'Your identity is verified. You now have the verified badge.'
         else 'Your verified badge was removed' || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), '') || '. You can verify again from your profile.' end,
    jsonb_build_object('k', 'verify', 'id', 'id'), 'verifset:' || p_user || ':' || p_on || ':' || extract(epoch from now())::bigint);
end $$;
revoke all on function public.admin_set_verified(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_verified(uuid, boolean, text) to authenticated;

-- ================================================================ write to one account, or to everyone
/** A message from the bolo team to one account (to its business inbox when p_business is given). */
create or replace function public.admin_message(p_user uuid, p_text text, p_business uuid default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare t text := trim(coalesce(p_text, ''));
begin
  perform private.need_admin();
  if char_length(t) not between 5 and 600 then raise exception 'write between 5 and 600 characters'; end if;
  if not exists (select 1 from profiles where id = p_user and deleted_at is null) then raise exception 'no such account'; end if;
  if p_business is not null and not exists (select 1 from businesses where id = p_business and owner_id = p_user) then raise exception 'that business belongs to someone else'; end if;
  perform bolo_hit('adminmsg', 200, interval '1 hour');
  perform private.notice(p_user, t, jsonb_build_object('k', 'notifs'), 'adminmsg:' || replace(gen_random_uuid()::text, '-', ''), p_business);
  perform bolo_audit('message.send', 'profiles', p_user::text, jsonb_build_object('note', left(t, 200), 'business', p_business));
end $$;
revoke all on function public.admin_message(uuid, text, uuid) from public, anon;
grant execute on function public.admin_message(uuid, text, uuid) to authenticated;

/** An announcement to many accounts at once. Returns how many received it. People who switched "News" off are skipped. */
create or replace function public.admin_announce(p_text text, p_audience text default 'all', p_city text default null)
returns int language plpgsql security definer set search_path = public, private as $$
declare n int; t text := trim(coalesce(p_text, '')); v_city text := nullif(trim(coalesce(p_city, '')), '');
        k text := 'announce:' || replace(gen_random_uuid()::text, '-', '');
begin
  perform private.need_admin();
  perform private.need_senior();
  if char_length(t) not between 10 and 500 then raise exception 'write between 10 and 500 characters'; end if;
  if p_audience not in ('all', 'workers', 'hirers', 'businesses', 'verified') then raise exception 'unknown audience'; end if;
  perform bolo_hit('announce', 5, interval '1 day');
  if p_audience = 'businesses' then
    insert into notifications (recipient_id, actor_id, type, category, body, target, event_key, business_id)
    select distinct on (b.owner_id) b.owner_id, null, 'account', 'news', t, jsonb_build_object('k', 'notifs'), k, b.id
      from businesses b join profiles p on p.id = b.owner_id
     where p.deleted_at is null and p.suspended_at is null and (v_city is null or b.city ilike v_city)
       and not exists (select 1 from notification_prefs np where np.user_id = b.owner_id and np.category = 'news' and not np.enabled)
     order by b.owner_id, b.created_at
    on conflict (recipient_id, event_key) do nothing;
  else
    insert into notifications (recipient_id, actor_id, type, category, body, target, event_key)
    select p.id, null, 'account', 'news', t, jsonb_build_object('k', 'notifs'), k
      from profiles p
     where p.deleted_at is null and p.suspended_at is null and (v_city is null or p.city ilike v_city)
       and case p_audience when 'workers' then cardinality(p.skills) > 0 when 'hirers' then cardinality(p.skills) = 0 when 'verified' then p.verified else true end
       and not exists (select 1 from notification_prefs np where np.user_id = p.id and np.category = 'news' and not np.enabled)
    on conflict (recipient_id, event_key) do nothing;
  end if;
  get diagnostics n = row_count;
  perform bolo_audit('announce.send', 'notifications', k, jsonb_build_object('note', left(t, 200), 'audience', p_audience, 'city', v_city, 'sent', n));
  return n;
end $$;
revoke all on function public.admin_announce(text, text, text) from public, anon;
grant execute on function public.admin_announce(text, text, text) to authenticated;

-- ================================================================ business pages: search, suspend
alter table public.businesses add column if not exists suspended_at timestamptz;
alter table public.businesses add column if not exists suspended_note text;

drop function if exists public.admin_businesses(text);
create or replace function public.admin_businesses(p_status text default 'review', p_query text default null) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare q text := nullif(trim(coalesce(p_query, '')), '');
begin
  perform private.need_admin();
  return (select coalesce(jsonb_agg(x), '[]') from (
    select b.id, b.name, b.sector, b.size, b.city, b.area, b.address, b.phone, b.email, b.web, b.about, b.logo_url, b.verified, b.created_at,
           b.suspended_at, b.suspended_note, bp.rccm, bp.niu, b.owner_id, p.name as owner, u.email as owner_email, p.verified as owner_verified,
           (select count(*) from posts where business_id = b.id) as posts
    from businesses b left join business_private bp on bp.business_id = b.id join profiles p on p.id = b.owner_id join auth.users u on u.id = b.owner_id
    where case coalesce(p_status, 'review') when 'all' then true when 'suspended' then b.suspended_at is not null else b.verified = coalesce(p_status, 'review') end
      and (q is null or b.name ilike '%' || q || '%' or b.city ilike '%' || q || '%' or p.name ilike '%' || q || '%' or u.email ilike '%' || q || '%')
    order by b.created_at desc limit 200) x);
end $$;
revoke all on function public.admin_businesses(text, text) from public, anon;
grant execute on function public.admin_businesses(text, text) to authenticated;

/** Suspend a business page (or lift it): its posts leave the lists and it cannot publish anything new. The owner is told why. */
create or replace function public.admin_suspend_business(p_business uuid, p_on boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare b businesses; v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform private.need_admin();
  update businesses set suspended_at = case when p_on then now() end, suspended_note = case when p_on then v_note end where id = p_business returning * into b;
  if not found then raise exception 'no such business'; end if;
  perform bolo_audit(case when p_on then 'business.suspend' else 'business.restore' end, 'businesses', p_business::text, jsonb_build_object('note', v_note, 'name', b.name));
  perform private.notice(b.owner_id,
    case when p_on then '“' || b.name || '” is suspended' || coalesce(': ' || v_note, '') || '. Its vacancies are hidden. Write to bolo from Settings → Help if you think this is a mistake.'
         else '“' || b.name || '” is active again.' end,
    jsonb_build_object('k', 'notifs'), 'bizsuspend:' || p_business || ':' || p_on || ':' || extract(epoch from now())::bigint, p_business);
end $$;
revoke all on function public.admin_suspend_business(uuid, boolean, text) from public, anon;
grant execute on function public.admin_suspend_business(uuid, boolean, text) to authenticated;

-- a suspended business publishes nothing new
create or replace function public.stop_suspended_business() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.business_id is not null and exists (select 1 from businesses where id = new.business_id and suspended_at is not null) then
    raise exception 'This business page is suspended. Write to bolo from Settings → Help.';
  end if;
  return new;
end $$;
drop trigger if exists posts_business_ok on public.posts;
create trigger posts_business_ok before insert on public.posts for each row execute function public.stop_suspended_business();
drop trigger if exists opportunities_business_ok on public.opportunities;
create trigger opportunities_business_ok before insert on public.opportunities for each row execute function public.stop_suspended_business();
drop trigger if exists mentorships_business_ok on public.mentorships;
create trigger mentorships_business_ok before insert on public.mentorships for each row execute function public.stop_suspended_business();
drop trigger if exists course_listings_business_ok on public.course_listings;
create trigger course_listings_business_ok before insert on public.course_listings for each row execute function public.stop_suspended_business();

-- and what it already posted leaves the feed (its owner still sees it)
create or replace view public.post_feed with (security_invoker = true) as
  select p.id, p.author_id, p.business_id, p.kind, p.title, p.body, p.photos, p.cat, p.area, p.status, p.urgent, p.budget_num, p.data, p.created_at,
         st_x(p.location::geometry) as lng, st_y(p.location::geometry) as lat,
         coalesce(s.likes, 0) as likes, coalesce(s.comments, 0) as comments, coalesce(s.offers, 0) as offers
  from public.posts p left join public.post_stats s on s.post_id = p.id
  where p.author_id = auth.uid()
     or (not exists (select 1 from public.profiles x where x.id = p.author_id and x.suspended_at is not null)
         and not exists (select 1 from public.businesses b where b.id = p.business_id and b.suspended_at is not null));
grant select on public.post_feed to anon, authenticated;

-- ================================================================ everything an account posted
create or replace function public.admin_content(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  return jsonb_build_object(
    'posts', (select coalesce(jsonb_agg(x), '[]') from (
        select p.id, case when p.kind = 'request' then 'job' else 'post' end as type, p.kind, p.title, left(p.body, 300) as body, p.status, p.created_at, b.name as business
          from posts p left join businesses b on b.id = p.business_id where p.author_id = p_user order by p.created_at desc limit 60) x),
    'comments', (select coalesce(jsonb_agg(x), '[]') from (
        select c.id, left(c.body, 300) as body, c.created_at, c.post_id from comments c where c.author_id = p_user order by c.created_at desc limit 60) x),
    'courses', (select coalesce(jsonb_agg(x), '[]') from (
        select c.id, c.title, c.url, c.created_at from course_listings c where c.owner_id = p_user order by c.created_at desc limit 30) x),
    'opps', (select coalesce(jsonb_agg(x), '[]') from (
        select o.id, o.kind, o.title, o.status, o.created_at from opportunities o where o.owner_id = p_user order by o.created_at desc limit 30) x),
    'mentorships', (select coalesce(jsonb_agg(x), '[]') from (
        select m.id, m.title, m.created_at from mentorships m where m.owner_id = p_user order by m.created_at desc limit 30) x));
end $$;
revoke all on function public.admin_content(uuid) from public, anon;
grant execute on function public.admin_content(uuid) to authenticated;

-- ================================================================ close an account for good
/** First step of closing someone's account from the panel (owners only): hides the profile at once and records who did it.
    The delete-account function then removes the files and the account itself. */
create or replace function public.admin_close_account(p_user uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  perform private.need_admin();
  perform private.need_owner();
  if p_user = auth.uid() then raise exception 'close your own account from the app'; end if;
  if exists (select 1 from admin_users where user_id = p_user) then raise exception 'remove them as an admin first'; end if;
  if nullif(trim(coalesce(p_note, '')), '') is null then raise exception 'write the reason'; end if;
  update profiles set deleted_at = coalesce(deleted_at, now()) where id = p_user;
  if not found then raise exception 'no such account'; end if;
  delete from push_tokens where user_id = p_user;
  perform bolo_audit('account.close', 'profiles', p_user::text, jsonb_build_object('note', p_note, 'name', (select name from profiles where id = p_user)));
end $$;
revoke all on function public.admin_close_account(uuid, text) from public, anon;
grant execute on function public.admin_close_account(uuid, text) to authenticated;
