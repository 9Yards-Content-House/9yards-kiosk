-- ============================================================
-- 9YARDS KIOSK - COMPLETE DATABASE SETUP
-- ============================================================
-- Copy this ENTIRE file and run it in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ============================================================

-- 001: Create categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

-- 002: Create menu_items table
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price int not null default 0,
  image_url text not null default '',
  available boolean not null default true,
  preparations jsonb,
  sizes jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_menu_items_available on public.menu_items(available);

alter table public.menu_items enable row level security;

-- 003: Create orders table
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('new', 'preparing', 'ready', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'mobile_money', 'pay_at_counter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  status public.order_status not null default 'new',
  customer_name text not null,
  customer_phone text,
  customer_location text,
  payment_method public.payment_method not null default 'pay_at_counter',
  payment_status public.payment_status not null default 'pending',
  momo_transaction_id text,
  subtotal int not null default 0,
  total int not null default 0,
  special_instructions text,
  source text not null default 'kiosk',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  prepared_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);

alter table public.orders enable row level security;

-- 004: Create order_items table
DO $$ BEGIN
  CREATE TYPE public.order_item_type AS ENUM ('combo', 'single');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type public.order_item_type not null default 'single',
  main_dishes text[] not null default '{}',
  sauce_name text,
  sauce_preparation text,
  sauce_size text,
  side_dish text,
  extras jsonb,
  quantity int not null default 1,
  unit_price int not null default 0,
  total_price int not null default 0
);

create index if not exists idx_order_items_order on public.order_items(order_id);

alter table public.order_items enable row level security;

-- 005: Create profiles table
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'kitchen', 'rider');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'kitchen',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'kitchen')
  );
  return new;
end;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 006: Create notifications table
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('new_order', 'status_change', 'payment_received');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  read boolean not null default false,
  target_role public.user_role not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_role_read on public.notifications(target_role, read);

alter table public.notifications enable row level security;

-- 007: Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- ============================================================
-- 008: ROW LEVEL SECURITY POLICIES
-- ============================================================

-- CATEGORIES: Public read
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
create policy "Anyone can read categories"
  on public.categories for select
  using (true);

DROP POLICY IF EXISTS "Authenticated users with admin role can manage categories" ON public.categories;
create policy "Authenticated users with admin role can manage categories"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- MENU ITEMS: Public read available
DROP POLICY IF EXISTS "Anyone can read available menu items" ON public.menu_items;
create policy "Anyone can read available menu items"
  on public.menu_items for select
  using (available = true or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'kitchen')
  ));

DROP POLICY IF EXISTS "Admin can manage all menu items" ON public.menu_items;
create policy "Admin can manage all menu items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Kitchen can update menu items" ON public.menu_items;
create policy "Kitchen can update menu items"
  on public.menu_items for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'kitchen'
    )
  );

-- ORDERS: Anyone can insert and read, authenticated staff can update
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
create policy "Anyone can create orders"
  on public.orders for insert
  with check (true);

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
create policy "Anyone can read orders"
  on public.orders for select
  using (true);

DROP POLICY IF EXISTS "Authenticated staff can update orders" ON public.orders;
create policy "Authenticated staff can update orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.active = true
    )
  );

-- ORDER ITEMS: Anyone can insert and read
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
create policy "Anyone can create order items"
  on public.order_items for insert
  with check (true);

DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
create policy "Anyone can read order items"
  on public.order_items for select
  using (true);

-- PROFILES: Users read own, admin manages all
-- Create a security definer function to avoid infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
create policy "Admin can read all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;
create policy "Admin can manage profiles"
  on public.profiles for all
  using (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
create policy "Admin can delete profiles"
  on public.profiles for delete
  using (public.get_my_role() = 'admin');

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Staff can read notifications for their role" ON public.notifications;
create policy "Staff can read notifications for their role"
  on public.notifications for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = target_role
    )
  );

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- PUSH SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid());

-- ============================================================
-- 009: ORDER NUMBER TRIGGER
-- ============================================================
create or replace function public.generate_order_number()
returns trigger as $$
declare
  next_num int;
  new_number text;
begin
  -- Get next sequential number for today
  select coalesce(max(
    cast(substring(order_number from 4) as int)
  ), 0) + 1 into next_num
  from public.orders
  where created_at::date = current_date
    and order_number ~ '^9Y-[0-9]+$';
  
  new_number := '9Y-' || lpad(next_num::text, 4, '0');
  new.order_number := new_number;
  return new;
end;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
create trigger set_order_number
  before insert on public.orders
  for each row
  when (new.order_number is null)
  execute function public.generate_order_number();

