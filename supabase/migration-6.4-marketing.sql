-- ============================================================
-- GOATED.OS 6.4 MIGRATION — MARKETING DE CONTEÚDO
-- Rode este SQL no Supabase antes de subir os arquivos 6.4.
-- ============================================================

create table if not exists public.marketing_content (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  content_type text not null default 'Reels',
  funnel_area text not null default 'Aquisição',
  topic text not null,
  product_focus text,
  objective text,
  reference_links text,
  hook text,
  script text,
  caption text,
  hashtags text,
  status text not null default 'roteiro',
  planned_date date,
  production_date date,
  post_date date,
  post_link text,
  views_count integer not null default 0,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  saved_count integer not null default 0,
  watched boolean not null default false,
  result_note text
);

create trigger trg_marketing_content_updated_at
before update on public.marketing_content
for each row execute function public.set_updated_at();

alter table public.marketing_content enable row level security;

drop policy if exists "goated_authenticated_all" on public.marketing_content;
create policy "goated_authenticated_all" on public.marketing_content
for all to authenticated using (true) with check (true);

create index if not exists idx_marketing_content_status on public.marketing_content(status);
create index if not exists idx_marketing_content_type on public.marketing_content(content_type);
create index if not exists idx_marketing_content_post_date on public.marketing_content(post_date);
