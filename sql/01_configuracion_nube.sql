-- ============================================================
--  Configuración de la nube (Supabase)
--  Procesos Disciplinarios · COMBUSES S.A.
--  ------------------------------------------------------------
--  Cómo usar:
--    1. Entra a Supabase -> SQL Editor -> New query
--    2. Pega TODO este archivo y dale Run (Ctrl + Enter)
--    3. Debe decir "Success. No rows returned"
--
--  Es seguro ejecutarlo varias veces: no borra datos ni columnas.
-- ============================================================

-- 1) Columna para guardar el proceso completo (toda la información en formato JSON)
alter table public.procesos_disciplinarios
  add column if not exists datos jsonb;

-- 2) Activar la seguridad por filas (RLS):
--    sin esto, cualquiera con la clave pública podría leer la tabla.
alter table public.procesos_disciplinarios enable row level security;

-- 3) Permitir leer/escribir SOLO a usuarios con sesión iniciada (login).
drop policy if exists "app_authenticated_all" on public.procesos_disciplinarios;
create policy "app_authenticated_all"
  on public.procesos_disciplinarios
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
--  PASO ADICIONAL (NO es SQL, es un botón en el panel):
--  Cerrar el registro público para que nadie cree cuentas:
--    Authentication -> Sign In / Providers -> Email
--    -> desactivar "Allow new users to sign up"
--  Así solo entran los usuarios que tú creas manualmente.
-- ============================================================
