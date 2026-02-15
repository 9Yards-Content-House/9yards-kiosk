-- ============================================
-- DELIVERY ISSUES & IN-APP MESSAGING
-- ============================================
-- This migration adds support for:
-- 1. Tracking delivery issues reported by riders
-- 2. In-app messaging between riders and admin/kitchen
-- 3. Issue resolution workflow

-- Issue status enum
DO $$ BEGIN
  CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'escalated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Issue type enum
DO $$ BEGIN
  CREATE TYPE issue_type AS ENUM (
    'customer_unavailable',
    'wrong_address', 
    'order_damaged',
    'customer_refused',
    'payment_issue',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Resolution type enum
DO $$ BEGIN
  CREATE TYPE resolution_type AS ENUM (
    'retry_delivery',
    'return_to_kitchen',
    'refund_customer',
    'customer_contacted',
    'partial_refund',
    'no_action_needed',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- DELIVERY ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.delivery_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Issue details
  issue_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  photo_urls TEXT[], -- Array of photo URLs if rider takes photos
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open',
  resolution_type TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_delivery_issues_order_id ON public.delivery_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_issues_status ON public.delivery_issues(status);
CREATE INDEX IF NOT EXISTS idx_delivery_issues_rider_id ON public.delivery_issues(rider_id);

-- ============================================
-- ORDER MESSAGES TABLE (In-app chat)
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.delivery_issues(id) ON DELETE CASCADE,
  
  -- Message content
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_role TEXT NOT NULL, -- 'rider', 'admin', 'kitchen'
  message TEXT NOT NULL,
  
  -- Read tracking
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_issue_id ON public.order_messages(issue_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender_id ON public.order_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_unread ON public.order_messages(is_read) WHERE is_read = false;

-- ============================================
-- ADD issue_status TO ORDERS TABLE
-- ============================================
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS has_issue BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS issue_id UUID REFERENCES public.delivery_issues(id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.delivery_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Riders can create issues" ON public.delivery_issues;
DROP POLICY IF EXISTS "Riders can view own issues" ON public.delivery_issues;
DROP POLICY IF EXISTS "Staff can view all issues" ON public.delivery_issues;
DROP POLICY IF EXISTS "Staff can update issues" ON public.delivery_issues;

DROP POLICY IF EXISTS "Users can send messages" ON public.order_messages;
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.order_messages;
DROP POLICY IF EXISTS "Staff can view all messages" ON public.order_messages;
DROP POLICY IF EXISTS "Recipients can mark as read" ON public.order_messages;

-- DELIVERY ISSUES POLICIES

-- Riders can create issues for their assigned orders
CREATE POLICY "Riders can create issues"
  ON public.delivery_issues
  FOR INSERT
  WITH CHECK (
    rider_id = auth.uid()
  );

-- Riders can view their own issues
CREATE POLICY "Riders can view own issues"
  ON public.delivery_issues
  FOR SELECT
  USING (
    rider_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen', 'reception')
    )
  );

-- Staff can update issues (resolve, escalate, etc.)
CREATE POLICY "Staff can update issues"
  ON public.delivery_issues
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen')
    )
  );

-- ORDER MESSAGES POLICIES

-- Users can send messages if they're involved with the order
CREATE POLICY "Users can send messages"
  ON public.order_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Users can view messages for orders they're involved with
CREATE POLICY "Users can view messages"
  ON public.order_messages
  FOR SELECT
  USING (
    -- Sender can see their own messages
    sender_id = auth.uid()
    -- Or user is the rider for this order
    OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_messages.order_id AND rider_id = auth.uid()
    )
    -- Or user is staff
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'kitchen', 'reception')
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages read"
  ON public.order_messages
  FOR UPDATE
  USING (
    -- Must be a recipient (not sender)
    sender_id != auth.uid()
    AND (
      -- Rider for this order
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = order_messages.order_id AND rider_id = auth.uid()
      )
      -- Or staff
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'kitchen', 'reception')
      )
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update order's has_issue flag when issue is created
CREATE OR REPLACE FUNCTION update_order_issue_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.orders 
    SET has_issue = true, issue_id = NEW.id
    WHERE id = NEW.order_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' THEN
    UPDATE public.orders 
    SET has_issue = false, issue_id = NULL
    WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_issue_flag ON public.delivery_issues;
CREATE TRIGGER trigger_update_order_issue_flag
  AFTER INSERT OR UPDATE ON public.delivery_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_order_issue_flag();

-- Auto-update updated_at on delivery_issues
CREATE OR REPLACE FUNCTION update_delivery_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_issues_updated_at ON public.delivery_issues;
CREATE TRIGGER trigger_delivery_issues_updated_at
  BEFORE UPDATE ON public.delivery_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_issues_updated_at();

-- ============================================
-- NOTIFICATIONS FOR ISSUES
-- ============================================

-- Function to create notification when issue is reported
CREATE OR REPLACE FUNCTION notify_issue_reported()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_rider_name TEXT;
BEGIN
  -- Get order number
  SELECT order_number INTO v_order_number
  FROM public.orders WHERE id = NEW.order_id;
  
  -- Get rider name
  SELECT name INTO v_rider_name
  FROM public.profiles WHERE id = NEW.rider_id;
  
  -- Create notification for admins
  INSERT INTO public.notifications (user_id, type, title, message, order_id)
  SELECT 
    id,
    'issue_reported',
    'Delivery Issue Reported',
    'Order #' || v_order_number || ' has an issue: ' || NEW.issue_type || '. Rider: ' || COALESCE(v_rider_name, 'Unknown'),
    NEW.order_id
  FROM public.profiles
  WHERE role IN ('admin', 'kitchen');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_issue_reported ON public.delivery_issues;
CREATE TRIGGER trigger_notify_issue_reported
  AFTER INSERT ON public.delivery_issues
  FOR EACH ROW
  EXECUTE FUNCTION notify_issue_reported();

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_sender_name TEXT;
  v_rider_id UUID;
BEGIN
  -- Get order info
  SELECT order_number, rider_id INTO v_order_number, v_rider_id
  FROM public.orders WHERE id = NEW.order_id;
  
  -- Get sender name
  SELECT name INTO v_sender_name
  FROM public.profiles WHERE id = NEW.sender_id;
  
  -- If sender is rider, notify admins
  IF NEW.sender_role = 'rider' THEN
    INSERT INTO public.notifications (user_id, type, title, message, order_id)
    SELECT 
      id,
      'new_message',
      'New Message from Rider',
      'Order #' || v_order_number || ': ' || LEFT(NEW.message, 50),
      NEW.order_id
    FROM public.profiles
    WHERE role IN ('admin', 'kitchen');
  ELSE
    -- Notify the rider
    IF v_rider_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, order_id)
      VALUES (
        v_rider_id,
        'new_message',
        'New Message from ' || INITCAP(NEW.sender_role),
        'Order #' || v_order_number || ': ' || LEFT(NEW.message, 50),
        NEW.order_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.order_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.order_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

COMMENT ON TABLE public.delivery_issues IS 'Tracks issues reported by riders during delivery';
COMMENT ON TABLE public.order_messages IS 'In-app chat messages between riders and staff for specific orders';
