-- 011: Kiosk enhancements - additional columns and features
-- Run after 010_notification_triggers.sql

-- ==============================================
-- Add new columns to menu_items for scheduling and badges
-- ==============================================
alter table public.menu_items 
  add column if not exists available_from time,
  add column if not exists available_until time,
  add column if not exists is_popular boolean not null default false,
  add column if not exists is_new boolean not null default false;

comment on column public.menu_items.available_from is 'Time when this item becomes available (null = always)';
comment on column public.menu_items.available_until is 'Time when this item becomes unavailable (null = always)';
comment on column public.menu_items.is_popular is 'Show "Popular" badge on the item';
comment on column public.menu_items.is_new is 'Show "New" badge on the item';

-- ==============================================
-- Add payment_reference column to orders (used by momo-payment edge function)
-- ==============================================
alter table public.orders 
  add column if not exists payment_reference text,
  add column if not exists estimated_ready_at timestamptz;

comment on column public.orders.payment_reference is 'External payment reference ID (MoMo transaction)';
comment on column public.orders.estimated_ready_at is 'Estimated time when order will be ready';

create index if not exists idx_orders_payment_reference on public.orders(payment_reference);

-- ==============================================
-- Add PIN hash and language preference to profiles
-- ==============================================
alter table public.profiles 
  add column if not exists pin_hash text,
  add column if not exists language text not null default 'en',
  add column if not exists last_login_at timestamptz,
  add column if not exists orders_processed int not null default 0;

comment on column public.profiles.pin_hash is 'Bcrypt hash of 4-digit PIN for quick login';
comment on column public.profiles.language is 'Preferred UI language (en/lg)';
comment on column public.profiles.last_login_at is 'Last successful login timestamp';
comment on column public.profiles.orders_processed is 'Running count of orders processed by this staff';

-- ==============================================
-- Update order_items to support multiple side dishes
-- ==============================================
alter table public.order_items 
  add column if not exists side_dishes text[];

comment on column public.order_items.side_dishes is 'Array of side dishes (replaces single side_dish)';

-- Migrate existing data if side_dish exists
update public.order_items 
  set side_dishes = array[side_dish] 
  where side_dish is not null 
    and side_dishes is null;

-- ==============================================
-- Function to check if menu item is currently available (time-based)
-- ==============================================
create or replace function public.is_menu_item_available(item_id uuid)
returns boolean as $$
declare
  item record;
  current_time_only time;
begin
  select * into item from public.menu_items where id = item_id;
  
  if not found then
    return false;
  end if;
  
  -- If not available at all, return false
  if not item.available then
    return false;
  end if;
  
  -- If no time restrictions, return true
  if item.available_from is null and item.available_until is null then
    return true;
  end if;
  
  current_time_only := current_time;
  
  -- Check time-based availability
  if item.available_from is not null and item.available_until is not null then
    -- Handle overnight ranges (e.g., 22:00 - 06:00)
    if item.available_from > item.available_until then
      return current_time_only >= item.available_from or current_time_only <= item.available_until;
    else
      return current_time_only >= item.available_from and current_time_only <= item.available_until;
    end if;
  elsif item.available_from is not null then
    return current_time_only >= item.available_from;
  elsif item.available_until is not null then
    return current_time_only <= item.available_until;
  end if;
  
  return true;
end;
$$ language plpgsql security definer;

-- ==============================================
-- Function to calculate estimated wait time based on queue
-- ==============================================
create or replace function public.get_estimated_wait_minutes()
returns int as $$
declare
  pending_orders int;
  avg_prep_time int;
begin
  -- Count orders in new/preparing status
  select count(*) into pending_orders 
  from public.orders 
  where status in ('new', 'preparing');
  
  -- Calculate average prep time from recent completed orders (last 50)
  select coalesce(
    avg(extract(epoch from (ready_at - created_at)) / 60)::int,
    10 -- default 10 minutes if no data
  ) into avg_prep_time
  from (
    select created_at, ready_at 
    from public.orders 
    where ready_at is not null 
    order by ready_at desc 
    limit 50
  ) recent;
  
  return pending_orders * avg_prep_time;
end;
$$ language plpgsql security definer;

-- ==============================================
-- Update handle_new_user to include new profile fields
-- ==============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'kitchen'),
    coalesce(new.raw_user_meta_data->>'language', 'en')
  );
  return new;
end;
$$ language plpgsql security definer;

-- ==============================================
-- Set some items as popular/new for testing
-- ==============================================
update public.menu_items set is_popular = true 
where name in ('Chicken Stew', 'Beef Stew', 'Ordinary Lusaniya');

update public.menu_items set is_new = true 
where name in ('Cocktail Juice', 'Fish & G-Nuts');
