-- 016: Performance indexes and improvements
-- Adds additional indexes for common query patterns

-- Index on customer_phone for order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone) WHERE customer_phone IS NOT NULL;

-- Partial index for active orders (not arrived or cancelled)
CREATE INDEX IF NOT EXISTS idx_orders_active ON public.orders(status, created_at DESC) 
WHERE status NOT IN ('arrived', 'cancelled');

-- Index on scheduled_for for pre-order queries
CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON public.orders(scheduled_for) 
WHERE scheduled_for IS NOT NULL AND is_scheduled = true;

-- Composite index for queue display queries
CREATE INDEX IF NOT EXISTS idx_orders_queue_display ON public.orders(status, created_at DESC)
WHERE status IN ('new', 'preparing', 'out_for_delivery', 'arrived');