-- ============================================================
-- 010: NOTIFICATION TRIGGERS
-- ============================================================
create or replace function public.notify_new_order()
returns trigger as $$
begin
  insert into public.notifications (order_id, type, message, target_role)
  values (
    new.id,
    'new_order',
    'New order ' || coalesce(new.order_number, '') || ' from ' || new.customer_name,
    'kitchen'
  );
  insert into public.notifications (order_id, type, message, target_role)
  values (
    new.id,
    'new_order',
    'New order ' || coalesce(new.order_number, '') || ' — ' || new.total || ' UGX',
    'admin'
  );
  return new;
end;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_new_order ON public.orders;
create trigger on_new_order
  after insert on public.orders
  for each row execute function public.notify_new_order();

create or replace function public.notify_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'ready' then
      insert into public.notifications (order_id, type, message, target_role)
      values (
        new.id,
        'status_change',
        'Order ' || coalesce(new.order_number, '') || ' is ready for delivery',
        'rider'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
create trigger on_order_status_change
  after update on public.orders
  for each row execute function public.notify_status_change();

-- ============================================================
-- 011: KIOSK ENHANCEMENTS
-- ============================================================
alter table public.menu_items 
  add column if not exists available_from time,
  add column if not exists available_until time,
  add column if not exists is_popular boolean not null default false,
  add column if not exists is_new boolean not null default false;

alter table public.orders 
  add column if not exists payment_reference text,
  add column if not exists estimated_ready_at timestamptz;

create index if not exists idx_orders_payment_reference on public.orders(payment_reference);

alter table public.profiles 
  add column if not exists pin_hash text,
  add column if not exists language text not null default 'en',
  add column if not exists last_login_at timestamptz,
  add column if not exists orders_processed int not null default 0;

alter table public.order_items 
  add column if not exists side_dishes text[];

-- ============================================================
-- SEED DATA: Categories and Menu Items
-- ============================================================

-- Categories
INSERT INTO public.categories (id, name, slug, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Main Dishes',  'main-dishes',  1),
  ('c1000000-0000-0000-0000-000000000002', 'Sauces',       'sauces',       2),
  ('c1000000-0000-0000-0000-000000000003', 'Side Dishes',  'side-dishes',  3),
  ('c1000000-0000-0000-0000-000000000004', 'Lusaniya',     'lusaniya',     4),
  ('c1000000-0000-0000-0000-000000000005', 'Juices',       'juices',       5),
  ('c1000000-0000-0000-0000-000000000006', 'Desserts',     'desserts',     6)
ON CONFLICT (slug) DO NOTHING;

-- Main Dishes
INSERT INTO public.menu_items (category_id, name, description, price, image_url, available, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Matooke',    'Steamed green bananas mashed to silky perfection',  0, '/images/menu/main-dishes/matooke.jpg', true, 1),
  ('c1000000-0000-0000-0000-000000000001', 'White Rice', 'Fluffy, perfectly steamed long-grain rice',          0, '/images/menu/main-dishes/9yards-food-white-rice.jpg', true, 2),
  ('c1000000-0000-0000-0000-000000000001', 'Pilao',      'Fragrant spiced rice cooked with aromatic herbs',    0, '/images/menu/main-dishes/9yards-food-pilao.jpg', true, 3),
  ('c1000000-0000-0000-0000-000000000001', 'Posho',      'Traditional maize meal, soft and smooth',            0, '/images/menu/main-dishes/9yards-food-posho.jpg', true, 4),
  ('c1000000-0000-0000-0000-000000000001', 'Cassava',    'Tender boiled cassava, naturally sweet',             0, '/images/menu/main-dishes/9yards-food-cassava.jpg', true, 5)
ON CONFLICT DO NOTHING;

-- Sauces
INSERT INTO public.menu_items (category_id, name, description, price, image_url, available, preparations, sizes, sort_order, is_popular) VALUES
  ('c1000000-0000-0000-0000-000000000002', 'Chicken Stew', 'Tender chicken in rich tomato gravy', 20000, '/images/menu/sauces/9Yards-Chicken-Stew-Menu.jpg', true, '["Fried","Boiled","Grilled"]'::jsonb, '[{"name":"Regular","price":20000},{"name":"Half-Chicken","price":38000},{"name":"Full Chicken","price":58000}]'::jsonb, 1, true),
  ('c1000000-0000-0000-0000-000000000002', 'Beef Stew', 'Melt-in-your-mouth beef in hearty gravy', 20000, '/images/menu/sauces/9Yards-Beef-Stew-Menu.jpg', true, '["Fried","Boiled"]'::jsonb, '[{"name":"Regular","price":20000}]'::jsonb, 2, true),
  ('c1000000-0000-0000-0000-000000000002', 'Fish', 'Fresh tilapia, fried or smoked', 20000, '/images/menu/sauces/9Yards-Fresh-Fish-Menu.jpg', true, '["Fried","Smoked","Boiled"]'::jsonb, '[{"name":"Regular","price":20000}]'::jsonb, 3, false),
  ('c1000000-0000-0000-0000-000000000002', 'Cowpeas', 'Creamy cowpeas in aromatic spices', 15000, '/images/menu/sauces/9Yards-cowpeas-Menu.jpg', true, '[]'::jsonb, '[{"name":"Regular","price":15000}]'::jsonb, 4, false),
  ('c1000000-0000-0000-0000-000000000002', 'Liver', 'Succulent pan-fried liver', 20000, '/images/menu/sauces/9Yards-Liver-Menu.jpg', true, '[]'::jsonb, '[{"name":"Regular","price":20000}]'::jsonb, 5, false),
  ('c1000000-0000-0000-0000-000000000002', 'G-Nuts', 'Rich groundnut paste', 15000, '/images/menu/sauces/9Yards-G-Nuts-Menu.jpg', true, '[]'::jsonb, '[{"name":"Regular","price":15000}]'::jsonb, 6, false),
  ('c1000000-0000-0000-0000-000000000002', 'Fish & G-Nuts', 'Fish in luscious groundnut sauce', 20000, '/images/menu/sauces/9Yards-Fish-&-G-Nuts-Menu.jpg', true, '[]'::jsonb, '[{"name":"Regular","price":20000}]'::jsonb, 7, true)
ON CONFLICT DO NOTHING;

-- Side Dishes
INSERT INTO public.menu_items (category_id, name, description, price, image_url, available, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000003', 'Cabbage',  'Fresh sautéed cabbage', 0, '/images/menu/side-dish/9Yards-cabbage-Menu.jpg', true, 1),
  ('c1000000-0000-0000-0000-000000000003', 'Avocado',  'Creamy ripe avocado',   0, '/images/menu/side-dish/9Yards-avocado-Menu.jpg', true, 2)
ON CONFLICT DO NOTHING;

-- Lusaniya
INSERT INTO public.menu_items (category_id, name, description, price, image_url, available, sort_order, is_popular) VALUES
  ('c1000000-0000-0000-0000-000000000004', 'Ordinary Lusaniya', 'Signature combo - pilao with protein', 45000, '/images/menu/lusaniya/ordinary-lusaniya.jpg', true, 1, true),
  ('c1000000-0000-0000-0000-000000000004', 'Beef & Pilao Lusaniya', 'Tender beef over spiced pilao', 45000, '/images/menu/lusaniya/beef-&-pilao-lusaniya.jpg', true, 2, false),
  ('c1000000-0000-0000-0000-000000000004', 'Whole Chicken with Pilao Lusaniya', 'Whole roasted chicken feast', 45000, '/images/menu/lusaniya/whole-chicken-lusaniya.jpg', true, 3, false)
ON CONFLICT DO NOTHING;

-- Juices
INSERT INTO public.menu_items (category_id, name, description, price, image_url, available, sort_order, is_new) VALUES
  ('c1000000-0000-0000-0000-000000000005', 'Passion Fruit Juice', 'Tangy and refreshing', 5000, '/images/menu/juices/9yards-passion-fruit-juice-menu.jpg', true, 1, false),
  ('c1000000-0000-0000-0000-000000000005', 'Mango Juice', 'Sweet tropical mango', 5000, '/images/menu/juices/9yards-mango-juice-menu.jpg', true, 2, false),
  ('c1000000-0000-0000-0000-000000000005', 'Watermelon Juice', 'Light and hydrating', 5000, '/images/menu/juices/9yards-watermelon-juice-menu.jpg', true, 3, false),
  ('c1000000-0000-0000-0000-000000000005', 'Pineapple Juice', 'Sweet and tangy', 5000, '/images/menu/juices/9yards-pineapple-juice-menu.jpg', true, 4, false),
  ('c1000000-0000-0000-0000-000000000005', 'Beetroot Juice', 'Earthy and nutritious', 5000, '/images/menu/juices/9yards-beetroot-juice-menu.jpg', true, 5, false),
  ('c1000000-0000-0000-0000-000000000005', 'Cocktail Juice', 'Tropical fruit blend', 5000, '/images/menu/juices/9yards-food-juice-cocktail.jpg', true, 6, true)
ON CONFLICT DO NOTHING;

-- Desserts
INSERT INTO public.menu_items (category_id, name, description, price, image_url, available, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000006', 'Chapati', 'Soft, flaky flatbread', 2000, '/images/menu/desserts/Chapati.jpg', true, 1),
  ('c1000000-0000-0000-0000-000000000006', 'Samosa', 'Crispy golden pastry', 1000, '/images/menu/desserts/Samosa.jpg', true, 2)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE! Now create a user and set them as admin:
-- 1. Go to Authentication > Users > Add User
-- 2. Add: admin@9yards.com with a password
-- 3. Copy the user's UUID from the Users table
-- 4. Run this (replace YOUR_USER_UUID):
-- 
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE id = 'YOUR_USER_UUID';
-- ============================================================

SELECT 'Setup complete! Tables created: ' || 
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') || 
  ' tables' as result;
