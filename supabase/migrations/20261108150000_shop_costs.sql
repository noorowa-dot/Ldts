-- Automatic cost of the shop: an estimated price per list item, and what the person actually paid.
alter table public.shop_items add column if not exists est_cents int check (est_cents is null or est_cents between 0 and 100000);

create table if not exists public.shop_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  store text not null default '' check (char_length(store) <= 30),
  total_cents int not null check (total_cents between 0 and 10000000),
  est_cents int,                     -- the estimate at the time, to compare
  created_at timestamptz not null default now()
);
create index if not exists shop_receipts_user_week on public.shop_receipts (user_id, week_start desc);
alter table public.shop_receipts enable row level security;
create policy "shop_receipts: read own" on public.shop_receipts for select to authenticated using (user_id = auth.uid());
