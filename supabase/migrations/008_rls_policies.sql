-- 008: Row-Level Security policies

-- ============================================================
-- CATEGORIES: Public read, admin/kitchen write
-- ============================================================
create policy "Anyone can read categories"
  on public.categories for select
  using (true);

create policy "Authenticated users with admin role can manage categories"
  on public.categories for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ============================================================
-- MENU ITEMS: Public read available, admin/kitchen manage
-- ============================================================
create policy "Anyone can read available menu items"
  on public.menu_items for select
  using (available = true or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('admin', 'kitchen')
  ));

create policy "Admin can manage all menu items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Kitchen can update menu items"
  on public.menu_items for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'kitchen'
    )
  );

-- ============================================================
-- ORDERS: Anon can insert, authenticated can read/update
-- ============================================================
create policy "Anyone can create orders (kiosk)"
  on public.orders for insert
  with check (true);

create policy "Anyone can read own order by order_number"
  on public.orders for select
  using (true);

create policy "Authenticated staff can update orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.active = true
    )
  );

-- ============================================================
-- ORDER ITEMS: Anon can insert, anyone can read
-- ============================================================
create policy "Anyone can create order items"
  on public.order_items for insert
  with check (true);

create policy "Anyone can read order items"
  on public.order_items for select
  using (true);

-- ============================================================
-- PROFILES: Own profile read, admin manage
-- ============================================================
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "Admin can manage profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ============================================================
-- NOTIFICATIONS: Staff can read their role's notifications
-- ============================================================
create policy "Staff can read notifications for their role"
  on public.notifications for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = target_role
    )
  );

create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- ============================================================
-- PUSH SUBSCRIPTIONS: Own subscriptions only
-- ============================================================
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid());
