/* ============================================================
   Notificaciones vía Pabbly Connect (envío de DOCUMENTOS PDF)
   PLANTILLA DE EJEMPLO
   Copia este archivo como  js/notificaciones.js  y pon tu webhook.
   ------------------------------------------------------------
   El programa genera el PDF y lo envía como ARCHIVO al webhook
   "Catch Webhook with File Data" de Pabbly. Pabbly + WATI se
   encargan de enviarlo por WhatsApp (y correo si se configura).
   ============================================================ */
const PD_NOTIF = {
  // Webhook de Pabbly que RECIBE ARCHIVOS (file data)
  webhookDocumento: 'https://connect.pabbly.com/webhook-listener/filedata/TU_WEBHOOK',

  // MODO PRUEBA: mientras está en true, TODO se envía a estos datos de prueba
  modoPrueba: true,
  correoPrueba: 'correo-de-prueba@ejemplo.com',
  celularPrueba: '3000000000'
};

// Celular colombiano a formato internacional sin "+" (3145382506 -> 573145382506)
function celInternacional(cel) {
  let n = String(cel || '').replace(/\D/g, '');
  if (!n) return '';
  if (n.length === 10) n = '57' + n;
  return n;
}

// Escapa texto para insertarlo de forma segura dentro de HTML
function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Arma el correo (HTML) que reciben los líderes: a quién se citó y para qué día/hora.
// Importante: SOLO comillas simples en los atributos (Pabbly no admite comillas dobles en el contenido).
function avisoLideresHTML(p) {
  return `<div style='font-family:Arial,Helvetica,sans-serif;color:#1a202c;max-width:600px;margin:0 auto'>
    <div style='background:#2c5282;color:#ffffff;padding:16px 20px;border-radius:10px 10px 0 0'>
      <h2 style='margin:0;font-size:18px'>📋 Citación a descargos</h2>
      <p style='margin:4px 0 0;font-size:13px;opacity:.9'>Proceso disciplinario</p>
    </div>
    <div style='border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 10px 10px'>
      <p style='margin:0 0 12px'>Se informa que el siguiente trabajador fue <strong>citado a descargos</strong>:</p>
      <table style='width:100%;border-collapse:collapse;font-size:14px'>
        <tr><td style='padding:7px 0;color:#5a6b82;width:42%'>Trabajador</td><td style='padding:7px 0;font-weight:700'>${escHtml(p.nombre)}</td></tr>
        <tr><td style='padding:7px 0;color:#5a6b82'>Cédula</td><td style='padding:7px 0'>${escHtml(p.cc)}</td></tr>
        <tr><td style='padding:7px 0;color:#5a6b82'>Cargo</td><td style='padding:7px 0'>${escHtml(p.cargo || 'N/D')}</td></tr>
        <tr><td style='padding:7px 0;color:#5a6b82'>Día de la diligencia</td><td style='padding:7px 0;font-weight:700;color:#2c5282'>${escHtml(p.fechaCitacion || '____')}</td></tr>
        <tr><td style='padding:7px 0;color:#5a6b82'>Hora</td><td style='padding:7px 0;font-weight:700;color:#2c5282'>${escHtml(p.horaCitacion || '____')}</td></tr>
      </table>
      ${p.motivo ? `<p style='margin:14px 0 0;font-size:13px;color:#444'><strong>Motivo:</strong> ${escHtml(p.motivo)}</p>` : ''}
      <p style='font-size:12px;color:#718096;margin:18px 0 0'>Mensaje automático del sistema de Procesos Disciplinarios.</p>
    </div>
  </div>`;
}

// Configuración de líderes por defecto (se usa si aún no se ha cargado la de la nube).
// En la app se edita desde ⚙️ Configuración y se guarda en pd_config.
const LIDERES_FALLBACK = {
  reglas: [
    { frases: 'conductor, gestor', correo: 'lider-operaciones@ejemplo.com' },
    { frases: 'flota', correo: 'lider-control-flota@ejemplo.com' },
    { frases: 'contab, contad', correo: 'lider-contabilidad@ejemplo.com' }
  ],
  adminCorreo: 'lider-administrativo@ejemplo.com',
  adminExcluye: 'conductor, gestor, flota'
};
const _normCargo = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Devuelve los correos de los líderes a notificar según el cargo (usa la config editable de la nube)
function lideresPara(cargo) {
  const L = (window.PD_LIDERES && Array.isArray(window.PD_LIDERES.reglas)) ? window.PD_LIDERES : LIDERES_FALLBACK;
  const c = _normCargo(cargo);
  const correos = new Set();
  (L.reglas || []).forEach(r => {
    const frases = String(r.frases || '').split(',').map(s => _normCargo(s.trim())).filter(Boolean);
    if (r.correo && frases.some(f => c.includes(f))) correos.add(String(r.correo).trim());
  });
  if (L.adminCorreo) {
    const excl = String(L.adminExcluye || '').split(',').map(s => _normCargo(s.trim())).filter(Boolean);
    if (!excl.some(f => c.includes(f))) correos.add(String(L.adminCorreo).trim());
  }
  // Respaldo: si el cargo no tiene líder asignado, enviar al administrativo
  if (correos.size === 0) correos.add(String(L.adminCorreo || 'lider-administrativo@ejemplo.com').trim());
  return [...correos];
}

