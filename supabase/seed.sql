-- Seed data for 9Yards Kiosk — generated from menu.json
-- Run after all migrations: psql -f supabase/seed.sql

-- ==============================================
-- Categories
-- ==============================================
insert into public.categories (id, name, slug, sort_order) values
  (gen_random_uuid(), 'Main Dishes',  'main-dishes',  1),
  (gen_random_uuid(), 'Sauces',       'sauces',       2),
  (gen_random_uuid(), 'Side Dishes',  'side-dishes',  3),
  (gen_random_uuid(), 'Lusaniya',     'lusaniya',     4),
  (gen_random_uuid(), 'Juices',       'juices',       5),
  (gen_random_uuid(), 'Desserts',     'desserts',     6);

-- ==============================================
-- Main Dishes (included FREE with combos)
-- ==============================================
insert into public.menu_items (id, category_id, name, description, price, image_url, available, sort_order)
select
  gen_random_uuid(),
  c.id,
  v.name,
  v.description,
  0,
  v.image_url,
  true,
  v.sort_order
from public.categories c
cross join (values
  ('Matooke',    'Steamed green bananas mashed to silky perfection - Uganda''s beloved staple',  '/images/menu/main-dishes/matooke.jpg',                     1),
  ('White Rice', 'Fluffy, perfectly steamed long-grain rice',                                     '/images/menu/main-dishes/9yards-food-white-rice.jpg',       2),
  ('Pilao',      'Fragrant spiced rice cooked with aromatic herbs and spices',                    '/images/menu/main-dishes/9yards-food-pilao.jpg',            3),
  ('Posho',      'Traditional maize meal, soft and smooth - perfect with any stew',               '/images/menu/main-dishes/9yards-food-posho.jpg',            4),
  ('Cassava',    'Tender boiled cassava, naturally sweet and satisfying',                          '/images/menu/main-dishes/9yards-food-cassava.jpg',          5)
) as v(name, description, image_url, sort_order)
where c.slug = 'main-dishes';

-- ==============================================
-- Sauces (protein combos with preparations & sizes)
-- ==============================================
insert into public.menu_items (id, category_id, name, description, price, image_url, available, preparations, sizes, sort_order)
select
  gen_random_uuid(),
  c.id,
  v.name,
  v.description,
  v.base_price,
  v.image_url,
  true,
  v.preparations::jsonb,
  v.sizes::jsonb,
  v.sort_order
from public.categories c
cross join (values
  (
    'Chicken Stew',
    'Tender chicken slow-cooked in a rich tomato and onion gravy',
    20000,
    '/images/menu/sauces/9Yards-Chicken-Stew-Menu.jpg',
    '["Fried","Boiled","Grilled"]',
    '[{"name":"Regular","price":20000},{"name":"Half-Chicken","price":38000},{"name":"Full Chicken","price":58000}]',
    1
  ),
  (
    'Beef Stew',
    'Melt-in-your-mouth beef chunks in a hearty, seasoned gravy',
    20000,
    '/images/menu/sauces/9Yards-Beef-Stew-Menu.jpg',
    '["Fried","Boiled"]',
    '[{"name":"Regular","price":20000}]',
    2
  ),
  (
    'Fish',
    'Fresh tilapia, golden-fried or expertly smoked to perfection',
    20000,
    '/images/menu/sauces/9Yards-Fresh-Fish-Menu.jpg',
    '["Fried","Smoked","Boiled"]',
    '[{"name":"Regular","price":20000}]',
    3
  ),
  (
    'Cowpeas',
    'Creamy cowpeas slow-cooked in aromatic local spices',
    15000,
    '/images/menu/sauces/9Yards-cowpeas-Menu.jpg',
    '[]',
    '[{"name":"Regular","price":15000}]',
    4
  ),
  (
    'Liver',
    'Succulent pan-fried liver in a savory onion and herb gravy',
    20000,
    '/images/menu/sauces/9Yards-Liver-Menu.jpg',
    '[]',
    '[{"name":"Regular","price":20000}]',
    5
  ),
  (
    'G-Nuts',
    'Rich, velvety groundnut paste simmered with traditional spices',
    15000,
    '/images/menu/sauces/9Yards-G-Nuts-Menu.jpg',
    '[]',
    '[{"name":"Regular","price":15000}]',
    6
  ),
  (
    'Fish & G-Nuts',
    'Crispy fish swimming in a luscious groundnut sauce',
    20000,
    '/images/menu/sauces/9Yards-Fish-&-G-Nuts-Menu.jpg',
    '[]',
    '[{"name":"Regular","price":20000}]',
    7
  )
) as v(name, description, base_price, image_url, preparations, sizes, sort_order)
where c.slug = 'sauces';

