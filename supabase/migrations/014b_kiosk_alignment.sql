-- ============================================================
-- 014b: KIOSK ALIGNMENT & ENHANCEMENT (Part 2)
-- Run AFTER 014a has been committed
-- ============================================================

-- ============================================================
-- 1. MIGRATE EXISTING DATA TO NEW STATUSES
-- ============================================================

-- Migrate existing orders with old statuses to new ones
-- 'ready' -> 'out_for_delivery' (kitchen done, being delivered)
-- 'delivered' -> 'arrived' (at reception)
UPDATE public.orders SET status = 'out_for_delivery' WHERE status = 'ready';
UPDATE public.orders SET status = 'arrived' WHERE status = 'delivered';


-- ============================================================
-- 2. ADD PICKED UP TRACKING
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for reception dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_arrived ON public.orders(status) WHERE status = 'arrived';


-- ============================================================
-- 3. ADD DELIVERY FEE SUPPORT
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee int NOT NULL DEFAULT 0;


-- ============================================================
-- 4. CREATE LOCATIONS TABLE (Multi-kiosk prep)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  operating_hours jsonb DEFAULT '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "20:00"}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add location_id to orders (nullable for now, required later)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(location_id);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Anyone can read locations
DROP POLICY IF EXISTS "Anyone can read locations" ON public.locations;
CREATE POLICY "Anyone can read locations"
  ON public.locations FOR SELECT USING (true);

-- Only admin can manage locations
DROP POLICY IF EXISTS "Admin can manage locations" ON public.locations;
CREATE POLICY "Admin can manage locations"
  ON public.locations FOR ALL
  USING (public.get_my_role() = 'admin');

-- Insert default location
INSERT INTO public.locations (name, address)
VALUES ('Main Kitchen', 'Head Office')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5. UPDATE RLS POLICIES FOR RECEPTION ROLE
-- ============================================================

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Riders can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated staff can update orders" ON public.orders;

-- Updated policy: Staff (including reception) can view orders
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
CREATE POLICY "Staff can view orders"
  ON public.orders FOR SELECT
  USING (true);

-- Updated policy: Staff can update orders based on role
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'kitchen', 'rider', 'reception')
      AND active = true
    )
  );

-- Reception-specific permissions
DROP POLICY IF EXISTS "Reception can update arrived orders" ON public.orders;
CREATE POLICY "Reception can update arrived orders"
  ON public.orders FOR UPDATE
  USING (
    status = 'arrived'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'reception' AND active = true
    )
  )
  WITH CHECK (
    status = 'arrived'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'reception' AND active = true
    )
  );


-- ============================================================
-- 6. UPDATE NOTIFICATION TRIGGERS FOR NEW STATUSES
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger AS $$
BEGIN
  -- Only trigger on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert notification for relevant role
    INSERT INTO public.notifications (order_id, type, message, target_role)
    VALUES (
      NEW.id,
      'status_change',
      CASE NEW.status
        WHEN 'preparing' THEN 'Order ' || NEW.order_number || ' is being prepared'
        WHEN 'out_for_delivery' THEN 'Order ' || NEW.order_number || ' is out for delivery'
        WHEN 'arrived' THEN 'Order ' || NEW.order_number || ' has arrived at reception'
        WHEN 'cancelled' THEN 'Order ' || NEW.order_number || ' was cancelled'
        ELSE 'Order ' || NEW.order_number || ' status updated'
      END,
      CASE NEW.status
        WHEN 'preparing' THEN 'kitchen'
        WHEN 'out_for_delivery' THEN 'rider'
        WHEN 'arrived' THEN 'reception'
        ELSE 'admin'
      END::public.user_role
    );
    
    -- Update timestamp columns
    IF NEW.status = 'arrived' THEN
      NEW.delivered_at = now();
    ELSIF NEW.status = 'out_for_delivery' THEN
      NEW.ready_at = now();
    ELSIF NEW.status = 'preparing' THEN
      NEW.prepared_at = now();
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 7. UPDATE LOYALTY POINTS FOR NEW STATUS
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger AS $$
DECLARE
  points_earned int;
BEGIN
  -- Award points when order arrives (changed from 'delivered' to 'arrived')
  IF NEW.status = 'arrived' AND OLD.status != 'arrived' AND NEW.customer_phone IS NOT NULL THEN
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


-- ============================================================
-- 8. HELPER FUNCTION: Get operating hours
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_within_operating_hours(location_uuid uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
  loc_hours jsonb;
  day_name text;
  today_hours jsonb;
  curr_time time;
  open_time time;
  close_time time;
BEGIN
  day_name := lower(to_char(now(), 'Day'));
  day_name := trim(day_name);
  curr_time := now()::time;
  
  IF location_uuid IS NOT NULL THEN
    SELECT operating_hours INTO loc_hours
    FROM public.locations
    WHERE id = location_uuid AND is_active = true;
  ELSE
    SELECT operating_hours INTO loc_hours
    FROM public.locations
    WHERE is_active = true
    LIMIT 1;
  END IF;
  
  IF loc_hours IS NULL THEN
    RETURN true;
  END IF;
  
  today_hours := loc_hours->day_name;
  IF today_hours IS NULL THEN
    RETURN false;
  END IF;
  
  open_time := (today_hours->>'open')::time;
  close_time := (today_hours->>'close')::time;
  
  RETURN curr_time >= open_time AND curr_time <= close_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 9. ARRIVAL NOTIFICATION TRIGGER (for WhatsApp)
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_arrival_notification()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'arrived' AND OLD.status != 'arrived' AND NEW.customer_phone IS NOT NULL THEN
    PERFORM pg_notify('order_arrived', json_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'customer_name', NEW.customer_name,
      'customer_phone', NEW.customer_phone
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_arrived ON public.orders;
CREATE TRIGGER on_order_arrived
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_arrival_notification();


-- ============================================================
-- 10. ORDER CANCELLATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS public.orders AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  IF v_order.status != 'new' THEN
    RAISE EXCEPTION 'Order cannot be cancelled - preparation has already started';
  END IF;
  
  UPDATE public.orders
  SET 
    status = 'cancelled',
    special_instructions = COALESCE(v_order.special_instructions || E'\n', '') || 'CANCELLED: ' || COALESCE(p_reason, 'Customer request'),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;
  
  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
