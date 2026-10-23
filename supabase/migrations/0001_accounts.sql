-- bolo · phase 1: accounts, profiles and business pages
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles (public part)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  avatar_url   text,
  city         text not null default 'Buea',
  bio          text not null default '',
  role         text not null default 'worker' check (role in ('worker', 'client')),
  biz_only     boolean not null default false,
  intents      text[] not null default '{}',
  skills       text[] not null default '{}',
  skill_list   jsonb,
  level        text,
  years        int not null default 0,
  work_status  text not null default 'open',
  hire_status  text not null default 'hiring',
  area         jsonb,
  experience   jsonb not null default '[]',
  education    jsonb,
  languages    jsonb not null default '[]',
  services     jsonb,
  -- set by bolo only (payments / verification), never by the app
  pro_regular  boolean not null default false,
  pro_business boolean not null default false,
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- profiles (private part: only the owner)
create table if not exists public.profiles_private (
  id         uuid primary key references public.profiles(id) on delete cascade,
  phone      text,
  email      text,
  contacts   jsonb not null default '{}',
  cv         jsonb,
  prefs      jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
drop trigger if exists profiles_private_touch on public.profiles_private;
create trigger profiles_private_touch before update on public.profiles_private for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- business pages
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  client_id   text not null,                       -- the id the app created offline
  name        text not null default '',
  sector      text not null default '',
  size        text not null default '',
  city        text not null default 'Buea',
  area        text not null default '',
  address     text not null default '',
  phone       text not null default '',
  email       text not null default '',
  web         text not null default '',
  about       text not null default '',
  logo_url    text,
  color       text not null default '#f6ee5c',
  hire_areas  text[] not null default '{}',
  hire_types  text[] not null default '{}',
  recruiters  jsonb not null default '[]',
  -- set by bolo only
  verified    text not null default 'none' check (verified in ('none', 'review', 'verified')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, client_id)
);
create index if not exists businesses_owner_idx on public.businesses(owner_id);
drop trigger if exists businesses_touch on public.businesses;
create trigger businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();

-- registration numbers: only the owner (and bolo staff) can read them
create table if not exists public.business_private (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  rccm        text not null default '',
  niu         text not null default '',
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- new user → empty profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, biz_only)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), coalesce((new.raw_user_meta_data->>'biz_only')::boolean, false))
  on conflict (id) do nothing;
  insert into public.profiles_private (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- ask bolo to verify a business
create or replace function public.request_business_verification(bid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select b.verified into st from businesses b where b.id = bid and b.owner_id = auth.uid();
  if st is null then raise exception 'not your business'; end if;
  if not exists (select 1 from business_private p where p.business_id = bid and p.rccm <> '' and p.niu <> '') then
    raise exception 'add RCCM and NIU first';
  end if;
  if st = 'none' then update businesses set verified = 'review' where id = bid; st := 'review'; end if;
  return st;
end $$;

-- ---------------------------------------------------------------- row level security
alter table public.profiles          enable row level security;
alter table public.profiles_private  enable row level security;
alter table public.businesses        enable row level security;
alter table public.business_private  enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own private" on public.profiles_private;
create policy "own private" on public.profiles_private for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "businesses readable" on public.businesses;
create policy "businesses readable" on public.businesses for select using (true);
drop policy if exists "own businesses insert" on public.businesses;
create policy "own businesses insert" on public.businesses for insert with check (auth.uid() = owner_id);
drop policy if exists "own businesses update" on public.businesses;
create policy "own businesses update" on public.businesses for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "own businesses delete" on public.businesses;
create policy "own businesses delete" on public.businesses for delete using (auth.uid() = owner_id);

drop policy if exists "own business docs" on public.business_private;
create policy "own business docs" on public.business_private for all
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));

-- the app may not change plan or verification fields
revoke update on public.profiles from anon, authenticated;
grant update (name, avatar_url, city, bio, role, intents, skills, skill_list, level, years, work_status, hire_status, area, experience, education, languages, services)
  on public.profiles to authenticated;
revoke insert, update on public.businesses from anon, authenticated;
grant insert (owner_id, client_id, name, sector, size, city, area, address, phone, email, web, about, logo_url, color, hire_areas, hire_types, recruiters)
  on public.businesses to authenticated;
grant update (name, sector, size, city, area, address, phone, email, web, about, logo_url, color, hire_areas, hire_types, recruiters)
  on public.businesses to authenticated;

-- ---------------------------------------------------------------- photos (profile pictures, logos)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars own write" on storage.objects;
create policy "avatars own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
