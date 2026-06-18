-- ============================================================
--  Pruebas (fotos/videos) en la nube · Procesos Disciplinarios
--  ------------------------------------------------------------
--  Requiere haber creado el bucket PRIVADO: pruebas-disciplinarias
--  Cómo usar: Supabase -> SQL Editor -> pegar todo -> Run
--  Seguro de ejecutar varias veces.
-- ============================================================

-- 1) Tabla con el registro de cada prueba (la foto/video vive en el bucket;
--    aquí guardamos solo la referencia: a qué proceso pertenece y su ruta)
create table if not exists public.pd_pruebas (
  id text primary key,
  proc_key text not null,
  nombre text,
  tipo text,
  fecha text,
  path text,
  creado_en timestamptz not null default now()
);

alter table public.pd_pruebas enable row level security;

drop policy if exists "pd_pruebas_auth_all" on public.pd_pruebas;
create policy "pd_pruebas_auth_all"
  on public.pd_pruebas for all to authenticated
  using (true) with check (true);

-- 2) Permisos del bucket privado 'pruebas-disciplinarias'
--    Solo usuarios con sesión pueden subir, ver, actualizar y borrar archivos.
drop policy if exists "pd_bucket_select" on storage.objects;
create policy "pd_bucket_select" on storage.objects
  for select to authenticated using (bucket_id = 'pruebas-disciplinarias');

drop policy if exists "pd_bucket_insert" on storage.objects;
create policy "pd_bucket_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'pruebas-disciplinarias');

drop policy if exists "pd_bucket_update" on storage.objects;
create policy "pd_bucket_update" on storage.objects
  for update to authenticated using (bucket_id = 'pruebas-disciplinarias');

drop policy if exists "pd_bucket_delete" on storage.objects;
create policy "pd_bucket_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'pruebas-disciplinarias');
