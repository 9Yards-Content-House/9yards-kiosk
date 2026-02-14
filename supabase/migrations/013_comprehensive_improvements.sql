-- ============================================================
-- 013: COMPREHENSIVE IMPROVEMENTS
-- Includes: Inventory, Loyalty Points, Customer Feedback,
-- Staff Performance, Order Scheduling, Database Indexes
-- ============================================================

-- ============================================================
-- 1. DATABASE PERFORMANCE INDEXES
-- ============================================================

-- Index for fast order lookup by order_number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Index for order status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Index for order date filtering
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Index for menu items by category
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);

-- Index for available menu items
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(available) WHERE available = true;


-- ============================================================
-- 2. ORDER ENHANCEMENTS (Scheduling, Payment Reference)
-- ============================================================

-- Add payment reference column for MoMo transactions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false;

-- Index for scheduled orders
CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON public.orders(scheduled_for) WHERE is_scheduled = true;


-- ============================================================
-- 3. INVENTORY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity_available int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 10,
  auto_disable boolean NOT NULL DEFAULT true,  -- Auto-disable when out of stock
  last_restocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(quantity_available) 
  WHERE quantity_available <= low_stock_threshold;

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Everyone can read inventory
CREATE POLICY "Anyone can read inventory"
  ON public.inventory FOR SELECT USING (true);

-- Only admin/kitchen can update inventory
CREATE POLICY "Staff can update inventory"
  ON public.inventory FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'kitchen'));

CREATE POLICY "Admin can insert inventory"
  ON public.inventory FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- Function to auto-disable menu item when out of stock
CREATE OR REPLACE FUNCTION public.check_inventory_stock()
RETURNS trigger AS $$
BEGIN
  IF NEW.quantity_available <= 0 AND NEW.auto_disable THEN
    UPDATE public.menu_items 
    SET available = false 
    WHERE id = NEW.menu_item_id;
  ELSIF NEW.quantity_available > 0 AND OLD.quantity_available <= 0 THEN
    -- Re-enable if was disabled due to stock
    UPDATE public.menu_items 
    SET available = true 
    WHERE id = NEW.menu_item_id;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inventory_change
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.check_inventory_stock();

-- Function to decrement inventory on order
CREATE OR REPLACE FUNCTION public.decrement_inventory(item_id uuid, qty int)
RETURNS void AS $$
BEGIN
  UPDATE public.inventory
  SET quantity_available = GREATEST(0, quantity_available - qty)
  WHERE menu_item_id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. LOYALTY POINTS SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text,
  loyalty_points int NOT NULL DEFAULT 0,
  total_orders int NOT NULL DEFAULT 0,
  total_spent int NOT NULL DEFAULT 0,  -- In smallest currency unit (cents/UGX)
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON public.customers(loyalty_points DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Anyone can read customers (for loyalty lookup)
CREATE POLICY "Anyone can read customers"
  ON public.customers FOR SELECT USING (true);

-- Anonymous can insert (for kiosk registration)
CREATE POLICY "Anyone can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (true);

-- Staff can update customers
CREATE POLICY "Staff can update customers"
  ON public.customers FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'kitchen'));

-- Add customer_id to orders for tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);

-- Function to award loyalty points on order completion
-- 1 point per 1000 UGX spent
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger AS $$
DECLARE
  customer_record RECORD;
  points_earned int;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.customer_phone IS NOT NULL THEN
    -- Calculate points (1 point per 1000 UGX)
    points_earned := FLOOR(NEW.total / 1000);
    
    -- Find or create customer
    INSERT INTO public.customers (phone, name)
    VALUES (NEW.customer_phone, NEW.customer_name)
    ON CONFLICT (phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, public.customers.name),
      updated_at = now();
    
    -- Update customer stats
    UPDATE public.customers
    SET 
      loyalty_points = loyalty_points + points_earned,
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      last_order_at = now(),
      updated_at = now()
    WHERE phone = NEW.customer_phone;
    
    -- Link order to customer
    UPDATE public.orders
    SET customer_id = (SELECT id FROM public.customers WHERE phone = NEW.customer_phone)
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_delivered_loyalty
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points();

-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(phone_number text, points_to_redeem int)
RETURNS TABLE(success boolean, remaining_points int, discount_amount int) AS $$
DECLARE
  current_points int;
  discount int;