-- ==============================================
-- Side Dishes (included FREE with combos)
-- ==============================================
insert into public.menu_items (id, category_id, name, description, price, image_url, available, sort_order)
select
  gen_random_uuid(),
  c.id,
  v.name,
  v.description,
  0,
  v.image_url,
  true,
  v.sort_order
from public.categories c
cross join (values
  ('Cabbage',  'Fresh sautéed cabbage with onions and mild spices',    '/images/menu/side-dish/9Yards-cabbage-Menu.jpg',  1),
  ('Avocado',  'Creamy ripe avocado - the perfect healthy addition',   '/images/menu/side-dish/9Yards-avocado-Menu.jpg',  2)
) as v(name, description, image_url, sort_order)
where c.slug = 'side-dishes';

-- ==============================================
-- Lusaniya (signature complete meals)
-- ==============================================
insert into public.menu_items (id, category_id, name, description, price, image_url, available, sort_order)
select
  gen_random_uuid(),
  c.id,
  v.name,
  v.description,
  v.price,
  v.image_url,
  true,
  v.sort_order
from public.categories c
cross join (values
  ('Ordinary Lusaniya',                 'Our signature combo - aromatic pilao with your choice of protein and fresh kachumbari',                         45000, '/images/menu/lusaniya/ordinary-lusaniya.jpg',                1),
  ('Beef & Pilao Lusaniya',             'Generous tender beef over spiced pilao rice, topped with zesty kachumbari. Serves 2-3',                        45000, '/images/menu/lusaniya/beef-&-pilao-lusaniya.jpg',            2),
  ('Whole Chicken with Pilao Lusaniya', 'A feast for sharing! Whole roasted chicken on fragrant pilao with fresh kachumbari. Serves 2-3',               45000, '/images/menu/lusaniya/whole-chicken-lusaniya.jpg',           3)
) as v(name, description, price, image_url, sort_order)
where c.slug = 'lusaniya';

-- ==============================================
-- Juices
-- ==============================================
insert into public.menu_items (id, category_id, name, description, price, image_url, available, sort_order)
select
  gen_random_uuid(),
  c.id,
  v.name,
  v.description,
  5000,
  v.image_url,
  true,
  v.sort_order
from public.categories c
cross join (values
  ('Passion Fruit Juice', 'Tangy and refreshing with natural tropical sweetness',                                       '/images/menu/juices/9yards-passion-fruit-juice-menu.jpg', 1),
  ('Mango Juice',         'Sweet, smooth, and bursting with tropical mango flavor',                                      '/images/menu/juices/9yards-mango-juice-menu.jpg',         2),
  ('Watermelon Juice',    'Light, refreshing, and naturally hydrating',                                                   '/images/menu/juices/9yards-watermelon-juice-menu.jpg',    3),
  ('Pineapple Juice',     'Sweet, tangy, and tropical. Fresh pineapple blended to perfection',                            '/images/menu/juices/9yards-pineapple-juice-menu.jpg',     4),
  ('Beetroot Juice',      'Pure beetroot juice. Earthy, naturally sweet, and incredibly nutritious',                       '/images/menu/juices/9yards-beetroot-juice-menu.jpg',      5),
  ('Cocktail Juice',      'A refreshing blend of tropical fruits. The perfect mix of flavors in every sip',               '/images/menu/juices/9yards-food-juice-cocktail.jpg',      6)
) as v(name, description, image_url, sort_order)
where c.slug = 'juices';

-- ==============================================
-- Desserts
-- ==============================================
insert into public.menu_items (id, category_id, name, description, price, image_url, available, sort_order)
select
  gen_random_uuid(),
  c.id,
  v.name,
  v.description,
  v.price,
  v.image_url,
  true,
  v.sort_order
from public.categories c
cross join (values
  ('Chapati', 'Soft, flaky flatbread - perfect for scooping up your favorite stews',    2000, '/images/menu/desserts/Chapati.jpg', 1),
  ('Samosa',  'Crispy golden pastry filled with spiced meat or vegetables',              1000, '/images/menu/desserts/Samosa.jpg',  2)
) as v(name, description, price, image_url, sort_order)
where c.slug = 'desserts';

-- ==============================================
-- Default admin user profile
-- (Run AFTER creating the admin user in Supabase Auth)
-- Update the id below with the actual auth.users id
-- ==============================================
-- update public.profiles
--   set role = 'admin', full_name = 'Admin'
--   where id = '<YOUR_ADMIN_USER_ID>';
