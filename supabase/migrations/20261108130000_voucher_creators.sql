-- Creator / affiliate vouchers: shareable codes ("MARIA"), one redemption per account, creator attribution.

alter table public.vouchers add column if not exists creator text;   -- who promotes it (for stats)
alter table public.vouchers add column if not exists k text check (k is null or k ~ '^[A-Za-z0-9]{1,12}$'); -- the creator's Kwop link code

create table if not exists public.voucher_redemptions (
  code_hash text not null references public.vouchers (code_hash) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code_hash, user_id)
);
alter table public.voucher_redemptions enable row level security;
-- No policies: server only (creator stats are read with the service role).

drop function if exists public.redeem_voucher(text, uuid, text);

create or replace function public.redeem_voucher(p_hash text, p_user uuid, p_email text)
returns table (tier text, until timestamptz, k text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v public.vouchers%rowtype;
  old public.comp_access%rowtype;
  v_until timestamptz;
  rank_new int;
  rank_old int;
begin
  select * into v from public.vouchers where code_hash = p_hash for update;
  if not found then raise exception 'invalid'; end if;
  if v.expires_at is not null and v.expires_at < now() then raise exception 'expired'; end if;
  if v.email is not null and lower(v.email) <> lower(p_email) then raise exception 'not_yours'; end if;
  if exists (select 1 from public.voucher_redemptions r where r.code_hash = p_hash and r.user_id = p_user) then raise exception 'already_redeemed'; end if;
  if v.uses >= v.max_uses then raise exception 'used'; end if;

  update public.vouchers set uses = uses + 1 where code_hash = p_hash;
  insert into public.voucher_redemptions (code_hash, user_id) values (p_hash, p_user);
  v_until := case when v.months is null then null else now() + make_interval(months => v.months) end;

  -- Never downgrade: keep whatever free access is better (higher plan, or same plan for longer).
  select * into old from public.comp_access ca where ca.user_id = p_user and (ca.until is null or ca.until > now());
  rank_new := array_position(array['starter', 'pro', 'chef'], v.tier);
  rank_old := coalesce(array_position(array['starter', 'pro', 'chef'], old.tier), 0);
  if not found or rank_new > rank_old or (rank_new = rank_old and old.until is not null and (v_until is null or v_until > old.until)) then
    insert into public.comp_access (user_id, tier, until, source)
    values (p_user, v.tier, v_until, 'voucher')
    on conflict (user_id) do update set tier = excluded.tier, until = excluded.until, source = excluded.source, created_at = now();
  end if;

  return query select c.tier, c.until, v.k from public.comp_access c where c.user_id = p_user;
end $$;

revoke execute on function public.redeem_voucher(text, uuid, text) from public, anon, authenticated;
