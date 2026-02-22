-- ============================================================
-- Reunion Project Supabase Setup SQL
-- Project: reunion (urlfmhgurdrernlpuyjj)
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Site settings table
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

-- 2) Registrations table
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  group_name text not null check (group_name in ('science','humanities','business')),
  profession text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_registrations_created_at on public.registrations (created_at desc);
create unique index if not exists idx_registrations_phone_unique_normalized on public.registrations ((regexp_replace(phone, '[^0-9+]', '', 'g')));

-- Safe schema upgrade: add optional comment field without touching old data
alter table public.registrations add column if not exists comment text;

-- 2.1) Banner images table (stores uploaded slider images)
create table if not exists public.banner_images (
  id bigint generated always as identity primary key,
  image_data text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_banner_images_created_at on public.banner_images (created_at asc);

-- 3) Approved admin emails
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

-- 4) RLS enable
alter table public.site_settings enable row level security;
alter table public.registrations enable row level security;
alter table public.banner_images enable row level security;
alter table public.admin_approved_emails enable row level security;

-- 5) Reset old policies (idempotent)
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
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registrations' AND policyname='registrations_delete_admin_only') THEN
    DROP POLICY registrations_delete_admin_only ON public.registrations;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='banner_images' AND policyname='banner_images_select_all') THEN
    DROP POLICY banner_images_select_all ON public.banner_images;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='banner_images' AND policyname='banner_images_insert_all') THEN
    DROP POLICY banner_images_insert_all ON public.banner_images;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='banner_images' AND policyname='banner_images_delete_admin_only') THEN
    DROP POLICY banner_images_delete_admin_only ON public.banner_images;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_approved_emails' AND policyname='admin_approved_emails_self_select') THEN
    DROP POLICY admin_approved_emails_self_select ON public.admin_approved_emails;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_approved_emails' AND policyname='admin_approved_emails_block_insert') THEN
    DROP POLICY admin_approved_emails_block_insert ON public.admin_approved_emails;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_approved_emails' AND policyname='admin_approved_emails_block_update') THEN
    DROP POLICY admin_approved_emails_block_update ON public.admin_approved_emails;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_approved_emails' AND policyname='admin_approved_emails_block_delete') THEN
    DROP POLICY admin_approved_emails_block_delete ON public.admin_approved_emails;
  END IF;
END$$;

-- prototype-friendly policies
create policy site_settings_select_all
on public.site_settings
for select
to anon, authenticated
using (true);

create policy site_settings_upsert_all
on public.site_settings
for all
to anon, authenticated
using (true)
with check (true);

create policy registrations_select_all
on public.registrations
for select
to anon, authenticated
using (true);

create policy registrations_insert_all
on public.registrations
for insert
to anon, authenticated
with check (true);

create policy banner_images_select_all
on public.banner_images
for select
to anon, authenticated
using (true);

create policy banner_images_insert_all
on public.banner_images
for insert
to anon, authenticated
with check (true);

create policy banner_images_delete_admin_only
on public.banner_images
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_approved_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.is_active = true
  )
);


create policy registrations_delete_admin_only
on public.registrations
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_approved_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.is_active = true
  )
);

-- Admin approval check policy:
-- Authenticated user can only read own email row if active=true.
create policy admin_approved_emails_self_select
on public.admin_approved_emails
for select
to authenticated
using (
  is_active = true
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Block client-side write operations
create policy admin_approved_emails_block_insert
on public.admin_approved_emails
for insert
to anon, authenticated
with check (false);

create policy admin_approved_emails_block_update
on public.admin_approved_emails
for update
to anon, authenticated
using (false)
with check (false);

create policy admin_approved_emails_block_delete
on public.admin_approved_emails
for delete
to anon, authenticated
using (false);

-- 6) Approve one admin email (edit this value)
insert into public.admin_approved_emails (email, is_active, approved_by)
values ('your-admin@email.com', true, 'owner')
on conflict (email)
do update set is_active = true, approved_at = now();

-- revoke example:
-- update public.admin_approved_emails set is_active = false where lower(email)=lower('your-admin@email.com');


-- Admin-safe delete RPC (works even when table RLS policies differ)
create or replace function public.delete_registration_admin(reg_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1
    from public.admin_approved_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.is_active = true
  ) into is_admin;

  if not is_admin then
    return false;
  end if;

  delete from public.registrations where id = reg_id;
  return true;
end;
$$;

revoke all on function public.delete_registration_admin(bigint) from public;
grant execute on function public.delete_registration_admin(bigint) to authenticated;
