begin;

drop policy if exists anon_full_access on public.quotes;
drop policy if exists authenticated_full_access on public.quotes;
drop policy if exists anon_full_access on public.quote_items;
drop policy if exists authenticated_full_access on public.quote_items;

alter table public.quotes enable row level security;
alter table public.quotes force row level security;
alter table public.quote_items enable row level security;
alter table public.quote_items force row level security;

revoke all on table public.quotes from anon, authenticated;
revoke all on table public.quote_items from anon, authenticated;

grant all on table public.quotes to service_role;
grant all on table public.quote_items to service_role;

commit;
