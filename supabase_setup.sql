-- Run এই SQL Supabase SQL Editor এ
-- Project: reunion (urlfmhgurdrernlpuyjj)

-- 1) Site settings table (admin panel content controls)
create table if not exists public.site_settings (
  id bigint primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, settings)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- updated_at auto update trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- 2) Registrations table (who registered)
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  group_name text not null check (group_name in ('science','humanities','business')),
  profession text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_registrations_created_at on public.registrations (created_at desc);

-- 3) RLS enable
alter table public.site_settings enable row level security;
alter table public.registrations enable row level security;

-- পুরানো policy থাকলে drop
-- site_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='site_settings_select_all') THEN
    DROP POLICY site_settings_select_all ON public.site_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='site_settings_upsert_all') THEN
    DROP POLICY site_settings_upsert_all ON public.site_settings;
  END IF;
END$$;

create policy site_settings_select_all
on public.site_settings
for select
to anon
using (true);

create policy site_settings_upsert_all
on public.site_settings
for all
to anon
using (true)
with check (true);

-- registrations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registrations' AND policyname='registrations_select_all') THEN
    DROP POLICY registrations_select_all ON public.registrations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registrations' AND policyname='registrations_insert_all') THEN
    DROP POLICY registrations_insert_all ON public.registrations;
  END IF;
END$$;

create policy registrations_select_all
on public.registrations
for select
to anon
using (true);

create policy registrations_insert_all
on public.registrations
for insert
to anon
with check (true);

-- Optional: শুধু admin user ব্যবহারের জন্য stronger policy পরে tighten করো.
