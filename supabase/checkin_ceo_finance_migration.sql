-- =========================================================
-- GOATED.OS - CHECK-IN REAL + CEO PERSONAL FINANCE SUPPORT
-- Safe additive migration
-- =========================================================

create extension if not exists pgcrypto;

-- Incoming stock: fields needed for real check-in workflow
alter table if exists public.incoming_stock
  add column if not exists checkin_status text default 'aguardando_checkin',
  add column if not exists checkin_date date,
  add column if not exists checked_condition text,
  add column if not exists checked_box_condition text,
  add column if not exists final_min_price numeric default 0,
  add column if not exists final_target_price numeric default 0,
  add column if not exists final_ideal_price numeric default 0,
  add column if not exists listing_url text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists returned_at timestamptz,
  add column if not exists checkin_notes text;

-- Stock items: ensure final sale decision fields exist
alter table if exists public.stock_items
  add column if not exists condition_rating text,
  add column if not exists box_condition text,
  add column if not exists listing_url text,
  add column if not exists min_sale_price numeric default 0,
  add column if not exists target_sale_price numeric default 0,
  add column if not exists ideal_sale_price numeric default 0,
  add column if not exists checkin_date date,
  add column if not exists checkin_notes text;

-- Accounts payable: trace auto-created card bills
alter table if exists public.accounts_payable
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists payment_method text,
  add column if not exists notes text;

-- CEO personal finance
create table if not exists public.ceo_personal_finances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  month_ref date not null,
  type text not null default 'gasto',
  category text,
  description text not null,
  amount numeric not null default 0,
  payment_method text,
  status text not null default 'pendente',
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ceo_personal_finances enable row level security;

drop policy if exists "goated_ceo_finances_all" on public.ceo_personal_finances;

create policy "goated_ceo_finances_all"
on public.ceo_personal_finances
for all
to authenticated
using (true)
with check (true);

-- Dedicated updated_at trigger helper for CEO personal finances.
-- This avoids replacing any shared public.set_updated_at() helper used elsewhere.
create or replace function public.set_ceo_personal_finances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ceo_personal_finances_updated_at on public.ceo_personal_finances;

create trigger set_ceo_personal_finances_updated_at
before update on public.ceo_personal_finances
for each row
execute function public.set_ceo_personal_finances_updated_at();

-- Helpful indexes
create index if not exists idx_ceo_personal_finances_month_ref
on public.ceo_personal_finances(month_ref);

create index if not exists idx_ceo_personal_finances_status
on public.ceo_personal_finances(status);

create index if not exists idx_incoming_stock_checkin_status
on public.incoming_stock(checkin_status);