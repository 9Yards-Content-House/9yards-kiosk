-- ============================================================
-- RIDER ASSIGNMENT
-- ============================================================
-- Adds rider assignment capability to orders for delivery tracking
-- ============================================================

-- Add rider assignment columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Create index for efficient rider lookups
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);

-- Create index for finding unassigned ready orders
CREATE INDEX IF NOT EXISTS idx_orders_ready_unassigned 
  ON public.orders(status, rider_id) 
  WHERE status = 'ready' AND rider_id IS NULL;

-- RLS policy: Riders can only see orders assigned to them or ready for pickup
CREATE POLICY "Riders can view assigned orders"
  ON public.orders FOR SELECT
  USING (
    -- Admins and kitchen can see all orders
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
    OR
    -- Riders can see orders assigned to them
    (rider_id = auth.uid())
    OR
    -- Riders can see unassigned ready orders (available for pickup)
    (
      status = 'ready' 
      AND rider_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'rider'
      )
    )
  );

-- RLS policy: Only admins can assign riders
CREATE POLICY "Admins can assign riders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policy: Riders can update their assigned orders (mark delivered)
CREATE POLICY "Riders can update assigned orders"
  ON public.orders FOR UPDATE
  USING (
    rider_id = auth.uid() 
    AND status IN ('ready', 'delivered')
  )
  WITH CHECK (
    rider_id = auth.uid() 
    AND status IN ('ready', 'delivered')
  );

-- Function to assign a rider to an order
CREATE OR REPLACE FUNCTION public.assign_rider_to_order(
  p_order_id UUID,
  p_rider_id UUID
) RETURNS public.orders AS $$
DECLARE
  v_order public.orders;
BEGIN
  -- Verify the rider exists and has rider role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_rider_id AND role = 'rider' AND active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive rider';
  END IF;

  -- Update the order
  UPDATE public.orders 
  SET 
    rider_id = p_rider_id,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for riders to self-assign available orders
CREATE OR REPLACE FUNCTION public.claim_order(
  p_order_id UUID
) RETURNS public.orders AS $$
DECLARE
  v_order public.orders;
  v_rider_id UUID;
BEGIN
  v_rider_id := auth.uid();
  
  -- Verify caller is an active rider
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_rider_id AND role = 'rider' AND active = true
  ) THEN
    RAISE EXCEPTION 'Only active riders can claim orders';
  END IF;

  -- Claim the order (only if ready and unassigned)
  UPDATE public.orders 
  SET 
    rider_id = v_rider_id,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id 
    AND status = 'ready' 
    AND rider_id IS NULL
  RETURNING * INTO v_order;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not available for claiming';
  END IF;

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
