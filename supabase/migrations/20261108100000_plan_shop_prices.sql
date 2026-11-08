-- Week planner, shopping list and price comparison.
-- RLS on every table: a user only sees their own rows. Writes go through the server (service role),
-- which validates input and checks the plan with Kwop.

alter table public.profiles add column if not exists stores text[] not null default '{Kroger,Walmart,Aldi}';
alter table public.profiles add column if not exists zip text check (zip is null or zip ~ '^[0-9]{5}$');

-- ---------- planned meals ----------
create table if not exists public.plan_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,               -- the Monday of the week
  day smallint not null check (day between 0 and 6),
  slot text not null default 'dinner' check (slot in ('lunch', 'dinner')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings smallint not null default 2 check (servings between 1 and 12),
  created_at timestamptz not null default now()
);
create index if not exists plan_meals_user_week on public.plan_meals (user_id, week_start);
alter table public.plan_meals enable row level security;
create policy "plan_meals: read own" on public.plan_meals for select to authenticated using (user_id = auth.uid());

-- ---------- shopping list ----------
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  name text not null check (char_length(name) between 1 and 60),
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'count',
  buy text not null default '',
  aisle text not null default 'Other',
  for_meals text[] not null default '{}',
  source text not null default 'plan' check (source in ('plan', 'manual')),
  have_at_home boolean not null default false,
  checked boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shop_items_user_week on public.shop_items (user_id, week_start);
alter table public.shop_items enable row level security;
create policy "shop_items: read own" on public.shop_items for select to authenticated using (user_id = auth.uid());

-- ---------- the person's own price book (what they pay at each store) ----------
create table if not exists public.price_book (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 60),   -- normalized item name
  store text not null check (char_length(store) between 1 and 30),
  price_cents int not null check (price_cents between 0 and 100000),     -- price for what the list says to buy
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key, store)
);
alter table public.price_book enable row level security;
create policy "price_book: read own" on public.price_book for select to authenticated using (user_id = auth.uid());

-- ---------- live store prices cache (server only, shared, no personal data) ----------
create table if not exists public.price_cache (
  provider text not null,
  location text not null,
  item_key text not null,
  price_cents int,
  size text,
  product text,
  fetched_at timestamptz not null default now(),
  primary key (provider, location, item_key)
);
alter table public.price_cache enable row level security;
-- No policies: only the server reads and writes the cache.

-- `answers` also holds server counters (free list used, list builds per day): server-only from now on.
revoke update (answers) on public.profiles from authenticated;
