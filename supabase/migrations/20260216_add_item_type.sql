-- Add item_type column to menu_items for explicit combo vs standalone control
-- item_type values:
--   'combo_component' - Main dishes, side dishes (price should be 0, included free in combos)
--   'combo_driver'    - Sauces (price drives combo total, user selects size)
--   'standalone'      - Lusaniya, juices, desserts (independent purchase, can also be extras)

-- Create enum type for item_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_item_type') THEN
    CREATE TYPE menu_item_type AS ENUM ('combo_component', 'combo_driver', 'standalone');
  END IF;
END$$;

-- Add column with default 'standalone' (safest default for new items)
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS item_type menu_item_type NOT NULL DEFAULT 'standalone';

-- Set existing items based on their category slug
UPDATE public.menu_items mi
SET item_type = CASE 
  WHEN c.slug IN ('main-dishes', 'side-dishes') THEN 'combo_component'::menu_item_type
  WHEN c.slug = 'sauces' THEN 'combo_driver'::menu_item_type
  ELSE 'standalone'::menu_item_type
END
FROM public.categories c
WHERE mi.category_id = c.id;

-- Add index for filtering by item_type
CREATE INDEX IF NOT EXISTS idx_menu_items_item_type ON public.menu_items(item_type);

-- Add comment for documentation
COMMENT ON COLUMN public.menu_items.item_type IS 
'Controls how item appears in kiosk: combo_component (free with combo), combo_driver (determines combo price), standalone (independent purchase)';
