-- 004: Create order_items table
create type public.order_item_type as enum ('combo', 'single');

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type public.order_item_type not null default 'single',
  main_dishes text[] not null default '{}',
  sauce_name text,
  sauce_preparation text,
  sauce_size text,
  side_dish text,
  extras jsonb, -- [{name, price, quantity}]
  quantity int not null default 1,
  unit_price int not null default 0,
  total_price int not null default 0
);

create index idx_order_items_order on public.order_items(order_id);

alter table public.order_items enable row level security;
