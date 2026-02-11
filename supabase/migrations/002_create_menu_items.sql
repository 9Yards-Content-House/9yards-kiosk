-- 002: Create menu_items table
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price int not null default 0,
  image_url text not null default '',
  available boolean not null default true,
  preparations jsonb, -- for sauces: [{name, priceModifier}]
  sizes jsonb,        -- for sauces: [{name, price}]
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_menu_items_category on public.menu_items(category_id);
create index idx_menu_items_available on public.menu_items(available);

alter table public.menu_items enable row level security;
