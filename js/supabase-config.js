// ============================================================
//  Conexión a Supabase — Procesos Disciplinarios COMBUSES
// ============================================================
// La "publishable key" es pública por diseño: la seguridad real
// la da el login (Auth) + las políticas RLS de la tabla.
// Requiere que ANTES se haya cargado el script de supabase-js.
// ------------------------------------------------------------
const SUPABASE_URL = 'https://cbplebkmxrkaafqdhiyi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DZCceNTENY4ViP17-eZrGg_bdMElZ9X';

// Cliente global de Supabase (se usa como: SB.auth..., SB.from('tabla')...)
const SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.SB = SB; // exponerlo en window para que todo el programa lo encuentre

// Devuelve a qué página debe ir el usuario según su rol.
// Por seguridad, si no se puede determinar el rol, va al programa principal (admin).
async function destinoPorRol() {
  try {
    const { data: { user } } = await SB.auth.getUser();
    if (user) {
      const { data: perfil } = await SB.from('pd_perfiles').select('rol').eq('id', user.id).maybeSingle();
      const rol = perfil && perfil.rol;
      if (rol === 'operador') return 'firmar.html';
      if (rol === 'solicitante') return 'solicitud.html';
    }
  } catch (e) { /* si falla, va al principal */ }
  return 'index.html';
}

// Traduce los mensajes de error de Supabase al español
function mensajeAuth(error) {
  const m = (error && error.message ? error.message : '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Tu cuenta aún no está confirmada. Pídele al administrador que la active.';
  if (m.includes('email logins are disabled')) return 'El inicio de sesión por correo está desactivado en Supabase.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.';
  return (error && error.message) ? error.message : 'Ocurrió un error. Inténtalo de nuevo.';
}
