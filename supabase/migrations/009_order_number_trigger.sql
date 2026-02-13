-- 009: Auto-generate memorable order numbers (9Y-XK42 format)
-- Format: 9Y + 2 random letters + 2 random digits for easy verbal communication

create or replace function public.generate_order_number()
returns trigger as $$
declare
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';  -- Excluded I and O to avoid confusion
  l1 char(1);
  l2 char(1);
  d1 int;
  d2 int;
  new_number text;
  attempts int := 0;
begin
  -- Try to generate a unique order number (max 10 attempts)
  loop
    l1 := substr(letters, floor(random() * 24 + 1)::int, 1);
    l2 := substr(letters, floor(random() * 24 + 1)::int, 1);
    d1 := floor(random() * 10)::int;
    d2 := floor(random() * 10)::int;
    new_number := '9Y-' || l1 || l2 || d1::text || d2::text;
    
    -- Check if this number already exists
    if not exists(select 1 from public.orders where order_number = new_number) then
      new.order_number := new_number;
      return new;
    end if;
    
    attempts := attempts + 1;
    if attempts >= 10 then
      -- Fallback: add timestamp suffix for uniqueness
      new.order_number := new_number || '-' || extract(epoch from now())::int % 1000;
      return new;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger to use new function
drop trigger if exists set_order_number on public.orders;

create trigger set_order_number
  before insert on public.orders
  for each row
  when (new.order_number is null)
  execute function public.generate_order_number();
