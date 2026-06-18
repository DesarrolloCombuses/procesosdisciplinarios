-- ============================================================
--  Roles de usuario · Procesos Disciplinarios COMBUSES
--  Roles posibles:  admin | solicitante | operador
--  ------------------------------------------------------------
--  IMPORTANTE: usamos el prefijo "pd_" para NO chocar con las
--  tablas de tus otras aplicaciones en el mismo Supabase.
--  Cómo usar: Supabase -> SQL Editor -> pegar todo -> Run
--  Seguro de ejecutar varias veces.
-- ============================================================

-- 1) Tabla de perfiles: un perfil por usuario, con su rol
create table if not exists public.pd_perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'solicitante',
  creado_en timestamptz not null default now()
);

-- Por si la tabla ya existía sin la columna email
alter table public.pd_perfiles add column if not exists email text;

alter table public.pd_perfiles enable row level security;

-- 2) Cada usuario puede leer SU propio perfil
drop policy if exists "pd_perfil_propio_select" on public.pd_perfiles;
create policy "pd_perfil_propio_select"
  on public.pd_perfiles for select to authenticated
  using (id = auth.uid());

-- 3) Función para saber el rol del usuario actual
--    (security definer = no entra en bucle con las políticas)
create or replace function public.pd_mi_rol()
  returns text language sql stable security definer
  set search_path = public
as $$ select rol from public.pd_perfiles where id = auth.uid() $$;

-- 4) El admin puede ver y administrar TODOS los perfiles
drop policy if exists "pd_perfil_admin_all" on public.pd_perfiles;
create policy "pd_perfil_admin_all"
  on public.pd_perfiles for all to authenticated
  using (public.pd_mi_rol() = 'admin')
  with check (public.pd_mi_rol() = 'admin');

-- 5) Crear automáticamente un perfil (rol 'solicitante') al registrar un usuario nuevo
create or replace function public.pd_crear_perfil()
  returns trigger language plpgsql security definer
  set search_path = public
as $$
begin
  insert into public.pd_perfiles (id, email, nombre, rol)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'solicitante')
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists trg_pd_crear_perfil on auth.users;
create trigger trg_pd_crear_perfil
  after insert on auth.users
  for each row execute function public.pd_crear_perfil();

-- 6) Marcar TU cuenta como ADMINISTRADOR
insert into public.pd_perfiles (id, email, nombre, rol)
select id, email, 'Administrador', 'admin'
from auth.users
where email = 'procesos@combuses.com.co'
on conflict (id) do update set rol = 'admin', email = excluded.email;

-- ============================================================
--  Para asignar un rol a otro usuario más adelante:
--    update public.pd_perfiles set rol = 'operador'
--    where id = (select id from auth.users where email = 'CORREO_AQUI');
--  (roles válidos: admin, solicitante, operador)
-- ============================================================
