-- ============================================================
-- 014a: ADD NEW ENUM VALUES
-- Must be run and committed BEFORE 014b
-- PostgreSQL requires new enum values to be committed before use
-- ============================================================

-- Add new order status values
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'arrived';

-- Add reception role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'reception';
