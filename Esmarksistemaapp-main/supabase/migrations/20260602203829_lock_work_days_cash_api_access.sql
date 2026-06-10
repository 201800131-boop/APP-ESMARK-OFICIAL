begin;

drop policy if exists anon_full_access on public.work_days;
drop policy if exists authenticated_full_access on public.work_days;
drop policy if exists anon_full_access on public.day_starts;
drop policy if exists authenticated_full_access on public.day_starts;
drop policy if exists anon_full_access on public.day_reports;
drop policy if exists authenticated_full_access on public.day_reports;
drop policy if exists anon_full_access on public.petty_cash_movements;
drop policy if exists authenticated_full_access on public.petty_cash_movements;

alter table public.work_days enable row level security;
alter table public.work_days force row level security;
alter table public.day_starts enable row level security;
alter table public.day_starts force row level security;
alter table public.day_reports enable row level security;
alter table public.day_reports force row level security;
alter table public.petty_cash_movements enable row level security;
alter table public.petty_cash_movements force row level security;

revoke all on table public.work_days from anon, authenticated;
revoke all on table public.day_starts from anon, authenticated;
revoke all on table public.day_reports from anon, authenticated;
revoke all on table public.petty_cash_movements from anon, authenticated;

grant all on table public.work_days to service_role;
grant all on table public.day_starts to service_role;
grant all on table public.day_reports to service_role;
grant all on table public.petty_cash_movements to service_role;

commit;
