-- Vouchers: free access to a plan without paying (owner account, creators, partners, support).
-- Codes are never stored: only their SHA-256 hash. Redemption is atomic and server-only.

create table if not exists public.vouchers (
  code_hash text primary key,
  tier text not null check (tier in ('starter', 'pro', 'chef')),
  email text,                       -- when set, only the account with this email can redeem it
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0,
  months int check (months is null or months > 0),   -- null = access never ends
  expires_at timestamptz,          -- last day the code can be redeemed
  note text,
  created_at timestamptz not null default now()
);
alter table public.vouchers enable row level security;
-- No policies: only the server can read vouchers.

create table if not exists public.comp_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null check (tier in ('starter', 'pro', 'chef')),
  until timestamptz,               -- null = no end
  source text not null default 'voucher',
  created_at timestamptz not null default now()
);
alter table public.comp_access enable row level security;
create policy "comp_access: read own" on public.comp_access for select to authenticated using (user_id = auth.uid());

create or replace function public.redeem_voucher(p_hash text, p_user uuid, p_email text)
returns table (tier text, until timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v public.vouchers%rowtype;
  v_until timestamptz;
begin
  select * into v from public.vouchers where code_hash = p_hash for update;
  if not found then raise exception 'invalid'; end if;
  if v.expires_at is not null and v.expires_at < now() then raise exception 'expired'; end if;
  if v.uses >= v.max_uses then raise exception 'used'; end if;
  if v.email is not null and lower(v.email) <> lower(p_email) then raise exception 'not_yours'; end if;
  update public.vouchers set uses = uses + 1 where code_hash = p_hash;
  v_until := case when v.months is null then null else now() + make_interval(months => v.months) end;
  insert into public.comp_access (user_id, tier, until, source)
  values (p_user, v.tier, v_until, 'voucher')
  on conflict (user_id) do update set tier = excluded.tier, until = excluded.until, source = excluded.source, created_at = now();
  return query select v.tier, v_until;
end $$;

revoke execute on function public.redeem_voucher(text, uuid, text) from public, anon, authenticated;
