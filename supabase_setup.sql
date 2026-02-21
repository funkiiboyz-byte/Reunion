-- ============================================================
-- Reunion Project Supabase Setup SQL
-- Project: reunion (urlfmhgurdrernlpuyjj)
-- ============================================================

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Site settings table (admin panel content controls)
create table if not exists public.site_settings (
  id bigint primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, settings)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

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

-- 3) Admin approved email list
create table if not exists public.admin_approved_emails (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  is_active boolean not null default true,
  approved_by text,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_admin_approved_emails_lower
on public.admin_approved_emails (lower(email));

-- Secure helper function: check if email is approved admin
create or replace function public.is_admin_email_approved(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_approved_emails a
    where lower(a.email) = lower(check_email)
      and a.is_active = true
  );
$$;

revoke all on function public.is_admin_email_approved(text) from public;
grant execute on function public.is_admin_email_approved(text) to anon, authenticated;

-- 4) RLS enable
alter table public.site_settings enable row level security;
alter table public.registrations enable row level security;
alter table public.admin_approved_emails enable row level security;

-- Drop old policies if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='site_settings_select_all') THEN
    DROP POLICY site_settings_select_all ON public.site_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='site_settings_upsert_all') THEN
    DROP POLICY site_settings_upsert_all ON public.site_settings;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registrations' AND policyname='registrations_select_all') THEN
    DROP POLICY registrations_select_all ON public.registrations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registrations' AND policyname='registrations_insert_all') THEN
    DROP POLICY registrations_insert_all ON public.registrations;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_approved_emails' AND policyname='admin_approved_emails_no_direct_access') THEN
    DROP POLICY admin_approved_emails_no_direct_access ON public.admin_approved_emails;
  END IF;
END$$;

-- prototype-friendly policies for site settings and registrations
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

-- no direct table read for admin approved emails from anon/authenticated
create policy admin_approved_emails_no_direct_access
on public.admin_approved_emails
for all
to anon, authenticated
using (false)
with check (false);

-- 5) Helper SQL for approving an admin email manually (run as needed)
-- replace with your real admin email
insert into public.admin_approved_emails (email, is_active, approved_by)
values ('your-admin@email.com', true, 'owner')
on conflict (email)
do update set is_active = true, approved_at = now();

-- Example disable admin
-- update public.admin_approved_emails set is_active = false where lower(email)=lower('your-admin@email.com');
