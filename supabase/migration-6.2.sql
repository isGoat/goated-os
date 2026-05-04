-- GOATED.OS 6.2 MIGRATION
-- Rode no Supabase SQL Editor antes de subir o código 6.2.
-- Não apaga dados. Só adiciona campos novos.

alter table public.incoming_stock add column if not exists supplier_name text;
alter table public.incoming_stock add column if not exists purchase_date date default current_date;
alter table public.incoming_stock add column if not exists purchase_shipping numeric not null default 0;
alter table public.incoming_stock add column if not exists extra_cost numeric not null default 0;
alter table public.incoming_stock add column if not exists total_purchase_cost numeric not null default 0;
alter table public.incoming_stock add column if not exists listing_url text;
alter table public.incoming_stock add column if not exists min_sale_price numeric not null default 0;
alter table public.incoming_stock add column if not exists ideal_sale_price numeric not null default 0;
alter table public.incoming_stock add column if not exists expected_profit numeric not null default 0;
alter table public.incoming_stock add column if not exists roi_percent numeric not null default 0;

alter table public.stock_items add column if not exists supplier_name text;
alter table public.stock_items add column if not exists listing_url text;
alter table public.stock_items add column if not exists min_sale_price numeric not null default 0;
alter table public.stock_items add column if not exists ideal_sale_price numeric not null default 0;
alter table public.stock_items add column if not exists purchase_shipping numeric not null default 0;
alter table public.stock_items add column if not exists extra_cost numeric not null default 0;
alter table public.stock_items add column if not exists total_purchase_cost numeric not null default 0;

alter table public.sales add column if not exists discount_amount numeric not null default 0;
alter table public.sales add column if not exists store_shipping_amount numeric not null default 0;
alter table public.sales add column if not exists sale_status text not null default 'vendido';
alter table public.sales add column if not exists payment_date date;
alter table public.sales add column if not exists tracking_code text;

alter table public.receivables add column if not exists customer_name text;
alter table public.receivables add column if not exists source_channel text;
alter table public.receivables add column if not exists sale_date date;

alter table public.supplies add column if not exists unit_cost numeric not null default 0;

alter table public.buy_lab add column if not exists shipping_estimate numeric not null default 0;
alter table public.buy_lab add column if not exists min_sale_price numeric not null default 0;
alter table public.buy_lab add column if not exists decision text;

update public.incoming_stock
set total_purchase_cost = coalesce(nullif(total_purchase_cost,0), coalesce(cost_paid,0) + coalesce(purchase_shipping,0) + coalesce(extra_cost,0)),
    expected_profit = coalesce(target_sale_price,0) - coalesce(nullif(total_purchase_cost,0), coalesce(cost_paid,0) + coalesce(purchase_shipping,0) + coalesce(extra_cost,0))
where true;

update public.stock_items
set total_purchase_cost = coalesce(nullif(total_purchase_cost,0), coalesce(total_cost,0))
where true;
