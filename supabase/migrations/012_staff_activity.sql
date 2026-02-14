-- ============================================================
-- 012: STAFF ACTIVITY LOGGING
-- ============================================================
-- Tracks staff actions for audit and analytics purposes

CREATE TABLE IF NOT EXISTS public.staff_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,  -- 'order', 'menu_item', 'profile', etc.
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_activity_user ON public.staff_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_created ON public.staff_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_activity_entity ON public.staff_activity_log(entity_type, entity_id);

ALTER TABLE public.staff_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin can read all activity
CREATE POLICY "Admin can read all activity"
  ON public.staff_activity_log FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Users can read their own activity
CREATE POLICY "Users can read own activity"
  ON public.staff_activity_log FOR SELECT
  USING (user_id = auth.uid());

-- Any authenticated user can insert activity logs
CREATE POLICY "Authenticated users can log activity"
  ON public.staff_activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Update profiles table to track last login and order count
-- ============================================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS orders_processed int NOT NULL DEFAULT 0;

-- Function to log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger AS $$
DECLARE
  user_name_var text;
BEGIN
  IF old.status IS DISTINCT FROM new.status THEN
    SELECT full_name INTO user_name_var 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    INSERT INTO public.staff_activity_log (user_id, user_name, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      COALESCE(user_name_var, 'System'),
      'status_change',
      'order',
      new.id,
      jsonb_build_object(
        'old_status', old.status,
        'new_status', new.status,
        'order_number', new.order_number
      )
    );
    
    -- Update orders processed count
    IF new.status = 'delivered' AND auth.uid() IS NOT NULL THEN
      UPDATE public.profiles 
      SET orders_processed = orders_processed + 1 
      WHERE id = auth.uid();
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_log ON public.orders;
CREATE TRIGGER on_order_status_log
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- Function to update last login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles 
  SET last_login_at = now() 
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
