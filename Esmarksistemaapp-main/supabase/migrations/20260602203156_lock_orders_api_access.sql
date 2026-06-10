begin;

drop policy if exists anon_full_access on public.orders;
drop policy if exists authenticated_full_access on public.orders;
drop policy if exists anon_full_access on public.order_items;
drop policy if exists authenticated_full_access on public.order_items;

alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;

grant all on table public.orders to service_role;
grant all on table public.order_items to service_role;

commit;
