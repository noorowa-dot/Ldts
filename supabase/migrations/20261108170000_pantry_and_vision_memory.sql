-- 1) "Check your spice cabinet": what each person told us they have (or ran out of) in their cupboard.
--    Used to pre-fill the pantry check on every recipe, to tell the chef what it may use next time,
--    and to mark items "already at home" on the shopping list.
create table if not exists public.pantry_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 60),       -- normalized name ("smoked paprika")
  name text not null check (char_length(name) between 1 and 60),     -- display name ("Smoked Paprika")
  status text not null check (status in ('have', 'out')),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.pantry_items enable row level security;
create policy "pantry_items: read own" on public.pantry_items for select to authenticated using (user_id = auth.uid());
-- Writes go through the server (service role) only.

-- 2) The fridge reader learns: every "Fix the ingredients" on a photo is stored as feedback
--    (what the AI saw wrongly, what it missed). The most frequent mix-ups and misses, globally and per person,
--    are fed back into the photo prompt. Server-only: RLS on, no policies.
create table if not exists public.vision_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  removed text[] not null default '{}',   -- detected, but wrong
  added text[] not null default '{}',     -- missed by the AI
  kept text[] not null default '{}',      -- detected and confirmed
  created_at timestamptz not null default now()
);
create index if not exists vision_feedback_created on public.vision_feedback (created_at desc);
create index if not exists vision_feedback_user on public.vision_feedback (user_id, created_at desc);
alter table public.vision_feedback enable row level security;
