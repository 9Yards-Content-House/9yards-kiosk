-- 010: Notification trigger — auto-create notification on new order

create or replace function public.notify_new_order()
returns trigger as $$
begin
  -- Notify kitchen staff
  insert into public.notifications (order_id, type, message, target_role)
  values (
    new.id,
    'new_order',
    'New order ' || coalesce(new.order_number, '') || ' from ' || new.customer_name || ' (' || new.payment_method || ')',
    'kitchen'
  );

  -- Notify admin
  insert into public.notifications (order_id, type, message, target_role)
  values (
    new.id,
    'new_order',
    'New order ' || coalesce(new.order_number, '') || ' — ' || new.total || ' UGX',
    'admin'
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_order
  after insert on public.orders
  for each row execute function public.notify_new_order();

-- Notify on status change
create or replace function public.notify_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    -- Notify rider when order is ready
    if new.status = 'ready' then
      insert into public.notifications (order_id, type, message, target_role)
      values (
        new.id,
        'status_change',
        'Order ' || coalesce(new.order_number, '') || ' is ready for delivery',
        'rider'
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_status_change
  after update on public.orders
  for each row execute function public.notify_status_change();
