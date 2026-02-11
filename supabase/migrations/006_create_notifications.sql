-- 006: Create notifications table
create type public.notification_type as enum ('new_order', 'status_change', 'payment_received');

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  type public.notification_type not null,
  message text not null,
  read boolean not null default false,
  target_role public.user_role not null,
  created_at timestamptz not null default now()
);

create index idx_notifications_role_read on public.notifications(target_role, read);

alter table public.notifications enable row level security;
