-- Platepal: initial schema. Row Level Security on every table:
-- a user only sees and changes their own rows. Inserts and the full recipe body
-- go through the server (service role), which checks the plan with Kwop first.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  k text check (k is null or k ~ '^[A-Za-z0-9]{1,12}$'),
  intended_plan text,
  source jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  diet text[] not null default '{}',
  calorie_target int check (calorie_target is null or calorie_target between 200 and 2000),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Users may only change their own preferences, never their k / attribution.
revoke update on public.profiles from authenticated;
grant update (diet, calorie_target, answers) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- recipes (the teaser part: safe to show) ----------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  anon_id text,
  ip_hash text,
  photo_path text,
  source text not null default 'photo' check (source in ('photo', 'example', 'list', 'remix')),
  title text not null,
  intro text not null default '',
  time_minutes int not null default 20,
  servings int not null default 2,
  difficulty text not null default 'Easy',
  found jsonb not null default '[]'::jsonb,
  uses text[] not null default '{}',
  diet text[] not null default '{}',
  is_favorite boolean not null default false,
  parent_id uuid references public.recipes (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_created on public.recipes (user_id, created_at desc);
create index if not exists recipes_anon_created on public.recipes (anon_id, created_at desc);
create index if not exists recipes_ip_created on public.recipes (ip_hash, created_at desc);
create index if not exists recipes_parent on public.recipes (parent_id);

alter table public.recipes enable row level security;

create policy "recipes: read own" on public.recipes
  for select to authenticated using (user_id = auth.uid());
create policy "recipes: update own" on public.recipes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recipes: delete own" on public.recipes
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.recipes from authenticated;
grant update (is_favorite) on public.recipes to authenticated;

-- ---------- recipe bodies (the paid part: server only) ----------
create table if not exists public.recipe_bodies (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  body jsonb not null
);
alter table public.recipe_bodies enable row level security;
-- No policies on purpose: only the server (service role) reads bodies, after checking the plan.

-- ---------- checkouts (refs we created, to confirm payments) ----------
create table if not exists public.checkouts (
  ref text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id int not null,
  period text not null check (period in ('month', 'year')),
  is_upgrade boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.checkouts enable row level security;
create policy "checkouts: read own" on public.checkouts
  for select to authenticated using (user_id = auth.uid());

-- ---------- storage: private fridge photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fridge-photos', 'fridge-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'fridge-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fridge-photos' and (storage.foldername(name))[1] = auth.uid()::text);
