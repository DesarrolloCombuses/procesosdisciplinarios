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

// Archiva el PDF en nuestra nube (Supabase Storage) y devuelve un enlace estable (1 año)
async function archivarPdf(blob, filename, p) {
  if (!window.SB) return null;
  try {
    const key = (p && p.key) || 'sin_caso';
    const safe = String(filename || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${key}/documentos/${Date.now()}_${safe}`;
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
    await fetch(PD_NOTIF.webhookDocumento, { method: 'POST', mode: 'no-cors', body: fd });
    if (window.toast) toast('📎 Documento enviado' + (PD_NOTIF.modoPrueba ? ' (prueba)' : ''), 'ok');
  } catch (e) {
    console.warn('No se pudo enviar el documento al webhook:', e);
    if (window.toast) toast('No se pudo enviar el documento al webhook', 'err');
  }
}
window.enviarDocumentoWebhook = enviarDocumentoWebhook;
