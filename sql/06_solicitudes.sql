-- ============================================================
--  Solicitudes de descargo · Procesos Disciplinarios COMBUSES
--  El jefe (solicitante) crea una solicitud con los hechos y pruebas.
--  El administrador la revisa y genera la citación.
--  Cómo usar: Supabase -> SQL Editor -> pegar todo -> Run
-- ============================================================

create table if not exists public.pd_solicitudes (
  id text primary key,
  creado_por uuid references auth.users(id) on delete set null,
  creado_por_email text,
  cc text,
  nombre text,
  area text,
  cargo text,
  fecha_hechos text,
  hechos text,
  falta text,
  estado text not null default 'pendiente',   -- pendiente | convertida | rechazada
  proceso_key text,                            -- clave del proceso cuando se genera la citación
  observacion_admin text,
  creado_en timestamptz not null default now()
);

alter table public.pd_solicitudes enable row level security;

-- El solicitante puede crear y ver/editar SOLO sus propias solicitudes
drop policy if exists "pd_sol_propias" on public.pd_solicitudes;
create policy "pd_sol_propias"
  on public.pd_solicitudes for all to authenticated
  using (creado_por = auth.uid())
  with check (creado_por = auth.uid());

-- El administrador puede ver y administrar TODAS las solicitudes
drop policy if exists "pd_sol_admin" on public.pd_solicitudes;
create policy "pd_sol_admin"
  on public.pd_solicitudes for all to authenticated
  using (public.pd_mi_rol() = 'admin')
  with check (public.pd_mi_rol() = 'admin');
