-- Vikalpa Chitra content manager setup
-- Run this in Supabase SQL Editor.
-- IMPORTANT: never put a Supabase service_role key in your website.

create table if not exists public.artworks (
  id text primary key,
  title text not null,
  year integer,
  medium text,
  dimensions text,
  location text,
  story text,
  image_url text,
  image_path text,
  audio_url text,
  audio_path text,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artworks enable row level security;

drop policy if exists "Public can view published artworks" on public.artworks;
create policy "Public can view published artworks"
on public.artworks for select
to anon, authenticated
using (published = true);

drop policy if exists "Authenticated can manage artworks" on public.artworks;
create policy "Authenticated can manage artworks"
on public.artworks for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id,name,public)
values ('artworks','artworks',true), ('audio','audio',true)
on conflict (id) do nothing;

drop policy if exists "Public can view artwork media" on storage.objects;
create policy "Public can view artwork media"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('artworks','audio'));

drop policy if exists "Authenticated can upload artwork media" on storage.objects;
create policy "Authenticated can upload artwork media"
on storage.objects for insert
to authenticated
with check (bucket_id in ('artworks','audio'));

drop policy if exists "Authenticated can update artwork media" on storage.objects;
create policy "Authenticated can update artwork media"
on storage.objects for update
to authenticated
using (bucket_id in ('artworks','audio'))
with check (bucket_id in ('artworks','audio'));

drop policy if exists "Authenticated can delete artwork media" on storage.objects;
create policy "Authenticated can delete artwork media"
on storage.objects for delete
to authenticated
using (bucket_id in ('artworks','audio'));