BEGIN
  SELECT loyalty_points INTO current_points
  FROM public.customers
  WHERE phone = phone_number;
  
  IF current_points IS NULL OR current_points < points_to_redeem THEN
    RETURN QUERY SELECT false, COALESCE(current_points, 0), 0;
    RETURN;
  END IF;
  
  -- 1 point = 100 UGX discount
  discount := points_to_redeem * 100;
  
  UPDATE public.customers
  SET 
    loyalty_points = loyalty_points - points_to_redeem,
    updated_at = now()
  WHERE phone = phone_number;
  
  RETURN QUERY SELECT true, current_points - points_to_redeem, discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. CUSTOMER FEEDBACK SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  food_quality int CHECK (food_quality >= 1 AND food_quality <= 5),
  service_speed int CHECK (service_speed >= 1 AND service_speed <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)  -- One feedback per order
);

CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.order_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.order_feedback(created_at DESC);

ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.order_feedback FOR INSERT
  WITH CHECK (true);

-- Staff can read feedback
CREATE POLICY "Staff can read feedback"
  ON public.order_feedback FOR SELECT
  USING (public.get_my_role() IN ('admin', 'kitchen'));

-- Function to get average ratings
CREATE OR REPLACE FUNCTION public.get_feedback_summary(days_back int DEFAULT 30)
RETURNS TABLE(
  total_reviews int,
  avg_rating numeric,
  avg_food_quality numeric,
  avg_service_speed numeric,
  five_star_count int,
  one_star_count int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::int as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as avg_rating,
    ROUND(AVG(food_quality)::numeric, 2) as avg_food_quality,
    ROUND(AVG(service_speed)::numeric, 2) as avg_service_speed,
    COUNT(*) FILTER (WHERE rating = 5)::int as five_star_count,
    COUNT(*) FILTER (WHERE rating = 1)::int as one_star_count
  FROM public.order_feedback
  WHERE created_at >= now() - (days_back || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 6. STAFF PERFORMANCE TRACKING
-- ============================================================

-- Update profiles with performance fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS orders_processed int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_delivered int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_prep_time_minutes numeric,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS public.staff_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,  -- 'order', 'menu_item', 'profile', etc.
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_user ON public.staff_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_created ON public.staff_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_action ON public.staff_activity(action);

ALTER TABLE public.staff_activity ENABLE ROW LEVEL SECURITY;

-- Admin can read all activity
CREATE POLICY "Admin can read all activity"
  ON public.staff_activity FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Any authenticated user can log activity
CREATE POLICY "Authenticated can log activity"
  ON public.staff_activity FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to track order status changes by staff
CREATE OR REPLACE FUNCTION public.track_staff_performance()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND auth.uid() IS NOT NULL THEN
    -- Log the activity
    INSERT INTO public.staff_activity (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'status_change',
      'order',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'order_number', NEW.order_number
      )
    );
    
    -- Update staff stats
    IF NEW.status = 'preparing' THEN
      UPDATE public.profiles
      SET orders_processed = orders_processed + 1,
          last_active_at = now()
      WHERE id = auth.uid();
    ELSIF NEW.status = 'delivered' THEN
      UPDATE public.profiles
      SET orders_delivered = orders_delivered + 1,
          last_active_at = now()
      WHERE id = auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_track ON public.orders;
CREATE TRIGGER on_order_status_track
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.track_staff_performance();

-- Function to get staff leaderboard
CREATE OR REPLACE FUNCTION public.get_staff_leaderboard(days_back int DEFAULT 7)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  role text,
  orders_count int,
  deliveries_count int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.role::text,
    COUNT(*) FILTER (WHERE sa.details->>'new_status' = 'preparing')::int as orders_count,
    COUNT(*) FILTER (WHERE sa.details->>'new_status' = 'delivered')::int as deliveries_count
  FROM public.profiles p
  LEFT JOIN public.staff_activity sa ON sa.user_id = p.id 
    AND sa.created_at >= now() - (days_back || ' days')::interval
    AND sa.action = 'status_change'
  WHERE p.role IN ('admin', 'kitchen', 'rider')
  GROUP BY p.id, p.full_name, p.role
  ORDER BY orders_count DESC, deliveries_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 7. SOFT DELETE FOR MENU ITEMS
-- ============================================================

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_menu_items_deleted ON public.menu_items(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update menu items policy to hide deleted items
DROP POLICY IF EXISTS "Public can view available menu items" ON public.menu_items;
CREATE POLICY "Public can view available menu items"
  ON public.menu_items FOR SELECT
  USING (deleted_at IS NULL AND (available = true OR public.get_my_role() IN ('admin', 'kitchen')));


-- ============================================================
-- 8. ANALYTICS AGGREGATION FUNCTIONS
-- ============================================================

-- Function for server-side analytics aggregation
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  date_from timestamptz,
  date_to timestamptz
)
RETURNS TABLE(
  total_revenue bigint,
  total_orders int,
  avg_order_value int,
  orders_by_status jsonb,
  orders_by_payment jsonb,
  orders_by_hour jsonb,
  top_items jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      COALESCE(SUM(total), 0)::bigint as revenue,
      COUNT(*)::int as order_count,
      COALESCE(AVG(total), 0)::int as avg_value
    FROM public.orders
    WHERE created_at >= date_from AND created_at <= date_to
  ),
  status_breakdown AS (
    SELECT jsonb_object_agg(status, cnt) as data
    FROM (
      SELECT status, COUNT(*) as cnt
      FROM public.orders
      WHERE created_at >= date_from AND created_at <= date_to
      GROUP BY status
    ) s
  ),
  payment_breakdown AS (
    SELECT jsonb_object_agg(payment_method, cnt) as data
    FROM (
      SELECT payment_method, COUNT(*) as cnt
      FROM public.orders
      WHERE created_at >= date_from AND created_at <= date_to
      GROUP BY payment_method
    ) p
  ),
  hourly_breakdown AS (
    SELECT jsonb_object_agg(hour::text, cnt) as data
    FROM (
      SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as cnt
      FROM public.orders
      WHERE created_at >= date_from AND created_at <= date_to
      GROUP BY hour
      ORDER BY hour
    ) h
  ),
  top_selling AS (
    SELECT jsonb_agg(jsonb_build_object('name', name, 'count', cnt)) as data
    FROM (
      SELECT 
        COALESCE(oi.sauce_name, oi.side_dish, 'Unknown') as name,
        COUNT(*) as cnt
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.created_at >= date_from AND o.created_at <= date_to
      GROUP BY name
      ORDER BY cnt DESC
      LIMIT 10
    ) t
  )
  SELECT 
    os.revenue,
    os.order_count,
    os.avg_value,
    COALESCE(sb.data, '{}'::jsonb),
    COALESCE(pb.data, '{}'::jsonb),
    COALESCE(hb.data, '{}'::jsonb),
    COALESCE(ts.data, '[]'::jsonb)
  FROM order_stats os
  CROSS JOIN status_breakdown sb
  CROSS JOIN payment_breakdown pb
  CROSS JOIN hourly_breakdown hb
  CROSS JOIN top_selling ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 9. COMBO PRESETS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.combo_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  main_dishes text[] NOT NULL DEFAULT '{}',
  sauce_name text,
  sauce_preparation text,
  sauce_size text,
  side_dish text,
  extras jsonb,
  price int NOT NULL,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combo_presets_active ON public.combo_presets(is_active, sort_order);

ALTER TABLE public.combo_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can read active presets
CREATE POLICY "Anyone can read active presets"
  ON public.combo_presets FOR SELECT
  USING (is_active = true OR public.get_my_role() = 'admin');

-- Only admin can manage presets
CREATE POLICY "Admin can manage presets"
  ON public.combo_presets FOR ALL
  USING (public.get_my_role() = 'admin');

-- Insert some default combo presets
INSERT INTO public.combo_presets (name, description, main_dishes, sauce_name, sauce_size, side_dish, price, is_popular, sort_order) VALUES
  ('The Classic', 'Beef with Groundnut Sauce and Rice', ARRAY['Beef'], 'Groundnut Sauce', 'Regular', 'Rice', 25000, true, 1),
  ('Chicken Lover', 'Chicken with Tomato Sauce and Chips', ARRAY['Chicken'], 'Tomato Sauce', 'Regular', 'Chips', 28000, true, 2),
  ('Mixed Grill', 'Beef + Chicken with Mushroom Sauce', ARRAY['Beef', 'Chicken'], 'Mushroom Sauce', 'Large', 'Rice', 35000, true, 3),
  ('Veggie Delight', 'Vegetarian with Beans and Posho', ARRAY['Vegetables'], 'Bean Stew', 'Regular', 'Posho', 18000, false, 4)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 10. PIN LOGIN SUPPORT
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash text;

-- Index for PIN lookup (we store hashed PINs)
CREATE INDEX IF NOT EXISTS idx_profiles_pin ON public.profiles(pin_hash) WHERE pin_hash IS NOT NULL;

-- Note: PIN verification should happen in Edge Function to avoid exposing hash
