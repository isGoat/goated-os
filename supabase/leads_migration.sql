-- =========================================================
-- GOATED.OS - LEADS SYSTEM
-- Safe additive migration
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  name text,
  phone text,
  product_model text,
  size text,
  source text,
  sale_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "goated_leads_all" on public.leads;

create policy "goated_leads_all"
on public.leads
for all
to authenticated
using (true)
with check (true);

create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;

create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_leads_updated_at();

create index if not exists idx_leads_phone
on public.leads(phone);

create index if not exists idx_leads_source
on public.leads(source);

create index if not exists idx_leads_created_at
on public.leads(created_at);

create index if not exists idx_leads_sale_id
on public.leads(sale_id);