// Archiva el PDF en nuestra nube (Supabase Storage) y devuelve un enlace estable (1 año)
async function archivarPdf(blob, filename, p) {
  if (!window.SB) return null;
  try {
    const key = (p && p.key) || 'sin_caso';
    const safe = String(filename || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    // El timestamp va como CARPETA (para unicidad) y el nombre del archivo queda limpio
    // (así WhatsApp/correo muestran un nombre presentable, no el número del timestamp)
    const path = `${key}/documentos/${Date.now()}/${safe}`;
    const up = await SB.storage.from('pruebas-disciplinarias').upload(path, blob, { upsert: true, contentType: 'application/pdf' });
    if (up.error) { console.warn('No se pudo archivar el PDF:', up.error.message); return null; }
    const { data } = await SB.storage.from('pruebas-disciplinarias').createSignedUrl(path, 60 * 60 * 24 * 365); // 1 año
    return data ? data.signedUrl : null;
  } catch (e) { console.warn('Error archivando PDF:', e); return null; }
}

// Envía el PDF (archivo) + el enlace + los datos al webhook de Pabbly
async function enviarDocumentoWebhook(blob, filename, p, titulo) {
  try {
    p = p || {};
    const celular = PD_NOTIF.modoPrueba ? PD_NOTIF.celularPrueba : (p.celular || p.numeroCelularCitado || '');
    const correo = PD_NOTIF.modoPrueba ? PD_NOTIF.correoPrueba : (p.correoNotificacion || p.correoCitado || '');
    const pdfUrl = await archivarPdf(blob, filename, p);   // archivar + enlace estable
    const fd = new FormData();
    fd.append('file', blob, filename || 'documento.pdf');   // el PDF (por si lo quieres adjunto en WATI)
    fd.append('PDF_URL', pdfUrl || '');                     // enlace de descarga estable
    fd.append('NOMBRE', p.nombre || '');
    fd.append('CC', String(p.cc || ''));
    fd.append('CELULAR', celInternacional(celular));
    fd.append('CORREO', correo);
    fd.append('DOCUMENTO', titulo || '');
    fd.append('ARCHIVO', filename || '');

    // Aviso a los líderes: solo cuando es la CITACIÓN A DESCARGOS
    const esCitacion = /citaci/i.test(titulo || '');
    if (esCitacion) {
      const lideres = PD_NOTIF.modoPrueba ? [PD_NOTIF.correoPrueba] : lideresPara(p.cargo);
      const aviso =
        `PROCESO DISCIPLINARIO\n\n` +
        `El trabajador ${p.nombre || ''} (C.C. ${p.cc || ''}, cargo: ${p.cargo || 'N/D'}) fue CITADO A DESCARGOS.\n\n` +
        `Fecha de la diligencia: ${p.fechaCitacion || '____'}\n` +
        `Hora: ${p.horaCitacion || '____'}\n\n` +
        `Motivo: ${p.motivo || ''}`;
      fd.append('LIDERES', lideres.join(','));
      fd.append('AVISO_LIDER', aviso);                // texto plano (respaldo)
      fd.append('AVISO_LIDER_HTML', avisoLideresHTML(p)); // correo en HTML (recomendado)
    }

    await fetch(PD_NOTIF.webhookDocumento, { method: 'POST', mode: 'no-cors', body: fd });
    if (window.toast) toast('📎 Documento enviado' + (PD_NOTIF.modoPrueba ? ' (prueba)' : ''), 'ok');
  } catch (e) {
    console.warn('No se pudo enviar el documento al webhook:', e);
    if (window.toast) toast('No se pudo enviar el documento al webhook', 'err');
  }
}
window.enviarDocumentoWebhook = enviarDocumentoWebhook;
