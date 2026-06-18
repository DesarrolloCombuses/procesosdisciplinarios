/* ============================================================
   Campana flotante de FIRMAS PENDIENTES (desde hoy)
   Compartida por todas las pantallas (admin, solicitante, etc.).
   - Muestra cuántas firmas faltan y de quién.
   - Al firmarse un documento, deja de aparecer (se recalcula).
   - Al tocar un conductor: si la página puede buscarlo lo busca;
     si no, abre el Portal de firma con esa cédula.
   Requiere que ANTES esté cargado js/supabase-config.js (SB).
   ============================================================ */
(function () {
  if (!window.SB) return;
  const FECHA_CORTE = '2026-06-17'; // solo pendientes desde esta fecha
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function aISO(f) {
    if (!f) return null; f = String(f).trim();
    let m = f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    m = f.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    return null;
  }
  function fechaRef(p) {
    const a = [p.fechaCitacion, p.fechaActaDescargos, p.fechaDiligenciamiento, p.fechaInicioSancion, p.fechaFinSancion].map(aISO).filter(Boolean);
    return a.length ? a.sort().pop() : null;
  }
  const desdeCorte = p => { const f = fechaRef(p); return !!f && f >= FECHA_CORTE; };
  function tipoDecisionTxt(p) {
    const t = norm(p.tipoDecision);
    if (t.includes('llamado') || t.includes('atencion')) return 'Llamado de atención';
    if (t.includes('terminacion') || t.includes('contrato')) return 'Terminación de contrato';
    if (t.includes('invit')) return 'Invitación al mejoramiento';
    if (t.includes('susp')) return 'Suspensión';
    return 'Decisión / sanción';
  }
  const DOCS = [
    { key: 'firmaCitacion', tit: () => 'Citación a descargos', aplica: p => !!(p.fechaCitacion && String(p.fechaCitacion).trim()) },
    { key: 'firmaDescargos', tit: () => 'Acta de descargos', aplica: p => norm(p.asistencia) === 'si' && !!((p.acta && String(p.acta).trim()) || (p.fechaActaDescargos && String(p.fechaActaDescargos).trim())) },
    { key: 'firmaDecision', tit: p => tipoDecisionTxt(p), aplica: p => /sancion|llamado|atencion|invit|terminacion|finaliz/.test(norm(p.estado)) || !!(p.tipoDecision && String(p.tipoDecision).trim()) }
  ];

  // --- Estilos ---
  const css = `
  .pdc-bell{position:fixed;bottom:20px;right:20px;z-index:9000;background:#2c5282;color:#fff;border:none;border-radius:50px;padding:13px 18px;font-size:15px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.35);cursor:pointer;display:flex;align-items:center;gap:8px}
  .pdc-bell .pdc-num{background:#e53e3e;color:#fff;border-radius:50px;padding:2px 9px;font-size:13px}
  .pdc-panel{position:fixed;bottom:78px;right:20px;width:340px;max-width:92vw;max-height:62vh;overflow-y:auto;background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.4);padding:14px;z-index:9000;display:none;font-family:'Segoe UI',system-ui,sans-serif}
  .pdc-panel.show{display:block}
  .pdc-h{font-weight:700;color:#16293f;margin-bottom:8px}
  .pdc-item{border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:8px;cursor:pointer}
  .pdc-item:hover{background:#f1f5f9}
  .pdc-item .pdc-n{font-weight:700;color:#16293f;font-size:14px}
  .pdc-item .pdc-d{font-size:12px;color:#5a6b82;margin-top:2px}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // --- Elementos ---
  function montar() {
    const btn = document.createElement('button');
    btn.className = 'pdc-bell'; btn.hidden = true;
    btn.innerHTML = '🔔 Pendientes <span class="pdc-num">0</span>';
    const panel = document.createElement('div');
    panel.className = 'pdc-panel';
    panel.innerHTML = '<div class="pdc-h">🔔 Firmas pendientes (desde hoy)</div><div style="font-size:12px;color:#5a6b82;margin-bottom:8px">Toca un conductor para recoger su firma.</div><div class="pdc-list"></div>';
    document.body.appendChild(btn); document.body.appendChild(panel);
    btn.addEventListener('click', () => panel.classList.toggle('show'));
    return { btn, panel };
  }

  let UI = null;
  window.__pdcClic = function (cc) {
    if (UI) UI.panel.classList.remove('show');
    if (typeof window.campanaIrAConductor === 'function') window.campanaIrAConductor(cc);
    else window.open('firmar.html?cc=' + encodeURIComponent(cc), '_blank');
  };

  async function cargar() {
    if (!window.SB || !UI) return;
    try {
      const { data: s } = await SB.auth.getSession();
      if (!s || !s.session) return;
      const { data, error } = await SB.from('procesos_disciplinarios').select('key,datos').limit(5000);
      if (error) return;
      const procs = (data || []).map(r => (r.datos && typeof r.datos === 'object') ? r.datos : { key: r.key });
      const pend = [];
      procs.filter(desdeCorte).forEach(p => DOCS.forEach(d => { if (d.aplica(p) && !p[d.key]) pend.push({ p, t: typeof d.tit === 'function' ? d.tit(p) : d.tit }); }));
      UI.btn.hidden = false;
      const num = UI.btn.querySelector('.pdc-num'); num.textContent = pend.length; num.style.display = pend.length ? 'inline-block' : 'none';
      const list = UI.panel.querySelector('.pdc-list');
      list.innerHTML = pend.length
        ? pend.map(x => `<div class="pdc-item" onclick="__pdcClic('${String(x.p.cc || '').replace(/\D/g, '')}')"><div class="pdc-n">${esc(x.p.nombre || x.p.cc || '')}</div><div class="pdc-d">${esc(x.t)} · C.C. ${esc(x.p.cc || '')}</div></div>`).join('')
        : '<p style="font-size:13px;color:#5a6b82">No hay firmas pendientes hoy. 🎉</p>';
    } catch (e) { /* sin conexión */ }
  }
  window.refrescarCampana = cargar;

  function iniciar() { UI = montar(); cargar(); setInterval(cargar, 60000); }
  if (document.readyState !== 'loading') iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
