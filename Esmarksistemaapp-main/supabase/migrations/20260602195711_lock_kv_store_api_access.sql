-- Keep internal KV/settings data behind Edge Functions.

alter table public.kv_store_09dfc183 enable row level security;

drop policy if exists anon_full_access on public.kv_store_09dfc183;
drop policy if exists authenticated_full_access on public.kv_store_09dfc183;

revoke all on table public.kv_store_09dfc183 from anon;
revoke all on table public.kv_store_09dfc183 from authenticated;

grant all on table public.kv_store_09dfc183 to service_role;
