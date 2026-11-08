-- Free accounts: one full recipe a week, unlocked by the person from the paywall.
create table if not exists public.free_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
create index if not exists free_unlocks_user_created on public.free_unlocks (user_id, created_at desc);
alter table public.free_unlocks enable row level security;
create policy "free_unlocks: read own" on public.free_unlocks for select to authenticated using (user_id = auth.uid());
