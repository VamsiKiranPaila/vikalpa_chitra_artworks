-- Vikalpa Chitra: lock artwork management to approved manager accounts.
-- Run this AFTER supabase-setup.sql.
--
-- 1) In Supabase Authentication → Users, create/verify the manager's PHONE user.
-- 2) Copy that user's UUID.
-- 3) Replace YOUR-MANAGER-USER-UUID below and run this file.
--
-- Keep phone OTP user creation restricted: the website calls signInWithOtp()
-- with shouldCreateUser=false, so an unknown phone number cannot create a manager account.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

-- Add the manager user here:
-- insert into public.admin_users(user_id)
-- values ('YOUR-MANAGER-USER-UUID');

drop policy if exists "Authenticated can manage artworks" on public.artworks;
drop policy if exists "Admins can manage artworks" on public.artworks;
create policy "Admins can manage artworks"
on public.artworks for all
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Authenticated can upload artwork media" on storage.objects;
drop policy if exists "Authenticated can update artwork media" on storage.objects;
drop policy if exists "Authenticated can delete artwork media" on storage.objects;
drop policy if exists "Admins can upload artwork media" on storage.objects;
drop policy if exists "Admins can update artwork media" on storage.objects;
drop policy if exists "Admins can delete artwork media" on storage.objects;

create policy "Admins can upload artwork media"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('artworks','audio')
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "Admins can update artwork media"
on storage.objects for update
to authenticated
using (
  bucket_id in ('artworks','audio')
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
)
with check (
  bucket_id in ('artworks','audio')
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

create policy "Admins can delete artwork media"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('artworks','audio')
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);
