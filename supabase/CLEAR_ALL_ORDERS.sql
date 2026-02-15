-- ============================================
-- CLEAR ALL ORDERS DATA
-- Run this in Supabase SQL Editor
-- WARNING: This permanently deletes all order data!
-- ============================================

-- First delete order items (child table)
DELETE FROM public.order_items;

-- Then delete orders (parent table)
DELETE FROM public.orders;

-- Verify deletion
SELECT 
  'orders' as table_name, 
  COUNT(*) as remaining_rows 
FROM public.orders
UNION ALL
SELECT 
  'order_items' as table_name, 
  COUNT(*) as remaining_rows 
FROM public.order_items;

-- Output result
SELECT 'All orders cleared successfully!' as result;
