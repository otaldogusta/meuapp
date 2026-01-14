alter table if exists public.session_logs
add column if not exists client_id text;

create unique index if not exists session_logs_client_id_idx
on public.session_logs (client_id)
where client_id is not null;
