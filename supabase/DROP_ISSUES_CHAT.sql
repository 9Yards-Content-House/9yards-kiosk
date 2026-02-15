-- ============================================
-- DROP DELIVERY ISSUES & CHAT TABLES
-- Run this in Supabase SQL Editor to clean up
-- ============================================

-- Remove columns added to orders table
ALTER TABLE public.orders DROP COLUMN IF EXISTS has_issue;
ALTER TABLE public.orders DROP COLUMN IF EXISTS issue_id;

-- Drop the tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.order_messages CASCADE;
DROP TABLE IF EXISTS public.delivery_issues CASCADE;

-- Drop the enums if they exist
DROP TYPE IF EXISTS resolution_type CASCADE;
DROP TYPE IF EXISTS issue_type CASCADE;
DROP TYPE IF EXISTS issue_status CASCADE;

-- Clean up RLS policies (will error if they don't exist, that's ok)
DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.delivery_issues;
DROP POLICY IF EXISTS "Authenticated users can view issues" ON public.delivery_issues;
DROP POLICY IF EXISTS "Authenticated users can update issues" ON public.delivery_issues;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.order_messages;
DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.order_messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.order_messages;

SELECT 'Delivery issues and chat tables dropped successfully' as result;
