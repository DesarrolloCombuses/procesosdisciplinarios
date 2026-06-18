-- ============================================================
--  Configuración del programa en la nube · Procesos Disciplinarios
--  (logo, pie de página, empresa, ciudad, firma, etc.)
--  Cómo usar: Supabase -> SQL Editor -> pegar todo -> Run
-- ============================================================

create table if not exists public.pd_config (
  id text primary key,
  datos jsonb,
  creado_en timestamptz not null default now()
);

alter table public.pd_config enable row level security;

drop policy if exists "pd_config_auth_all" on public.pd_config;
create policy "pd_config_auth_all"
  on public.pd_config for all to authenticated
  using (true) with check (true);
