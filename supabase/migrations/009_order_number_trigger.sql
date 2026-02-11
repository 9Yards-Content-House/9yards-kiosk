-- 009: Auto-generate order numbers (9Y-0001, 9Y-0002, ...)

create sequence if not exists public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns trigger as $$
begin
  new.order_number := '9Y-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql security definer;

create trigger set_order_number
  before insert on public.orders
  for each row
  when (new.order_number is null)
  execute function public.generate_order_number();
