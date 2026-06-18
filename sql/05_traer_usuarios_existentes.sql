-- ============================================================
--  Traer usuarios existentes al panel de roles
--  Procesos Disciplinarios COMBUSES
--  ------------------------------------------------------------
--  Registra en pd_perfiles a los usuarios que ya existían en
--  Supabase (creados antes de configurar los roles).
--  Quedan con rol 'solicitante' por defecto; tú les cambias
--  el rol desde el panel "Usuarios y roles".
--  Cómo usar: Supabase -> SQL Editor -> pegar todo -> Run
-- ============================================================

insert into public.pd_perfiles (id, email, nombre, rol)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'nombre', u.email), 'solicitante'
from auth.users u
on conflict (id) do update set email = excluded.email;

-- Asegura que tu cuenta siga como administrador
update public.pd_perfiles set rol = 'admin'
where email = 'procesos@combuses.com.co';
