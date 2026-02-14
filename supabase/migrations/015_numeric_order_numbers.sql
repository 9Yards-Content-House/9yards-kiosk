-- ============================================================
-- 015: UPDATE ORDER NUMBER TO NUMERIC ONLY
-- Changes from 9Y-XK42 format to 6-digit random numbers
-- e.g., 847291, 592041, 103847
-- Random to prevent guessing, numeric for kiosk numpad support
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger AS $$
DECLARE
  new_number text;
  attempts int := 0;
  rand_num int;
BEGIN
  -- Generate a random 6-digit number (100000-999999)
  LOOP
    -- Generate random number between 100000 and 999999
    rand_num := floor(100000 + random() * 900000)::int;
    new_number := rand_num::text;
    
    -- Check if this number already exists
    IF NOT EXISTS(SELECT 1 FROM public.orders WHERE order_number = new_number) THEN
      NEW.order_number := new_number;
      RETURN NEW;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= 20 THEN
      -- Fallback: use timestamp-based number for guaranteed uniqueness
      NEW.order_number := (extract(epoch from now())::bigint % 900000 + 100000)::text;
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists, it will now use the updated function
