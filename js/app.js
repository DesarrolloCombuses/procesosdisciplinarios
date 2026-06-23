/* =========================================================
   Procesos Disciplinarios · COMBUSES S.A.
   App de un solo usuario. Datos en IndexedDB del navegador.
   ========================================================= */

/* ---------- 1. Almacenamiento: TODO en la nube (Supabase), nada local ----------
   La información NO se guarda en el equipo. Se mantiene una copia en memoria
   (que se llena al iniciar desde Supabase) y cada cambio se escribe en la nube. */
const DB = (() => {
  const mem = { procesos: new Map(), config: new Map() };
  function open() { return Promise.resolve(); }
  async function all(store) {
    if (store === 'pruebas') return [];               // las pruebas viven en Storage + pd_pruebas
    return [...(mem[store] ? mem[store].values() : [])];
  }
  async function get(store, key) { return mem[store] ? mem[store].get(key) : undefined; }
  async function put(store, val) {
    if (store === 'procesos') { await guardarProcesoNube(val); mem.procesos.set(val.key, val); }
    else if (store === 'config') { await guardarConfigNube(val); mem.config.set(val.id, val); }
    return val;
  }
  async function del(store, key) {
    if (store === 'procesos') { await borrarProcesoNube(key); mem.procesos.delete(key); }
    else if (store === 'config') { mem.config.delete(key); }
    return;
  }
  async function clear(store) { if (mem[store]) mem[store].clear(); }
  function _set(store, arr, keyField) { mem[store] = new Map((arr || []).map(x => [x[keyField], x])); } // carga interna desde la nube
  return { open, all, put, del, get, clear, _set };
})();

/* ---------- 1c. Guardado en la nube (Supabase) — fuente única ---------- */
// Convierte el proceso del programa a las columnas de Supabase (+ copia completa en 'datos')
function mapearProceso(p) {
  return {
    key: p.key,
    cc: p.cc ? String(p.cc) : null,
    nombre: p.nombre || null,
    estado: p.estado || null,
    motivo: p.motivo || null,
    falta: p.falta || null,
    fecha_citacion: p.fechaCitacion || null,
    hora_citacion: p.horaCitacion || null,
    correo_notificacion: p.correoNotificacion || null,
    celular: p.celular || null,
    fecha_acta_descargos: p.fechaActaDescargos || null,
    datos: p
  };
}
async function guardarProcesoNube(p) {
  if (!window.SB || !p || !p.key) throw new Error('Sin conexión a la nube');
  const { error } = await SB.from('procesos_disciplinarios').upsert(mapearProceso(p), { onConflict: 'key' });
  if (error) { try { toast('⚠️ NO se guardó en la nube: ' + (error.message || error), 'err'); } catch (e) {} throw error; }
}
async function borrarProcesoNube(key) {
  if (!window.SB || !key) throw new Error('Sin conexión a la nube');
  const { error } = await SB.from('procesos_disciplinarios').delete().eq('key', key);
  if (error) { try { toast('⚠️ NO se pudo borrar en la nube: ' + (error.message || error), 'err'); } catch (e) {} throw error; }
}
async function guardarConfigNube(cfg) {
  if (!window.SB) throw new Error('Sin conexión a la nube');
  const { error } = await SB.from('pd_config').upsert({ id: cfg.id || 'app', datos: cfg });
  if (error) { try { toast('⚠️ NO se guardó la configuración: ' + (error.message || error), 'err'); } catch (e) {} throw error; }
}

/* ---------- 1b. Versión y novedades ---------- */
const APP_VERSION = '2.9.0';
const NOVEDADES = [
  { v: '2.9.0', f: '2026-06-23', items: [
    'La lista de empleados ahora se carga en vivo desde la base publicada (Google Sheets), por lo que la consulta y el autocompletado de empleados ya funcionan también en la versión web. Para actualizar la base basta con editar la hoja.'
  ] },
  { v: '2.8.0', f: '2026-06-19', items: [
    'Los documentos (citación, acta, sanción) ahora también se pueden generar desde el navegador, sin el servidor local. Así la versión web puede crear PDF. En el computador, si el servidor local está activo, se usa para mayor calidad.'
  ] },
  { v: '2.7.1', f: '2026-06-18', items: [
    'Modo producción activado: las notificaciones (correo y WhatsApp) ahora se envían a los datos reales del trabajador y a los líderes según su cargo. Se desactivó el modo prueba.'
  ] },
  { v: '2.7.0', f: '2026-06-18', items: [
    'El portal de firma ahora muestra y firma el DOCUMENTO OFICIAL completo (idéntico al que se genera y envía), no un resumen. El admin y el portal usan la misma plantilla.',
    'El PDF firmado que se archiva es el documento oficial con la firma en su lugar.'
  ] },
  { v: '2.6.3', f: '2026-06-18', items: [
    'El correo de aviso a los líderes ahora es compatible con Pabbly (se eliminaron las comillas dobles del contenido).',
    'Si una persona no tiene líder asignado según su cargo, el aviso se envía a administrativo@combuses.com.co.'
  ] },
  { v: '2.6.1', f: '2026-06-18', items: [
    'Corregido un error que impedía abrir el Parte semanal y el Calendario.',
    'La generación del PDF ahora reintenta automáticamente si la red falla un momento.'
  ] },
  { v: '2.6.0', f: '2026-06-17', items: [
    'Detalle del proceso más completo: la sección «Sanción / Decisión» ahora muestra el tipo de decisión y todos sus datos (numerales, reintegro, recurso, consideraciones, compromisos).',
    'Nueva sección «🖊️ Documentos y firmas» en el detalle: muestra si la persona firmó la citación, los descargos y la sanción, con la fecha.',
    'El detalle ahora muestra también la fecha y las horas de inicio y finalización de la diligencia de descargos.'
  ] },
  { v: '2.5.0', f: '2026-06-17', items: [
    'El aviso a los líderes ahora llega como un correo en HTML claro: a quién se citó a descargos y para qué día y hora.',
    'Si el administrador cambia la fecha u hora de la citación al editar el proceso, el sistema ofrece reenviar la citación actualizada al trabajador y a los líderes.',
    'Si se modifica una sanción ya decidida, el sistema ofrece reenviar la resolución de sanción actualizada al trabajador.'
  ] },
  { v: '2.4.0', f: '2026-06-17', items: [
    'Los líderes a notificar ahora se editan desde ⚙️ Configuración (panel «Líderes a notificar») y se guardan en la nube; ya no hay que tocar el código para cambiar un correo o agregar un líder.'
  ] },
  { v: '2.3.0', f: '2026-06-17', items: [
    'Nueva vista «📆 Calendario»: muestra en un calendario mensual todas las citaciones a descargos en su fecha. Se navega entre meses y al tocar una citación se abre el proceso.',
    'Aviso a líderes: al generar una citación a descargos, se notifica por correo al líder del área (operaciones, control de flota, contabilidad o administrativo) con el nombre, cargo, fecha y hora de la diligencia.'
  ] },
  { v: '2.2.0', f: '2026-06-17', items: [
    'Diligencia de descargos: al abrir el formulario se registran automáticamente la fecha de hoy y la hora de inicio; al generar el acta se registra la hora de finalización.',
    'Nuevo botón «👁️ Vista previa» en la diligencia de descargos y en la sanción: muestra el documento tal como quedará, para revisarlo con el trabajador antes de generarlo (que confirme que está de acuerdo con lo que dijo).',
    'El nombre de los PDF que se envían por WhatsApp/correo ahora sale limpio (sin el número largo).'
  ] },
  { v: '2.1.0', f: '2026-06-17', items: [
    'Nuevo «Parte semanal de recordatorios»: muestra los citados a descargos/diligencias y las sanciones de la semana, más todos los procesos abiertos. Se puede imprimir o guardar en PDF.',
    'Tablero: ahora destaca el «Empleado con más procesos disciplinarios» y el ranking de reincidentes es clickeable (lleva al historial).',
    'El sistema ADVIERTE si el trabajador no tiene celular o correo (imprescindibles para las notificaciones): al cargar el empleado, al crear el proceso y al enviar el documento.',
    'Portal de firma: documentos ordenados por fecha, con fecha grande tipo calendario y numerados, para no equivocarse cuando hay varios.',
    'Al firmar, el documento firmado (con la firma estampada) se archiva automáticamente en la carpeta del proceso en la nube.'
  ] },
  { v: '2.0.0', f: '2026-06-17', items: [
    'Todo en la nube (Supabase): procesos, fotos/videos y configuración. Ya no se guarda nada en el equipo.',
    'Nuevo panel «Usuarios y roles»: el administrador asigna el rol de cada usuario (administrador, solicitante, operador de firma).',
    'Inicio de sesión con usuario y contraseña; se muestra el usuario logueado en la barra lateral.',
    'Las pruebas (fotos y videos) se guardan en almacenamiento privado y seguro, una carpeta por caso.'
  ] },
  { v: '1.8.0', f: '2026-06-17', items: [
    'Nuevo «Portal de firma»: el trabajador entra (firmar.html), pone su cédula, ve sus documentos pendientes y firma con el dedo o el mouse.',
    'La firma del trabajador queda guardada y aparece automáticamente en el PDF (citación, acta de descargos y resolución/decisión).',
    'Acceso desde el menú: «🖊️ Portal de firma» (ideal para abrir en una tablet en la oficina).'
  ] },
  { v: '1.7.4', f: '2026-06-17', items: [
    'Logo de la empresa actualizado en los documentos PDF.'
  ] },
  { v: '1.7.3', f: '2026-06-17', items: [
    'Nuevo tipo de decisión: «Terminación de contrato» (genera carta de terminación por justa causa). El estado del proceso queda automáticamente en PROCESO FINALIZADO.'
  ] },
  { v: '1.7.2', f: '2026-06-17', items: [
    'Los «Numerales infringidos» de la sanción se sugieren automáticamente con base en las faltas y artículos de la citación.',
    'Los «Días de suspensión» se calculan solos al poner las fechas de inicio y fin (nunca negativos), y se sugiere la fecha de reintegro. También funciona al revés: si pones inicio y días, calcula el fin.'
  ] },
  { v: '1.7.1', f: '2026-06-17', items: [
    'Las actualizaciones del programa ahora se aplican solas (ya no hay que pulsar «Actualizar» ni pelear con el caché).',
    'Recordatorio: el «Llamado de atención» ya está disponible en el Paso 3 y NO genera sanción.'
  ] },
  { v: '1.7.0', f: '2026-06-17', items: [
    'Campos obligatorios con guía: los campos requeridos se marcan con * y, si falta alguno, la app avisa exactamente cuál y lo resalta en rojo.',
    'Citación: obligatorios nombre, cédula, reporte de los hechos, fecha y hora de citación.',
    'Descargos: obligatorios «¿asistió?» y fecha; si asistió, también el cuestionario.',
    'Decisión: obligatorio el tipo de decisión; si es suspensión, los días e inicio.'
  ] },
  { v: '1.6.2', f: '2026-06-17', items: [
    'Arreglada la tabla de Procesos: el encabezado ya no se monta sobre las filas.',
    'Se eliminan automáticamente los procesos de prueba que pudieran haber quedado.'
  ] },
  { v: '1.6.1', f: '2026-06-17', items: [
    'Nuevo tipo de decisión en el Paso 3: «Llamado de atención» (genera su propio documento). El estado queda como LLAMADO DE ATENCIÓN automáticamente.'
  ] },
  { v: '1.6.0', f: '2026-06-17', items: [
    'Nueva sección «👤 Perfil sociodemográfico»: consulta por cédula o nombre y muestra contacto, datos personales, seguridad social, datos laborales y conducción.',
    'La lista de empleados ahora incluye datos sociodemográficos (correo, celular, dirección, EPS, AFP, escolaridad, etc.).',
    'La citación a descargos incluye el celular y el correo del trabajador (clave para las notificaciones que vienen).'
  ] },
  { v: '1.5.3', f: '2026-06-17', items: [
    'Lista de empleados actualizada desde la base oficial (884 trabajadores). Los datos para la citación se autocompletan con esta información.'
  ] },
  { v: '1.5.2', f: '2026-06-16', items: [
    'El Estado del proceso ahora es automático según el tipo de decisión: SUSPENSION → SANCION; INVITACIÓN AL MEJORAMIENTO → INVITACIÓN AL MEJORAMIENTO.',
    'Se quitó «EN DECISIÓN» de las opciones manuales del Paso 3 (el proceso lo toma solo al terminar los descargos).',
    'Nuevo estado «PROCESO CANCELADO» y botón «🚫 Cancelar proceso» en la ficha.'
  ] },
  { v: '1.5.1', f: '2026-06-16', items: [
    'El campo «Estado» del proceso se trasladó al Paso 3 (Decisión y sanción), junto a la decisión.'
  ] },
  { v: '1.5.0', f: '2026-06-16', items: [
    'Paso 3 ahora genera DOS tipos de decisión: «Suspensión disciplinaria» (formato COMBUSES completo: antecedentes, descargos, normas, consideraciones, decisión, recurso y fechas) e «Invitación al mejoramiento».',
    'Nuevos campos en Sanción: tipo de decisión, antecedentes, resumen de descargos, consideraciones, numerales infringidos, fecha de reintegro, recurso (ante quién y días) y compromisos de mejora.',
    'Firmas de la resolución con empresa, trabajador y dos testigos.',
    'El «Acta de no comparecencia a descargos» se genera con el formato COMBUSES completo (datos, motivo, inasistencia, normas y constancia) cuando el trabajador no asiste.',
    'El estado «CONVERSATORIO» ahora se llama «EN DECISIÓN» (los procesos existentes se actualizan solos).'
  ] },
  { v: '1.4.1', f: '2026-06-16', items: [
    'Botón «🗑️ Borrar datos de este paso» en Descargos y Sanción: limpia solo esa etapa (sin eliminar el proceso) y la devuelve a su estado anterior.'
  ] },
  { v: '1.4.0', f: '2026-06-16', items: [
    'El programa avisa el estado de cada proceso: qué pasos están hechos (citación, descargos, sanción) y cuál sigue pendiente.',
    'En la ficha aparece un aviso del próximo paso (ej. «Descargos realizados · pendiente: decisión y sanción»).',
    'En el Tablero, cada proceso de «Requieren tu atención» muestra su próximo paso.'
  ] },
  { v: '1.3.0', f: '2026-06-16', items: [
    'Flujo por pasos: en la ficha del proceso hay una barra de etapas (Citación → Descargos → Sanción → Cierre).',
    'Botón «📝 Diligencia de descargos»: abre un formulario propio con sus campos, plantilla/IA de preguntas y pruebas.',
    'Botón «⚖️ Decisión y sanción» con sus campos y generación de la resolución.',
    'Botones «✅ Finalizar» y «↩️ Reabrir» el proceso.'
  ] },
  { v: '1.2.0', f: '2026-06-16', items: [
    'En Procesos: ordena haciendo clic en los encabezados (fecha, nombre, área, estado…).',
    'Filtro por rango de fechas de citación (desde / hasta) y botón para limpiar filtros.',
    'Búsqueda por varias palabras a la vez (todas deben coincidir).',
    'La asistencia ahora se registra en la diligencia de descargos.'
  ] },
  { v: '1.1.0', f: '2026-06-16', items: [
    'La aplicación ahora es instalable (PWA) y avisa cuando hay una versión nueva.',
    'Pruebas con fotos y videos en cada proceso.',
    'Faltas y artículos del reglamento se eligen por numeral (checkbox) y se insertan en tiempo real.',
    'Firma escaneada del responsable en los documentos (sin C.C.).',
    'Generación de PDF directa y profesional con logo y pie.',
    'Historial del trabajador por cédula y tablero renovado.'
  ] }
];
function mostrarNovedades() {
  const html = NOVEDADES.map(n => `<div style="margin-bottom:14px">
    <strong>Versión ${esc(n.v)}</strong> <span class="muted">· ${fechaLarga(n.f)}</span>
    <ul style="margin:8px 0 0 18px;line-height:1.6">${n.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
  </div>`).join('');
  abrirModal(`Novedades · v${APP_VERSION}`, html);
}

/* ---------- 2. Estado global ---------- */
const State = {
  procesos: [],
  config: { empresa: 'COMBUSES S.A.', responsable: 'COORDINADOR DE PROCESOS DISCIPLINARIOS',
            cargoFirma: 'Coordinador de Procesos Disciplinarios', ciudad: 'Medellín',
            nombreFirma: 'RODRIGUEZ LOPERA DEISY MARITZA', cedulaFirma: '', logo: '', pie: '', firmaImg: '', apiKey: '' },
  view: 'dashboard',
  filtros: { q: '', estado: '', area: '', grupo: '', desde: '', hasta: '' },
  sort: { campo: 'fechaCitacion', dir: 'desc' },
  page: 1, perPage: 15,
  current: null,
  histCC: '',
  perfilCC: ''
};

/* ---------- 3. Metadatos de campos (para el formulario) ---------- */
const SECCIONES = [
  { titulo: 'Empleado', campos: [
    ['nombre', 'Nombre completo', 'text'], ['cc', 'Cédula', 'text'], ['empresa', 'Empresa', 'text'],
    ['fechaIngreso', 'Fecha de ingreso', 'date'], ['interno', 'Interno', 'text'], ['area', 'Área', 'text'],
    ['cargo', 'Cargo', 'text'], ['ruta', 'Ruta', 'text'], ['propietario', 'Propietario', 'text'],
    ['correoNotificacion', 'Correo de notificación', 'email'], ['celular', 'Celular', 'text'] ]},
  { titulo: 'La falta', campos: [
    ['motivo', 'Reporte de los hechos (tal como lo notificó la empresa)', 'textarea'],
    ['fechaHechos', 'Fecha en que la empresa conoció los hechos', 'date'],
    ['reglamento', 'Artículos infringidos (Reglamento Interno / CST)', 'textarea'],
    ['falta', 'Falta', 'text'],
    ['primeraVez', 'Primera vez', 'text'], ['segundaVez', 'Segunda vez', 'text'],
    ['terceraVez', 'Tercera vez', 'text'], ['cuartaVez', 'Cuarta vez', 'text'] ]},
  { titulo: 'Citación a descargos', campos: [
    ['fechaCitacion', 'Fecha de citación', 'date'], ['horaCitacion', 'Hora de citación', 'time'],
    ['responsable', 'Responsable', 'text'],
    ['asunto', 'Asunto', 'text'] ]},
  { titulo: 'Descargos', campos: [
    ['asistencia', '¿El trabajador asistió a la diligencia?', 'select:|SI|NO'],
    ['fechaActaDescargos', 'Fecha de la diligencia', 'date'], ['horaActaDescargos', 'Hora de inicio', 'time'],
    ['horaDiligenciamiento', 'Hora de finalización', 'time'],
    ['acta', 'Cuestionario de descargos (preguntas y respuestas)', 'textarea'], ['textoActa', 'Notas adicionales', 'textarea'],
    ['disciplinario', 'Quién dirige la diligencia', 'text'],
    ['fechaDiligenciamiento', 'Fecha de diligenciamiento (registro)', 'date'] ]},
  { titulo: 'Sanción', campos: [
    ['tipoDecision', 'Tipo de decisión', 'select:|SUSPENSION|LLAMADO DE ATENCION|TERMINACION DE CONTRATO|INVITACION AL MEJORAMIENTO'],
    ['estado', 'Estado del proceso (automático según la decisión)', 'select:|SANCION|LLAMADO DE ATENCIÓN|INVITACIÓN AL MEJORAMIENTO|PROCESO FINALIZADO|PROCESO CANCELADO'],
    ['antecedentes', 'Antecedentes / relato de los hechos (para la resolución)', 'textarea'],
    ['resumenDescargos', 'Lo que el trabajador manifestó / reconoció en descargos', 'textarea'],
    ['consideraciones', 'Consideraciones y conclusiones', 'textarea'],
    ['numeralesSancion', 'Numerales infringidos (ej.: Art. 108: 41,50,51 · Art. 112: 6,7)', 'text'],
    ['diasSuspension', 'Días de suspensión', 'number'],
    ['fechaInicioSancion', 'Inicio de suspensión', 'date'], ['fechaFinSancion', 'Fin de suspensión', 'date'],
    ['fechaReintegro', 'Fecha de reintegro', 'date'],
    ['recursoAnte', 'Recurso de reposición ante', 'text'],
    ['recursoDias', 'Días para interponer el recurso', 'number'],
    ['compromisos', 'Compromisos de mejora (solo invitación al mejoramiento)', 'textarea'] ]},
  { titulo: 'Pruebas y archivos', campos: [
    ['pruebas', 'Pruebas (descripción/enlaces)', 'textarea'], ['pruebasVideos', 'Pruebas en video', 'textarea'],
    ['archivosTerminados', 'Archivos terminados', 'textarea'] ]},
];
const TODOS_CAMPOS = SECCIONES.flatMap(s => s.campos.map(c => c[0]));

const PLANTILLA_DESCARGOS = `Indique su nombre completo, número de cédula, cargo, empresa para la cual presta sus servicios, interno asignado, ruta y propietario del vehículo.
R:

Manifieste si recibió la citación a descargos y si entiende los hechos por los cuales fue convocado a esta diligencia.
R:

Explique de manera detallada qué ocurrió en relación con los hechos por los cuales fue citado.
R:

Manifieste si reconoce la conducta o los hechos reportados por la empresa.
R:

Explique las razones que, según usted, ocasionaron los hechos investigados.
R:

Indique si informó oportunamente a algún superior, gestor de movilidad, líder de operaciones o centro de control sobre alguna novedad relacionada.
R:

Manifieste si conoce las instrucciones, procedimientos y el Reglamento Interno de Trabajo aplicables a su cargo.
R:

Indique si acepta, niega o aclara los hechos que motivan la presente diligencia y exponga su versión.
R:

Indique si desea aportar pruebas, documentos, soportes o testigos que respalden sus descargos.
R:

Diga si durante el diligenciamiento de descargos se le garantizó el debido proceso.
R: `;

/* ---------- 4. Utilidades ---------- */
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function toast(msg, tipo = '') { const t = $('#toast'); t.className = 'toast ' + tipo; t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, 2800); }
function nuevaKey() { return 'p' + Math.abs(Date.now()).toString(16) + Math.floor(performance.now() * 1000 % 9999).toString(16); }
function faltaNumDe(falta) { const m = String(falta || '').match(/#\s*(\d+)/); return m ? +m[1] : null; }
function hoyISO() { const d = new Date(); return d.toISOString().slice(0, 10); }
function diasDesde(v) { const d = parseFecha(v); if (!d) return null; return Math.floor((Date.now() - d.getTime()) / 86400000); }
function irAGrupo(grupo) { State.filtros = { q: '', estado: '', area: '', grupo: grupo || '' }; State.page = 1; irA('procesos'); }
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
function fechaLarga(iso) {
  if (!iso) return '____________';
  let d = parseFecha(iso); if (!d) return iso;
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function fechaConDia(iso) {
  let d = parseFecha(iso); if (!d) return '____________';
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function parseFecha(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;   // ya es una fecha
  v = String(v);                                                 // asegurar texto (evita v.match no es función)
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) { const [y,mo,d] = v.slice(0,10).split('-'); return new Date(+y, mo-1, +d); }
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2]-1, +m[1]); }
  const d = new Date(v); return isNaN(d) ? null : d;
}
// Convierte cualquier fecha a ISO yyyy-mm-dd para inputs date
function aISO(v) { const d = parseFecha(v); if (!d) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// Hora actual en formato HH:MM (para inputs time)
function horaActualHM() { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

// Construye los «Numerales infringidos» de la sanción a partir de lo registrado en la citación
// (faltas del Art. 108 y artículos marcados en «Artículos infringidos»).
function numeralesSugeridos(p) {
  const grupos = [];
  const getG = art => { let g = grupos.find(x => x.art === art); if (!g) { g = { art, nums: [] }; grupos.push(g); } return g; };
  // Art. 108 a partir de las faltas (ej. "Art. 108 #41: ...  |  Art. 108 #50: ...")
  const f108 = [...String(p.falta || '').matchAll(/#\s*(\d+)/g)].map(m => m[1]);
  if (f108.length) { const g = getG('108'); f108.forEach(n => { if (!g.nums.includes(n)) g.nums.push(n); }); }
  // Otros artículos a partir del texto de «Artículos infringidos» (bloques separados por línea en blanco)
  String(p.reglamento || '').split(/\n\s*\n/).forEach(bloque => {
    const lineas = bloque.split('\n');
    let art = null;
    lineas.forEach(l => { const ma = l.match(/ART[IÍ]CULO\s+(\d+)/i); if (ma) art = ma[1]; });
    if (!art) return;
    const g = getG(art);
    lineas.forEach(l => { const mi = l.match(/^\s*(\d+)\.\s+/); if (mi && !g.nums.includes(mi[1])) g.nums.push(mi[1]); });
  });
  return grupos.filter(g => g.nums.length).map(g => `Art. ${g.art}: ${g.nums.join(', ')}`).join(' · ');
}
// Estado del proceso que corresponde a cada tipo de decisión del Paso 3
function estadoPorDecision(tipo) {
  const t = norm(tipo);
  if (t.includes('invit')) return 'INVITACIÓN AL MEJORAMIENTO';
  if (t.includes('llamado') || t.includes('atencion')) return 'LLAMADO DE ATENCIÓN';
  if (t.includes('terminacion') || t.includes('contrato')) return 'PROCESO FINALIZADO';
  return 'SANCION';
}
function estadoBadge(e) {
  const v = norm(e);
  let cls = 'vacio', txt = e || 'Sin estado';
  if (v.includes('citacion')) cls = 'citacion';
  else if (v.includes('conversatorio') || v.includes('decision')) cls = 'conversatorio';
  else if (v.includes('cancel')) cls = 'cancelado';
  else if (v.includes('finaliz')) cls = 'finalizado';
  else if (v.includes('invit')) cls = 'invitacion';
  else if (v.includes('llamado') || v.includes('atencion')) cls = 'llamado';
  else if (v.includes('sancion')) cls = 'sancion';
  return `<span class="badge ${cls}">${esc(txt)}</span>`;
}

// ---- Guía y validación de campos obligatorios ----
// Marca con un asterisco rojo las etiquetas de los campos obligatorios
function marcarObligatorios(formSel, claves) {
  const form = document.querySelector(formSel); if (!form) return;
  claves.forEach(k => {
    const el = form.querySelector(`[name="${k}"]`); if (!el) return;
    const campo = el.closest('.field'); const lab = campo && campo.querySelector('label');
    if (lab && !lab.querySelector('.req-mark')) lab.insertAdjacentHTML('beforeend', ' <span class="req-mark">*</span>');
  });
}
// Valida que los campos requeridos tengan dato; resalta los que falten y avisa
function validarObligatorios(formSel, requeridos) {
  const form = document.querySelector(formSel); if (!form) return { ok: true, faltan: [] };
  form.querySelectorAll('.campo-error').forEach(e => e.classList.remove('campo-error'));
  const faltan = [];
  requeridos.forEach(([k, lbl]) => {
    const el = form.querySelector(`[name="${k}"]`);
    const v = el ? String(el.value || '').trim() : '';
    if (!v) { faltan.push(lbl); const campo = el && el.closest('.field'); if (campo) campo.classList.add('campo-error'); }
  });
  if (faltan.length) {
    const first = form.querySelector('.campo-error');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Faltan datos obligatorios: ' + faltan.join(', '), 'err');
  }
  return { ok: faltan.length === 0, faltan };
}

/* ---------- 5. Inicio ---------- */

// Convierte una fila de Supabase al modelo del programa
function deSupabase(row) {
  if (row && row.datos && typeof row.datos === 'object') return row.datos; // proceso de la app: fidelidad total
  // Históricos (vienen en columnas): mapear a los nombres del programa
  return {
    key: row.key,
    cc: row.cc != null ? String(row.cc) : '',
    nombre: row.nombre || '', empresa: row.empresa || '', fechaIngreso: row.fecha_ingreso || '',
    interno: row.interno || '', area: row.area || '', cargo: row.cargo || '', ruta: row.ruta || '',
    propietario: row.propietario || '', motivo: row.motivo || '', falta: row.falta || '',
    reglamento: row.reglamento_interno_trabajo || '',
    fechaCitacion: row.fecha_citacion || '', horaCitacion: row.hora_citacion || '',
    asistencia: row.asistencia || '', asunto: row.asunto || '', acta: row.acta || '',
    fechaActaDescargos: row.fecha_acta_descargos || '', horaActaDescargos: row.hora_acta_descargos || '',
    textoActa: row.texto_acta || '', disciplinario: row.disciplinario || '',
    fechaDiligenciamiento: row.fecha_diligenciamiento_descargos || '', horaDiligenciamiento: row.hora_diligenciamiento_descargos || '',
    fechaInicioSancion: row.fecha_inicio_sancion || '', fechaFinSancion: row.fecha_fin_sancion || '',
    diasSuspension: row.dias_suspension || '', estado: row.estado || '',
    correoNotificacion: row.correo_notificacion || '', celular: row.celular || '',
    responsable: row.responsable || '', firmaCitacion: row.firma_citacion || '',
    pruebas: row.pruebas || '', pruebasVideos: row.pruebas_videos || ''
  };
}

// Lee todos los procesos desde la nube (null si no hay conexión o sesión)
async function cargarDesdeNube() {
  if (!window.SB) return null;
  const { data: s } = await SB.auth.getSession();
  if (!s || !s.session) return null; // sin sesión: usar la copia local
  const { data, error } = await SB.from('procesos_disciplinarios').select('*').limit(5000);
  if (error) throw error;
  return (data || []).map(deSupabase);
}

async function init() {
  await DB.open();

  // 1) Cargar los procesos desde la nube (única fuente). Si no hay conexión, avisa.
  let existentes = [];
  try {
    const arr = await cargarDesdeNube();
    if (arr === null) throw new Error('Sin sesión o sin conexión');
    existentes = arr.filter(r => !String(r.key || '').startsWith('TEST_AUTO_'));
    DB._set('procesos', existentes, 'key');
    toast(`${existentes.length} procesos cargados desde la nube`, 'ok');
  } catch (e) {
    console.warn('No se pudo leer de la nube:', e);
    toast('⚠️ Sin conexión a la nube. Revisa tu internet y recarga.', 'err');
  }

  // 2) Cargar la configuración desde la nube (tabla pd_config)
  try {
    const { data } = await SB.from('pd_config').select('datos').eq('id', 'app').maybeSingle();
    if (data && data.datos) DB._set('config', [data.datos], 'id');
  } catch (e) { /* si falla, se usan los valores por defecto (branding) */ }

  State.procesos = existentes;
  const cfg = await DB.get('config', 'app');
  if (cfg) State.config = { ...State.config, ...cfg };
  // Logo y pie por defecto (COMBUSES) si no hay configurados
  if (window.PD_BRANDING) {
    if (!State.config.logo) State.config.logo = window.PD_BRANDING.logo;
    if (!State.config.pie) State.config.pie = window.PD_BRANDING.pie;
  }
  // Líderes a notificar: si no hay configurados, usar los de fábrica. Se exponen para notificaciones.js
  if (!State.config.lideres) State.config.lideres = JSON.parse(JSON.stringify(DEFAULT_LIDERES));
  window.PD_LIDERES = State.config.lideres;
  enlazarUI();
  render();

  // 3) Cargar la lista de empleados desde el CSV publicado (Google Sheets).
  //    No bloquea la pantalla: si la vista actual aún no tenía empleados
  //    (caso web), se vuelve a pintar cuando termina de cargar.
  if (window.cargarEmpleadosRemoto) {
    const teniaDatos = (window.EMPLEADOS || []).length > 0;
    cargarEmpleadosRemoto().then(n => {
      if (n) {
        toast(`${n} empleados cargados`, 'ok');
        if (!teniaDatos) render();
      } else {
        toast('⚠️ No se pudo cargar la lista de empleados.', 'err');
      }
    });
  }
}

function enlazarUI() {
  document.querySelectorAll('.nav-item').forEach(b => { if (b.dataset.view) b.onclick = () => irA(b.dataset.view); });
  $('#globalSearch').addEventListener('input', e => {
    State.filtros = { q: e.target.value, estado: '', area: '', grupo: '', desde: '', hasta: '' };
    State.page = 1;
    if (State.view === 'procesos') { const tq = $('#tq'); if (tq) tq.value = e.target.value; pintarTablaProcesos(); }
    else irA('procesos');
  });
  $('#modalClose').onclick = cerrarModal;
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });
  $('#btnExport').onclick = exportar;
  $('#btnImport').onclick = () => $('#fileImport').click();
  $('#fileImport').addEventListener('change', importar);
  const ver = $('#appVersion');
  if (ver) { ver.textContent = 'v' + APP_VERSION; ver.onclick = mostrarNovedades; }
}

function irA(view) {
  State.view = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render();
}

const TITULOS = { dashboard:'Tablero', recordatorios:'Parte semanal de recordatorios', calendario:'Calendario de citaciones', procesos:'Procesos', nuevo:'Nuevo proceso', historial:'Historial por cédula', perfil:'Perfil sociodemográfico', reportes:'Reportes', usuarios:'Usuarios y roles', config:'Configuración', detalle:'Detalle del proceso', editar:'Editar proceso' };
function render() {
  $('#viewTitle').textContent = TITULOS[State.view] || '';
  $('#globalSearch').hidden = false;   // buscador siempre disponible (acceso directo)
  const c = $('#content');
  if (State.view === 'dashboard') renderDashboard(c);
  else if (State.view === 'recordatorios') renderRecordatorios(c);
  else if (State.view === 'calendario') renderCalendario(c);
  else if (State.view === 'procesos') { c.innerHTML = ''; renderProcesos(); }
  else if (State.view === 'nuevo') renderForm(c, null);
  else if (State.view === 'historial') renderHistorial(c);
  else if (State.view === 'perfil') renderPerfil(c);
  else if (State.view === 'editar') renderForm(c, State.current);
  else if (State.view === 'paso') renderPasoForm(c, State.current);
  else if (State.view === 'detalle') renderDetalle(c, State.current);
  else if (State.view === 'reportes') renderReportes(c);
  else if (State.view === 'usuarios') renderUsuarios(c);
  else if (State.view === 'config') renderConfig(c);
}

/* ---------- 6. Dashboard ---------- */
function agrupar(arr, fn) {
  const m = new Map();
  arr.forEach(x => { const k = (fn(x) || '').trim() || '(sin dato)'; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function barras(datos, total, clase = '') {
  const max = Math.max(...datos.map(d => d[1]), 1);
  return datos.map(([lbl, n]) =>
    `<div class="bar-row"><div class="bar-label" title="${esc(lbl)}">${esc(lbl)}</div>
     <div class="bar-track"><div class="bar-fill ${clase}" style="width:${Math.max(n/max*100,6)}%">${n}</div></div></div>`
  ).join('');
}

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function renderDashboard(c) {
  const P = State.procesos;
  const total = P.length;
  const porEstado = agrupar(P, x => x.estado);
  const cnt = re => porEstado.filter(([k]) => norm(k).includes(re)).reduce((s, [,n]) => s + n, 0);
  const personas = new Set(P.map(x => x.cc).filter(Boolean)).size;
  const porCC = agrupar(P.filter(x=>x.cc), x => x.cc);
  const reincidentes = porCC.filter(([,n]) => n > 1).length;
  // Empleado con más procesos disciplinarios (el #1)
  const top1 = porCC[0] || null;
  const top1Reg = top1 ? P.find(p => p.cc === top1[0]) : null;
  const enCitacion = cnt('citacion');
  const enConversatorio = cnt('decision') + cnt('conversatorio');
  const conSancion = cnt('sancion');
  const finalizados = cnt('finaliz');
  const hoyTxt = fechaConDia(hoyISO());

  // Procesos abiertos (no finalizados) ordenados por antigüedad
  const abiertos = P.filter(p => !norm(p.estado).includes('finaliz') && !norm(p.estado).includes('cancel'))
    .map(p => ({ ...p, dias: diasDesde(p.fechaCitacion) }))
    .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));

  // KPI clickeable
  const kpi = (cls, ico, num, lbl, grupo) =>
    `<button class="kpi ${cls}" ${grupo!=null?`onclick="irAGrupo('${grupo}')"`:''}>
       <div class="kpi-ico">${ico}</div>
       <div><div class="num">${num}</div><div class="lbl">${lbl}</div></div>
     </button>`;

  c.innerHTML = `
    <div class="hero">
      <div><h2>${saludo()} 👋</h2><p>${hoyTxt}. Tienes <strong>${abiertos.length}</strong> proceso(s) abierto(s).</p></div>
      <button class="btn btn-primary" onclick="irA('nuevo')">➕ Nuevo proceso</button>
    </div>

    <div class="kpi-grid">
      ${kpi('', '📋', total, 'Procesos totales', '')}
      ${kpi('amar', '⏳', enCitacion, 'En citación', 'citacion')}
      ${kpi('conv', '🗣️', enConversatorio, 'En decisión', 'decision')}
      ${kpi('rojo', '⚖️', conSancion, 'Con sanción', 'sancion')}
      ${kpi('verde', '✅', finalizados, 'Finalizados', 'finaliz')}
      ${kpi('gris', '👥', personas, 'Empleados', null)}
    </div>

    <div class="panel" style="background:linear-gradient(135deg,#fff5f5,#ffffff);border-left:5px solid #e53e3e">
      <div class="panel-head"><h2>🥇 Empleado con más procesos disciplinarios</h2></div>
      <div class="panel-body">
        ${top1Reg && top1[1] > 0 ? `
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="font-size:42px">🚩</div>
            <div style="flex:1;min-width:180px">
              <div style="font-size:21px;font-weight:800;color:#16293f">${esc(top1Reg.nombre || top1[0])}</div>
              <div class="muted">C.C. ${esc(top1[0])}${top1Reg.area ? ' · ' + esc(top1Reg.area) : ''}${top1Reg.cargo ? ' · ' + esc(top1Reg.cargo) : ''}</div>
            </div>
            <div style="text-align:center;padding:0 10px">
              <div style="font-size:36px;font-weight:800;color:#e53e3e;line-height:1">${top1[1]}</div>
              <div class="muted">procesos</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="verHistorialCC('${top1[0]}')">📁 Ver historial</button>
          </div>` : '<p class="muted">Aún no hay procesos registrados.</p>'}
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>🔔 Requieren tu atención</h2>
        <span class="muted">Procesos abiertos, del más antiguo al más reciente</span></div>
      <div class="panel-body" id="atencion"></div>
    </div>

    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h2>📊 Procesos por estado</h2></div>
        <div class="panel-body">${barras(porEstado, total, 'amar')}</div></div>
      <div class="panel"><div class="panel-head"><h2>🏢 Procesos por área</h2></div>
        <div class="panel-body">${barras(agrupar(P, x => x.area).slice(0, 8), total)}</div></div>
    </div>

    <div class="panel"><div class="panel-head"><h2>👤 Empleados con más procesos</h2>
      <button class="btn btn-outline btn-sm" onclick="irA('procesos')">Ver todos</button></div>
      <div class="panel-body" id="topReinc"></div></div>`;

  // Lista "requieren atención"
  const semaforo = d => d == null ? '' : d >= 15 ? 'rojo' : d >= 7 ? 'amar' : 'verde';
  const att = abiertos.slice(0, 6).map(p => {
    const d = p.dias;
    const dTxt = d == null ? 'sin fecha' : d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`;
    const np = proximoPaso(p);
    return `<div class="att-row" onclick="verDetalle('${p.key}')">
      <span class="att-dot ${semaforo(d)}"></span>
      <div class="att-main">
        <strong>${esc(p.nombre || 'Sin nombre')}</strong>
        <span class="paso-mini ${np.cls}">${np.ico} ${esc(np.txt)}</span>
      </div>
      <div class="att-meta">${estadoBadge(p.estado)}<span class="att-dias ${semaforo(d)}">${dTxt}</span></div>
    </div>`;
  }).join('') || '<div class="empty"><div class="big">🎉</div>No hay procesos abiertos pendientes.</div>';
  $('#atencion').innerHTML = att;

  const medalla = i => i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
  const top = porCC.filter(([,n]) => n > 1).slice(0, 8).map(([cc, n], i) => {
    const reg = P.find(p => p.cc === cc);
    return `<div class="bar-row" style="cursor:pointer" title="Ver historial de ${esc(reg?.nombre||cc)}" onclick="verHistorialCC('${cc}')">
      <div class="bar-label">${medalla(i)}${esc(reg?.nombre || cc)}</div>
      <div class="bar-track"><div class="bar-fill rojo" style="width:${n/Math.max(porCC[0][1],1)*100}%">${n}</div></div></div>`;
  }).join('') || '<p class="muted">No hay reincidentes.</p>';
  $('#topReinc').innerHTML = top;
}

/* ---------- 6b. Parte semanal de recordatorios ---------- */
// Ir al historial de un trabajador desde cualquier parte
function verHistorialCC(cc) { State.histCC = String(cc || '').trim(); irA('historial'); }

// Rango de la semana actual (lunes a domingo)
function rangoSemana() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const diaSem = (hoy.getDay() + 6) % 7;              // 0 = lunes
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - diaSem);
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6); domingo.setHours(23, 59, 59, 999);
  return { lunes, domingo, hoy };
}

function renderRecordatorios(c) {
  const P = State.procesos;
  const { lunes, domingo } = rangoSemana();
  const enSemana = d => d && d >= lunes && d <= domingo;
  const abierto = p => !norm(p.estado).includes('finaliz') && !norm(p.estado).includes('cancel');

  // Citaciones y diligencias de descargos de la semana
  const descargos = [];
  P.forEach(p => {
    const fc = parseFecha(p.fechaCitacion);
    if (enSemana(fc)) descargos.push({ f: fc, p, tipo: 'Citación a descargos', extra: p.horaCitacion ? '🕒 ' + p.horaCitacion : '' });
    const fd = parseFecha(p.fechaActaDescargos || p.fechaDiligenciamiento);
    if (enSemana(fd)) descargos.push({ f: fd, p, tipo: 'Diligencia de descargos', extra: '' });
  });
  descargos.sort((a, b) => a.f - b.f);

  // Sanciones de la semana (inicio de sanción y reintegros)
  const sanciones = [];
  P.forEach(p => {
    const fi = parseFecha(p.fechaInicioSancion);
    if (enSemana(fi)) sanciones.push({ f: fi, p, tipo: (p.tipoDecision || 'Sanción') + ' · inicia', extra: p.diasSuspension ? p.diasSuspension + ' día(s)' : '' });
    const fr = parseFecha(p.fechaReintegro);
    if (enSemana(fr)) sanciones.push({ f: fr, p, tipo: 'Reintegro a labores', extra: '' });
  });
  sanciones.sort((a, b) => a.f - b.f);

  // Procesos abiertos (no finalizados ni cancelados)
  const abiertos = P.filter(abierto)
    .map(p => ({ ...p, dias: diasDesde(p.fechaCitacion) }))
    .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));

  const filaEv = ev => `<tr>
      <td>${esc(fechaConDia(aISO(ev.f)))}</td>
      <td><strong>${esc(ev.p.nombre || '—')}</strong></td>
      <td>${esc(ev.p.cc || '')}</td>
      <td>${esc(ev.tipo)}${ev.extra ? ` · ${esc(ev.extra)}` : ''}</td>
      <td class="no-print"><button class="btn btn-outline btn-sm" onclick="verDetalle('${ev.p.key}')">Ver</button></td>
    </tr>`;
  const filaAb = p => {
    const np = proximoPaso(p);
    const d = p.dias;
    const dTxt = d == null ? 'sin fecha' : d === 0 ? 'hoy' : `hace ${d} día(s)`;
    return `<tr>
      <td><strong>${esc(p.nombre || '—')}</strong></td>
      <td>${esc(p.cc || '')}</td>
      <td>${estadoBadge(p.estado)}</td>
      <td>${np.ico} ${esc(np.txt)}</td>
      <td>${dTxt}</td>
      <td class="no-print"><button class="btn btn-outline btn-sm" onclick="verDetalle('${p.key}')">Ver</button></td>
    </tr>`;
  };
  const tablaEv = (rows, cols) => rows.length
    ? `<table class="parte-tabla"><thead><tr>${cols.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`
    : `<p class="muted" style="padding:6px 2px">Nada programado para esta semana. 🎉</p>`;

  c.innerHTML = `
    <style>
      .parte-tabla{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
      .parte-tabla th{text-align:left;background:#f1f5f9;color:#2c5282;font-size:12px;text-transform:uppercase;letter-spacing:.3px;padding:8px 10px;border-bottom:2px solid #e2e8f0}
      .parte-tabla td{padding:9px 10px;border-bottom:1px solid #eef2f7;vertical-align:middle}
      .parte-tabla tr:hover td{background:#f8fafc}
      .parte-kpis{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:6px}
      .parte-kpis .pk{flex:1;min-width:150px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px}
      .parte-kpis .pk .n{font-size:28px;font-weight:800;color:#16293f;line-height:1}
      .parte-kpis .pk .l{color:#5a6b82;font-size:13px;margin-top:4px}
    </style>
    <div class="hero">
      <div><h2>📅 Parte semanal de recordatorios</h2>
        <p>Semana del <strong>${esc(fechaConDia(aISO(lunes)))}</strong> al <strong>${esc(fechaConDia(aISO(domingo)))}</strong></p></div>
      <button class="btn btn-primary no-print" onclick="imprimirParte()">🖨️ Imprimir / PDF</button>
    </div>
    <div id="parteContenido">
      <div class="parte-kpis">
        <div class="pk"><div class="n">${descargos.length}</div><div class="l">📣 Citaciones / diligencias esta semana</div></div>
        <div class="pk"><div class="n">${sanciones.length}</div><div class="l">⚖️ Sanciones / reintegros esta semana</div></div>
        <div class="pk"><div class="n">${abiertos.length}</div><div class="l">📂 Procesos abiertos en total</div></div>
      </div>

      <div class="panel"><div class="panel-head"><h2>📣 Citados a descargos / diligencias (esta semana)</h2></div>
        <div class="panel-body">${tablaEv(descargos.map(filaEv), ['Fecha', 'Trabajador', 'Cédula', 'Diligencia', ''])}</div></div>

      <div class="panel"><div class="panel-head"><h2>⚖️ Sanciones y reintegros (esta semana)</h2></div>
        <div class="panel-body">${tablaEv(sanciones.map(filaEv), ['Fecha', 'Trabajador', 'Cédula', 'Detalle', ''])}</div></div>

      <div class="panel"><div class="panel-head"><h2>📂 Procesos abiertos (${abiertos.length})</h2>
        <span class="muted">Del más antiguo al más reciente</span></div>
        <div class="panel-body">${tablaEv(abiertos.map(filaAb), ['Trabajador', 'Cédula', 'Estado', 'Próximo paso', 'Antigüedad', ''])}</div></div>
    </div>`;
}

// Imprime/guarda el parte en una ventana limpia (sin la barra lateral)
function imprimirParte() {
  const cont = document.getElementById('parteContenido');
  if (!cont) return;
  const titulo = 'Parte semanal de recordatorios · ' + (State.config.empresa || 'COMBUSES S.A.');
  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para imprimir', 'err'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1a202c;padding:26px;margin:0}
      h1{font-size:20px;color:#16293f;margin:0 0 4px}
      .sub{color:#5a6b82;font-size:13px;margin:0 0 18px}
      .panel{margin-bottom:20px}
      .panel-head h2{font-size:15px;color:#2c5282;border-bottom:2px solid #e2e8f0;padding-bottom:5px;margin:18px 0 0}
      .panel-head .muted{display:none}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
      th{text-align:left;background:#f1f5f9;padding:7px 9px;border-bottom:2px solid #cbd5e0;font-size:11px;text-transform:uppercase}
      td{padding:7px 9px;border-bottom:1px solid #e8edf3}
      .muted{color:#5a6b82}
      .no-print{display:none!important}
      .parte-kpis{display:flex;gap:14px;margin-bottom:10px}
      .parte-kpis .pk{border:1px solid #cbd5e0;border-radius:8px;padding:10px 14px}
      .parte-kpis .n{font-size:22px;font-weight:800}
      .parte-kpis .l{font-size:12px;color:#5a6b82}
    </style></head><body>
    <h1>📅 ${esc(titulo)}</h1>
    <p class="sub">Generado el ${esc(fechaConDia(hoyISO()))}</p>
    ${cont.innerHTML}
    </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => { w.print(); }, 350);
}

/* ---------- 6c. Calendario de citaciones a descargos ---------- */
function calNavegar(delta) {
  if (State.calAnio == null) { const h = new Date(); State.calAnio = h.getFullYear(); State.calMes = h.getMonth(); }
  let m = State.calMes + delta, a = State.calAnio;
  while (m < 0) { m += 12; a--; }
  while (m > 11) { m -= 12; a++; }
  State.calMes = m; State.calAnio = a; render();
}
function calHoy() { const h = new Date(); State.calAnio = h.getFullYear(); State.calMes = h.getMonth(); render(); }

function renderCalendario(c) {
  const P = State.procesos;
  if (State.calAnio == null) { const h = new Date(); State.calAnio = h.getFullYear(); State.calMes = h.getMonth(); }
  const anio = State.calAnio, mes = State.calMes;
  const MESES_N = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const DIAS_N = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Citaciones a descargos del mes, agrupadas por día (yyyy-mm-dd)
  const porDia = {};
  P.forEach(p => {
    const d = parseFecha(p.fechaCitacion);
    if (d && d.getFullYear() === anio && d.getMonth() === mes) {
      const k = aISO(p.fechaCitacion);
      (porDia[k] = porDia[k] || []).push(p);
    }
  });
  const totalMes = Object.values(porDia).reduce((s, a) => s + a.length, 0);

  // Construir la grilla (lunes a domingo)
  const primero = new Date(anio, mes, 1);
  const offset = (primero.getDay() + 6) % 7;            // 0 = lunes
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasMes; d++) celdas.push(d);
  while (celdas.length % 7 !== 0) celdas.push(null);

  const isoDe = d => `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dosNombres = n => String(n || '—').split(' ').slice(0, 2).join(' ');
  const celdaHTML = d => {
    if (!d) return '<div class="cal-cel cal-vacia"></div>';
    const iso = isoDe(d);
    const items = (porDia[iso] || []).sort((a, b) => String(a.horaCitacion || '').localeCompare(String(b.horaCitacion || '')));
    const esHoy = iso === hoyISO();
    return `<div class="cal-cel${esHoy ? ' cal-hoy' : ''}">
      <div class="cal-num">${d}${esHoy ? ' <span class="cal-hoy-tag">hoy</span>' : ''}</div>
      ${items.slice(0, 4).map(p => `<div class="cal-cit" title="${esc(p.nombre || '')} · C.C. ${esc(p.cc || '')}${p.horaCitacion ? ' · ' + esc(p.horaCitacion) : ''}" onclick="verDetalle('${p.key}')">${p.horaCitacion ? `<b>${esc(p.horaCitacion)}</b> ` : ''}${esc(dosNombres(p.nombre))}</div>`).join('')}
      ${items.length > 4 ? `<div class="cal-mas">+${items.length - 4} más</div>` : ''}
    </div>`;
  };

  c.innerHTML = `
    <style>
      .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
      .cal-dow{text-align:center;font-weight:700;color:#5a6b82;font-size:12px;text-transform:uppercase;padding:6px 2px}
      .cal-cel{min-height:104px;border:1px solid #e2e8f0;border-radius:10px;padding:6px;background:#fff;overflow:hidden}
      .cal-vacia{background:#f7fafc;border-style:dashed}
      .cal-hoy{border-color:#2c5282;box-shadow:0 0 0 2px rgba(44,82,130,.2)}
      .cal-num{font-weight:700;color:#16293f;font-size:13px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center}
      .cal-hoy-tag{background:#2c5282;color:#fff;font-size:10px;font-weight:700;border-radius:20px;padding:1px 7px}
      .cal-cit{background:#ebf4ff;color:#2c5282;border-left:3px solid #2c5282;border-radius:5px;padding:3px 6px;font-size:11.5px;margin-bottom:3px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cal-cit:hover{background:#dbeafe}
      .cal-mas{font-size:11px;color:#5a6b82;padding:2px 4px;cursor:default}
      @media(max-width:680px){.cal-cel{min-height:78px;padding:4px}.cal-cit{font-size:10.5px}}
    </style>
    <div class="hero">
      <div><h2>📆 Calendario de citaciones a descargos</h2>
        <p><strong>${MESES_N[mes]} ${anio}</strong> · ${totalMes} citación(es) este mes</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="calNavegar(-1)">‹ Anterior</button>
        <button class="btn btn-primary" onclick="calHoy()">Hoy</button>
        <button class="btn btn-outline" onclick="calNavegar(1)">Siguiente ›</button>
      </div>
    </div>
    <div class="panel"><div class="panel-body">
      <div class="cal-grid">
        ${DIAS_N.map(d => `<div class="cal-dow">${d}</div>`).join('')}
        ${celdas.map(celdaHTML).join('')}
      </div>
      ${totalMes === 0 ? '<p class="muted" style="text-align:center;padding:14px">No hay citaciones a descargos en este mes.</p>' : '<p class="muted" style="font-size:12px;margin-top:10px">💡 Toca una citación para abrir el proceso.</p>'}
    </div></div>`;
}

/* ---------- 7. Listado de procesos ---------- */
function renderProcesos() {
  const c = $('#content');
  const f = State.filtros;
  const estados = [...new Set(State.procesos.map(p => p.estado).filter(Boolean))].sort();
  const areas = [...new Set(State.procesos.map(p => p.area).filter(Boolean))].sort();

  // La barra de filtros se dibuja UNA vez; al escribir solo se actualiza la tabla (no se pierde el foco)
  c.innerHTML = `
    <div class="toolbar">
      <input type="search" id="tq" placeholder="Buscar (nombre, cédula, ruta, motivo… varias palabras)" value="${esc(f.q)}" style="flex:1;min-width:240px">
      <select id="fEstado"><option value="">Todos los estados</option>${estados.map(e => `<option ${e===f.estado?'selected':''}>${esc(e)}</option>`).join('')}</select>
      <select id="fArea"><option value="">Todas las áreas</option>${areas.map(a => `<option ${a===f.area?'selected':''}>${esc(a)}</option>`).join('')}</select>
      <button class="btn btn-primary btn-sm" onclick="irA('nuevo')">➕ Nuevo</button>
    </div>
    <div class="toolbar">
      <label class="flt-fecha">Citación desde <input type="date" id="fDesde" value="${esc(f.desde)}"></label>
      <label class="flt-fecha">hasta <input type="date" id="fHasta" value="${esc(f.hasta)}"></label>
      <button class="btn btn-outline btn-sm" id="btnLimpiar" onclick="limpiarFiltros()" hidden>✕ Limpiar filtros</button>
      <span class="muted" id="procCount" style="margin-left:auto"></span>
    </div>
    <div id="procBody"></div>`;

  $('#tq').addEventListener('input', e => { State.filtros.q = e.target.value; State.page = 1; pintarTablaProcesos(); });
  $('#fEstado').onchange = e => { State.filtros.estado = e.target.value; State.filtros.grupo = ''; State.page = 1; pintarTablaProcesos(); };
  $('#fArea').onchange = e => { State.filtros.area = e.target.value; State.page = 1; pintarTablaProcesos(); };
  $('#fDesde').onchange = e => { State.filtros.desde = e.target.value; State.page = 1; pintarTablaProcesos(); };
  $('#fHasta').onchange = e => { State.filtros.hasta = e.target.value; State.page = 1; pintarTablaProcesos(); };
  pintarTablaProcesos();
}

// Recalcula y pinta SOLO la tabla + paginador (sin tocar la barra de filtros)
function pintarTablaProcesos() {
  const cont = document.getElementById('procBody');
  if (!cont) return;
  const { q, estado, area, grupo, desde, hasta } = State.filtros;
  const nq = norm(q);
  const dDesde = desde ? parseFecha(desde) : null;
  const dHasta = hasta ? parseFecha(hasta) : null;
  if (dHasta) dHasta.setHours(23, 59, 59);
  let lista = State.procesos.filter(p => {
    if (grupo && !norm(p.estado).includes(grupo)) return false;
    if (estado && norm(p.estado) !== norm(estado)) return false;
    if (area && norm(p.area) !== norm(area)) return false;
    if (dDesde || dHasta) { const ff = parseFecha(p.fechaCitacion); if (!ff) return false; if (dDesde && ff < dDesde) return false; if (dHasta && ff > dHasta) return false; }
    if (nq) {
      const blob = norm([p.nombre, p.cc, p.ruta, p.interno, p.area, p.cargo, p.motivo, p.falta, p.estado].join(' '));
      if (!nq.split(/\s+/).every(t => blob.includes(t))) return false;
    }
    return true;
  });

  const { campo, dir } = State.sort;
  const signo = dir === 'asc' ? 1 : -1;
  lista.sort((a, b) => {
    if (campo === 'fechaCitacion') return ((parseFecha(a.fechaCitacion) || 0) - (parseFecha(b.fechaCitacion) || 0)) * signo;
    return String(a[campo] || '').localeCompare(String(b[campo] || ''), 'es', { numeric: true, sensitivity: 'base' }) * signo;
  });

  const totalPag = Math.max(1, Math.ceil(lista.length / State.perPage));
  if (State.page > totalPag) State.page = 1;
  const pageItems = lista.slice((State.page - 1) * State.perPage, State.page * State.perPage);
  const flecha = k => State.sort.campo === k ? (State.sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  const th = (k, t) => `<th onclick="ordenarPor('${k}')" class="th-sort">${t}${flecha(k)}</th>`;

  const cnt = document.getElementById('procCount'); if (cnt) cnt.textContent = `${lista.length} resultado(s)`;
  const btnL = document.getElementById('btnLimpiar'); if (btnL) btnL.hidden = !(q || estado || area || grupo || desde || hasta);

  cont.innerHTML = `
    ${grupo ? `<div style="margin-bottom:10px"><span class="chip">${esc(grupo)} <button onclick="irAGrupo('')" title="Quitar">✕</button></span></div>` : ''}
    <div class="tbl-wrap"><table>
      <thead><tr>${th('nombre','Nombre')}${th('cc','Cédula')}${th('area','Área')}${th('ruta','Ruta')}${th('fechaCitacion','Fecha citación')}<th>Motivo</th>${th('estado','Estado')}</tr></thead>
      <tbody>${pageItems.map(p => `
        <tr onclick="verDetalle('${p.key}')">
          <td><strong>${esc(p.nombre || '—')}</strong></td>
          <td>${esc(p.cc || '—')}</td>
          <td>${p.area ? `<span class="badge area">${esc(p.area)}</span>` : '—'}</td>
          <td>${esc(p.ruta || '—')}</td>
          <td>${esc(p.fechaCitacion || '—')}</td>
          <td title="${esc(p.motivo)}">${esc((p.motivo || '—').slice(0, 60))}${(p.motivo||'').length>60?'…':''}</td>
          <td>${estadoBadge(p.estado)}</td>
        </tr>`).join('') || `<tr><td colspan="7" class="empty"><div class="big">🔍</div>No hay procesos que coincidan.</td></tr>`}
      </tbody>
    </table></div>
    <div class="pager">
      <button class="btn btn-outline btn-sm" ${State.page<=1?'disabled':''} onclick="cambiarPag(-1)">‹ Anterior</button>
      <span>Página ${State.page} de ${totalPag}</span>
      <button class="btn btn-outline btn-sm" ${State.page>=totalPag?'disabled':''} onclick="cambiarPag(1)">Siguiente ›</button>
    </div>`;
}
function ordenarPor(campo) {
  if (State.sort.campo === campo) State.sort.dir = State.sort.dir === 'asc' ? 'desc' : 'asc';
  else State.sort = { campo, dir: campo === 'fechaCitacion' ? 'desc' : 'asc' };
  pintarTablaProcesos();
}
function limpiarFiltros() {
  State.filtros = { q: '', estado: '', area: '', grupo: '', desde: '', hasta: '' };
  State.page = 1; renderProcesos();
}
function cambiarPag(d) { State.page += d; pintarTablaProcesos(); }

/* ---------- 8. Detalle y pasos ---------- */
function verDetalle(key) { State.current = State.procesos.find(p => p.key === key); State.view = 'detalle'; document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active')); render(); }

// Define un campo de formulario a partir de los metadatos (reutilizable)
function inputCampo(p, campo) {
  const [k, lbl, tipo] = campo;
  let val = p ? (p[k] || '') : '';
  if (tipo.startsWith('select:')) {
    const ops = tipo.slice(7).split('|');
    // Si el valor guardado no está entre las opciones (p. ej. estados de etapas previas), se añade para no perderlo
    if (val && !ops.includes(val)) ops.unshift(val);
    return `<div class="field"><label>${lbl}</label><select name="${k}">${ops.map(o => `<option value="${esc(o)}" ${o===val?'selected':''}>${o||'—'}</option>`).join('')}</select></div>`;
  }
  if (tipo === 'textarea') return `<div class="field full"><label>${lbl}</label><textarea name="${k}">${esc(val)}</textarea></div>`;
  if (tipo === 'date') val = aISO(val);
  return `<div class="field"><label>${lbl}</label><input type="${tipo}" name="${k}" value="${esc(val)}"></div>`;
}

// Etapas del proceso disciplinario
const PASOS = {
  descargos: { titulo: 'Paso 2 · Diligencia de descargos', secciones: ['Descargos'], estado: 'EN DECISIÓN', estadoPrev: 'CITACION A DESCARGOS', doc: 'acta', btn: '📝 Generar acta de descargos' },
  sancion:   { titulo: 'Paso 3 · Decisión y sanción', secciones: ['Sanción'], estado: 'SANCION', estadoPrev: 'EN DECISIÓN', doc: 'sancion', btn: '⚖️ Generar decisión (suspensión / invitación)' }
};
function irAPaso(paso) {
  State.paso = paso; State.view = 'paso';
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  render();
}

function renderPasoForm(c, p) {
  if (!p) { irA('procesos'); return; }
  const cfg = PASOS[State.paso];
  if (!cfg) { verDetalle(p.key); return; }
  const esDesc = State.paso === 'descargos';
  const secciones = SECCIONES.filter(s => cfg.secciones.includes(s.titulo));
  // En el Paso 3 el Estado se deriva automáticamente del tipo de decisión.
  // Si el proceso ya está finalizado o cancelado, se respeta ese estado.
  const pForm = { ...p };
  if (esDesc) {
    // Al abrir la diligencia: si no se ha registrado, poner la fecha de hoy y la hora actual (inicio)
    if (!String(p.fechaActaDescargos || '').trim()) pForm.fechaActaDescargos = hoyISO();
    if (!String(p.horaActaDescargos || '').trim()) pForm.horaActaDescargos = horaActualHM();
  } else {
    const cerrado = norm(p.estado).includes('finaliz') || norm(p.estado).includes('cancel');
    if (!cerrado) pForm.estado = estadoPorDecision(p.tipoDecision);
    // Numerales infringidos: se sugieren automáticamente desde la citación si están vacíos
    if (!String(p.numeralesSancion || '').trim()) pForm.numeralesSancion = numeralesSugeridos(p);
  }

  const asistDesc = esDesc ? `<div class="panel"><div class="panel-head"><h2>🧩 Asistente de preguntas</h2></div>
      <div class="panel-body"><div class="flex" style="flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-outline btn-sm" id="btnPlantillaPreg">📋 Insertar plantilla de preguntas</button>
        <button type="button" class="btn btn-primary btn-sm" id="btnPreguntasIA">✨ Sugerir preguntas con IA</button>
        <span class="muted" style="font-size:12px">La plantilla son preguntas estándar; la IA las adapta al caso.</span>
      </div></div></div>` : '';
  const evid = `<div class="panel"><div class="panel-head"><h2>📎 Pruebas: fotos y videos</h2></div>
      <div class="panel-body">
        <input type="file" id="inpPruebas" accept="image/*,video/*" multiple hidden>
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('inpPruebas').click()">📷 Agregar fotos o videos</button>
        <div id="pruebasPrev" class="pruebas-grid mt"></div>
      </div></div>`;

  c.innerHTML = `
    <div class="detail-head">
      <div class="who"><h2>${esc(cfg.titulo)}</h2>
        <p>${esc(p.nombre || '')} · CC ${esc(p.cc || '—')} · ${estadoBadge(p.estado)}</p></div>
      <div class="detail-actions"><button class="btn btn-outline" onclick="verDetalle('${p.key}')">← Volver al proceso</button></div>
    </div>
    <form id="formPaso">
      ${secciones.map(s => `<div class="panel"><div class="panel-head"><h2>${s.titulo}</h2></div>
        <div class="panel-body"><div class="form-grid">${s.campos.map(cp => inputCampo(pForm, cp)).join('')}</div></div></div>`).join('')}
      ${asistDesc}
      ${evid}
      <div class="form-actions">
        <button type="button" class="btn btn-danger" id="btnBorrarPaso" style="margin-right:auto">🗑️ Borrar datos de este paso</button>
        <button type="button" class="btn btn-outline" onclick="verDetalle('${p.key}')">Cancelar</button>
        <button type="button" class="btn btn-outline" id="btnPreviewPaso">👁️ Vista previa</button>
        <button type="submit" class="btn btn-success">💾 Guardar ${esDesc ? 'descargos' : 'sanción'}</button>
        <button type="button" class="btn btn-primary" id="btnGenPaso">${cfg.btn}</button>
      </div>
    </form>`;

  // Pruebas
  $('#inpPruebas').addEventListener('change', e => { if (e.target.files.length) agregarPruebas(e.target.files, p.key, 'pruebasPrev'); e.target.value = ''; });
  pintarGridPruebas(p.key, 'pruebasPrev');

  // Paso 3: el Estado sigue automáticamente al tipo de decisión (salvo finalizado/cancelado, que se respetan)
  if (!esDesc) {
    const selTipo = document.querySelector('#formPaso [name="tipoDecision"]');
    const selEstado = document.querySelector('#formPaso [name="estado"]');
    if (selTipo && selEstado) selTipo.addEventListener('change', () => {
      // Se conserva solo el «cancelado» manual; el resto se deriva del tipo de decisión
      if (norm(selEstado.value).includes('cancel')) return;
      selEstado.value = estadoPorDecision(selTipo.value);
    });

    // Cálculo automático de días de suspensión y fecha de reintegro (nunca negativos)
    const elf = n => document.querySelector(`#formPaso [name="${n}"]`);
    const fI = elf('fechaInicioSancion'), fF = elf('fechaFinSancion'), fR = elf('fechaReintegro'), fD = elf('diasSuspension');
    const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // inicio + fin → días (inclusive) y reintegro (día siguiente al fin)
    const desdeFechas = () => {
      const di = parseFecha(fI && fI.value), df = parseFecha(fF && fF.value);
      if (!di || !df) return;
      const dias = Math.round((df - di) / 86400000) + 1;
      if (dias < 1) { if (fD) fD.value = ''; toast('La fecha de fin no puede ser anterior al inicio', 'err'); return; }
      if (fD) fD.value = dias;
      if (fR) fR.value = toISO(new Date(df.getTime() + 86400000));
    };
    // inicio + días → fin y reintegro
    const desdeDias = () => {
      const di = parseFecha(fI && fI.value), n = parseInt(fD && fD.value, 10);
      if (!di || !n || n < 1) return;
      const df = new Date(di.getTime() + (n - 1) * 86400000);
      if (fF) fF.value = toISO(df);
      if (fR) fR.value = toISO(new Date(df.getTime() + 86400000));
    };
    if (fF) fF.addEventListener('change', desdeFechas);
    if (fI) fI.addEventListener('change', () => { if (fD && fD.value && (!fF || !fF.value)) desdeDias(); else desdeFechas(); });
    if (fD) {
      fD.addEventListener('input', () => { if (parseInt(fD.value, 10) < 0) fD.value = ''; });
      fD.addEventListener('change', () => { if (fI && fI.value) desdeDias(); });
    }
  }

  // Asistente de descargos
  if (esDesc) {
    const bp = $('#btnPlantillaPreg');
    if (bp) bp.addEventListener('click', () => {
      const ta = document.querySelector('#formPaso [name="acta"]'); if (!ta) return;
      if (ta.value.trim() && !confirm('El cuestionario ya tiene contenido. ¿Reemplazarlo por la plantilla?')) return;
      ta.value = PLANTILLA_DESCARGOS; toast('Plantilla insertada', 'ok');
    });
    const bi = $('#btnPreguntasIA');
    if (bi) bi.addEventListener('click', () => sugerirPreguntasIA(bi));
  }

  // Arma el registro con lo escrito en el formulario y lo guarda (sin navegar)
  async function persistirPaso(marcarFin) {
    const fd = new FormData($('#formPaso'));
    // Combinar sobre la versión más reciente de la base (no perder firmas hechas en la tablet)
    let base = { ...p };
    try { const fresco = await DB.get('procesos', p.key); if (fresco) base = fresco; } catch (e) { /* sin problema */ }
    const reg = { ...base };
    secciones.forEach(s => s.campos.forEach(([k]) => { const val = fd.get(k); if (val !== null) reg[k] = val.toString().trim(); }));
    // En descargos: al cerrar la diligencia, registrar la hora de finalización si está vacía
    if (esDesc && marcarFin && !String(reg.horaDiligenciamiento || '').trim()) reg.horaDiligenciamiento = horaActualHM();
    // Si el paso tiene selector de Estado y la persona eligió uno, se respeta; si no, se aplica el estado del paso.
    const tieneCampoEstado = secciones.some(s => s.campos.some(([k]) => k === 'estado'));
    const estadoElegido = (fd.get('estado') || '').toString().trim();
    if (tieneCampoEstado && estadoElegido) reg.estado = estadoElegido;
    else if (!norm(reg.estado || '').includes('finaliz')) reg.estado = cfg.estado;
    const idx = State.procesos.findIndex(x => x.key === reg.key);
    if (idx >= 0) State.procesos[idx] = reg; else State.procesos.push(reg);
    State.current = reg;
    await DB.put('procesos', reg);
    return reg;
  }
  async function guardar(generar) {
    // Validación de campos obligatorios según el paso
    const f = name => (document.querySelector(`#formPaso [name="${name}"]`)?.value || '').trim();
    let req;
    if (esDesc) {
      req = [['asistencia', '¿El trabajador asistió?'], ['fechaActaDescargos', 'Fecha de la diligencia']];
      if (norm(f('asistencia')) === 'si') req.push(['acta', 'Cuestionario de descargos']);
    } else {
      req = [['tipoDecision', 'Tipo de decisión']];
      if (norm(f('tipoDecision')).includes('susp')) {
        req.push(['diasSuspension', 'Días de suspensión'], ['fechaInicioSancion', 'Inicio de suspensión']);
      }
    }
    if (!validarObligatorios('#formPaso', req).ok) return;
    // ¿Cambió algún dato de este paso respecto a lo guardado? (para ofrecer reenvío de la sanción)
    let baseActual = { ...p };
    try { const fresco = await DB.get('procesos', p.key); if (fresco) baseActual = fresco; } catch (e) { /* sin problema */ }
    const fdAhora = new FormData($('#formPaso'));
    const cambioPaso = secciones.some(s => s.campos.some(([k]) =>
      (fdAhora.get(k) ?? '').toString().trim() !== String(baseActual[k] ?? '').trim()));
    const yaTeniaSancion = !esDesc && String(baseActual.tipoDecision || '').trim();

    const reg = await persistirPaso(generar);   // al generar el acta, marca la hora de finalización
    if (generar) {
      State.view = 'detalle'; render(); generarDoc(cfg.doc);
    } else if (!esDesc && cambioPaso && yaTeniaSancion) {
      // La sanción ya estaba decidida y se modificó → ofrecer reenviar la resolución al trabajador
      if (confirm('Modificaste la sanción.\n\n¿Reenviar la resolución de sanción actualizada al trabajador?')) {
        State.view = 'detalle'; render(); generarDoc('sancion');
        toast('Sanción actualizada y reenviada', 'ok');
      } else { toast('Cambios guardados (sin reenviar)', 'ok'); verDetalle(reg.key); }
    } else {
      toast('Guardado', 'ok'); verDetalle(reg.key);
    }
  }
  // Vista previa: guarda lo escrito (sin navegar) y muestra el documento tal como quedará
  async function previsualizar() {
    await persistirPaso(false);
    generarDoc(cfg.doc, true);
  }
  async function borrarPaso() {
    if (!confirm(`¿Borrar los datos de «${cfg.titulo}»?\nSe limpian solo los campos de este paso; el proceso NO se elimina.`)) return;
    const reg = { ...p };
    secciones.forEach(s => s.campos.forEach(([k]) => { reg[k] = ''; }));
    if (!norm(reg.estado || '').includes('finaliz')) reg.estado = cfg.estadoPrev;
    const idx = State.procesos.findIndex(x => x.key === reg.key);
    if (idx >= 0) State.procesos[idx] = reg;
    State.current = reg;
    await DB.put('procesos', reg);
    toast('Datos del paso borrados', 'ok'); verDetalle(reg.key);
  }
  $('#formPaso').addEventListener('submit', e => { e.preventDefault(); guardar(false); });
  $('#btnGenPaso').addEventListener('click', () => guardar(true));
  $('#btnPreviewPaso').addEventListener('click', previsualizar);
  $('#btnBorrarPaso').addEventListener('click', borrarPaso);

  // Guía: marcar con * los campos obligatorios del paso
  marcarObligatorios('#formPaso', esDesc ? ['asistencia', 'fechaActaDescargos'] : ['tipoDecision']);
}

// Detecta qué etapas están completas según los datos del proceso
function estadoPasos(p) {
  const citacion = !!(p.fechaCitacion && p.fechaCitacion.trim());
  const descargos = !!((p.acta && p.acta.trim()) || (p.fechaActaDescargos && p.fechaActaDescargos.trim()) || ['si', 'no'].includes(norm(p.asistencia)));
  const sancion = !!((p.diasSuspension && String(p.diasSuspension).trim()) || (p.fechaInicioSancion && p.fechaInicioSancion.trim()));
  const finalizado = norm(p.estado).includes('finaliz');
  const cancelado = norm(p.estado).includes('cancel');
  return { citacion, descargos, sancion, finalizado, cancelado };
}
// Devuelve el aviso del próximo paso pendiente
function proximoPaso(p) {
  const e = estadoPasos(p);
  if (e.cancelado) return { txt: 'Proceso cancelado', cls: '', ico: '🚫' };
  if (e.finalizado) return { txt: 'Proceso finalizado', cls: 'ok', ico: '✅' };
  if (!e.descargos) return { txt: 'Pendiente: realizar la diligencia de descargos', cls: 'warn', ico: '📝' };
  if (!e.sancion) return { txt: 'Descargos realizados · pendiente: decisión y sanción', cls: 'info', ico: '⚖️' };
  return { txt: 'Sanción registrada · pendiente: cerrar el proceso', cls: 'info', ico: '🏁' };
}

// Barra visual de etapas + botones para avanzar el proceso
function stepperHTML(p) {
  const ne = norm(p.estado);
  const actual = (ne.includes('finaliz') || ne.includes('cancel')) ? 4 : (ne.includes('sancion') || ne.includes('invit') || ne.includes('llamado') || ne.includes('atencion')) ? 3 : (ne.includes('conversatorio') || ne.includes('decision')) ? 2 : 1;
  const pasos = [
    { n: 1, t: 'Citación' }, { n: 2, t: 'Descargos' }, { n: 3, t: 'Sanción' }, { n: 4, t: 'Cierre' }
  ];
  const linea = pasos.map(s => {
    const cls = s.n < actual ? 'hecho' : s.n === actual ? 'actual' : '';
    return `<div class="step ${cls}"><div class="step-num">${s.n < actual ? '✓' : s.n}</div><div class="step-lbl">${s.t}</div></div>`;
  }).join('<div class="step-line"></div>');
  const np = proximoPaso(p);
  const ep = estadoPasos(p);
  const aviso = `<div class="paso-aviso ${np.cls}">${np.ico} ${esc(np.txt)}${ep.descargos && p.fechaActaDescargos ? ` · diligencia del ${esc(p.fechaActaDescargos)}` : ''}</div>`;
  return `<div class="panel"><div class="panel-body">
      <div class="stepper">${linea}</div>
      ${aviso}
      <div class="flex mt" style="flex-wrap:wrap;gap:8px;justify-content:center">
        <button class="btn btn-primary" onclick="irAPaso('descargos')">📝 Diligencia de descargos</button>
        <button class="btn btn-warn" onclick="irAPaso('sancion')">⚖️ Decisión y sanción</button>
        ${actual < 4 ? `<button class="btn btn-success" onclick="finalizarProceso()">✅ Finalizar proceso</button>
        <button class="btn btn-outline" onclick="cancelarProceso()">🚫 Cancelar proceso</button>` : `<button class="btn btn-outline" onclick="reabrirProceso()">↩️ Reabrir proceso</button>`}
      </div>
    </div></div>`;
}
async function finalizarProceso() {
  if (!State.current) return;
  if (!confirm('¿Marcar este proceso como FINALIZADO?')) return;
  State.current.estado = 'PROCESO FINALIZADO';
  const idx = State.procesos.findIndex(x => x.key === State.current.key);
  if (idx >= 0) State.procesos[idx] = State.current;
  await DB.put('procesos', State.current);
  toast('Proceso finalizado', 'ok'); render();
}
async function cancelarProceso() {
  if (!State.current) return;
  if (!confirm('¿Marcar este proceso como CANCELADO?\nDejará de aparecer entre los procesos abiertos.')) return;
  State.current.estado = 'PROCESO CANCELADO';
  const idx = State.procesos.findIndex(x => x.key === State.current.key);
  if (idx >= 0) State.procesos[idx] = State.current;
  await DB.put('procesos', State.current);
  toast('Proceso cancelado', 'ok'); render();
}
async function reabrirProceso() {
  if (!State.current) return;
  State.current.estado = 'EN DECISIÓN';
  const idx = State.procesos.findIndex(x => x.key === State.current.key);
  if (idx >= 0) State.procesos[idx] = State.current;
  await DB.put('procesos', State.current);
  toast('Proceso reabierto', 'ok'); render();
}

function renderDetalle(c, p) {
  if (!p) { irA('procesos'); return; }
  const reincid = State.procesos.filter(x => x.cc && x.cc === p.cc);
  const di = (lbl, val, long) => `<div class="di ${long?'long':''}"><dt>${lbl}</dt><dd>${val ? esc(val) : '<span class="muted">—</span>'}</dd></div>`;

  // ¿Hay datos de sanción/decisión?
  const haySancion = !!(p.tipoDecision || p.fechaInicioSancion || p.consideraciones || p.numeralesSancion || p.compromisos);

  // Documentos del proceso y estado de su firma
  const firmaEstado = (firmada, fecha) => firmada
    ? `<span style="color:#2f855a;font-weight:700">✅ Firmada${fecha ? ' · ' + esc(fecha) : ''}</span>`
    : `<span style="color:#b7791f;font-weight:700">⏳ Pendiente de firma</span>`;
  const docsFirma = [];
  if (p.fechaCitacion) docsFirma.push({ t: 'Citación a descargos', f: p.firmaCitacion, fe: p.firmaCitacionFecha });
  if (norm(p.asistencia) === 'si' && (p.acta || p.fechaActaDescargos)) docsFirma.push({ t: 'Acta de diligencia de descargos', f: p.firmaDescargos, fe: p.firmaDescargosFecha });
  if (p.tipoDecision || /sancion|llamado|atencion|invit|terminacion|finaliz/.test(norm(p.estado))) docsFirma.push({ t: p.tipoDecision || 'Decisión / sanción', f: p.firmaDecision, fe: p.firmaDecisionFecha });
  const filaFirma = d => `<div class="di long"><dt>${esc(d.t)}</dt><dd>${firmaEstado(d.f, d.fe)}</dd></div>`;
  c.innerHTML = `
    <div class="detail-head">
      <div class="who"><h2>${esc(p.nombre || 'Sin nombre')}</h2>
        <p>CC ${esc(p.cc||'—')} · ${esc(p.area||'—')} · Ruta ${esc(p.ruta||'—')} · ${estadoBadge(p.estado)}
        ${reincid.length>1?`· <span class="badge rojo" style="background:#fed7d7;color:#822727">Reincidente (${reincid.length})</span>`:''}</p>
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline" onclick="irA('procesos')">← Volver</button>
        <button class="btn btn-warn" onclick="editarActual()">✏️ Editar todo</button>
        <button class="btn btn-primary" onclick="menuDocumentos()">📄 Generar documento</button>
        <button class="btn btn-success" onclick="menuNotificar()">📨 Notificar</button>
        <button class="btn btn-danger" onclick="eliminarActual()">🗑️</button>
      </div>
    </div>
    ${stepperHTML(p)}
    <div class="panel"><div class="panel-head"><h2>Empleado</h2></div><div class="panel-body"><div class="dl">
      ${di('Empresa',p.empresa)}${di('Fecha de ingreso',p.fechaIngreso)}${di('Interno',p.interno)}${di('Cargo',p.cargo)}
      ${di('Propietario',p.propietario)}${di('Correo',p.correoNotificacion)}${di('Celular',p.celular)}
    </div></div></div>
    <div class="panel"><div class="panel-head"><h2>La falta</h2></div><div class="panel-body"><div class="dl">
      ${di('Motivo',p.motivo,true)}${di('Falta',p.falta)}
      ${di('1ª vez',p.primeraVez)}${di('2ª vez',p.segundaVez)}${di('3ª vez',p.terceraVez)}${di('4ª vez',p.cuartaVez)}
      ${p.reglamento?di('Reglamento Interno de Trabajo',p.reglamento,true):''}
    </div></div></div>
    <div class="panel"><div class="panel-head"><h2>Citación y descargos</h2></div><div class="panel-body"><div class="dl">
      ${di('Fecha citación',p.fechaCitacion)}${di('Hora citación',p.horaCitacion)}${di('Asistencia',p.asistencia)}
      ${di('Fecha de la diligencia',p.fechaActaDescargos)}${di('Hora de inicio',p.horaActaDescargos)}${di('Hora de finalización',p.horaDiligenciamiento)}
      ${di('Responsable',p.responsable)}${di('Disciplinario',p.disciplinario)}${di('Asunto',p.asunto)}
      ${p.acta?di('Acta de descargos',p.acta,true):''}${p.textoActa?di('Texto del acta',p.textoActa,true):''}
    </div></div></div>
    <div class="panel"><div class="panel-head"><h2>Sanción / Decisión</h2></div><div class="panel-body">
      ${p.tipoDecision ? `<div style="background:#fff5f5;border-left:4px solid #e53e3e;border-radius:8px;padding:10px 14px;margin-bottom:14px">
          <span style="font-size:11px;color:#822727;font-weight:700;text-transform:uppercase;letter-spacing:.4px">Decisión tomada</span>
          <div style="font-size:18px;font-weight:800;color:#16293f">${esc(p.tipoDecision)}</div></div>` : ''}
      ${haySancion ? `<div class="dl">
        ${di('Días de suspensión',p.diasSuspension)}${di('Inicio de suspensión',p.fechaInicioSancion)}${di('Fin de suspensión',p.fechaFinSancion)}
        ${di('Fecha de reintegro',p.fechaReintegro)}
        ${di('Numerales infringidos',p.numeralesSancion,true)}
        ${di('Recurso de reposición ante',p.recursoAnte)}${di('Días para el recurso',p.recursoDias)}
        ${p.antecedentes?di('Antecedentes',p.antecedentes,true):''}
        ${p.resumenDescargos?di('Resumen de descargos',p.resumenDescargos,true):''}
        ${p.consideraciones?di('Consideraciones y conclusiones',p.consideraciones,true):''}
        ${p.compromisos?di('Compromisos de mejora',p.compromisos,true):''}
      </div>` : '<p class="muted">Aún no se ha registrado la decisión / sanción.</p>'}
    </div></div>

    <div class="panel"><div class="panel-head"><h2>🖊️ Documentos y firmas</h2>
      <button class="btn btn-outline btn-sm" onclick="menuDocumentos()">📄 Generar / reenviar</button></div>
      <div class="panel-body">
        ${docsFirma.length ? `<div class="dl">${docsFirma.map(filaFirma).join('')}</div>` : '<p class="muted">Aún no hay documentos en este proceso.</p>'}
        <p class="muted" style="font-size:12px;margin-top:10px">📂 Cada documento generado/firmado queda archivado en la carpeta del proceso en la nube (se conservan todas las versiones).</p>
      </div></div>
    ${reincid.length>1?`<div class="panel"><div class="panel-head"><h2>Historial de este empleado (${reincid.length})</h2></div>
      <div class="panel-body"><div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>
      ${reincid.sort((a,b)=>(parseFecha(b.fechaCitacion)||0)-(parseFecha(a.fechaCitacion)||0)).map(r=>`
        <tr onclick="verDetalle('${r.key}')"><td>${esc(r.fechaCitacion||'—')}</td><td>${esc((r.motivo||'—').slice(0,70))}</td><td>${estadoBadge(r.estado)}</td></tr>`).join('')}
      </tbody></table></div></div></div>`:''}
    <div class="panel"><div class="panel-head"><h2>📎 Pruebas: fotos y videos</h2>
      <button class="btn btn-outline btn-sm" onclick="editarActual()">➕ Agregar / gestionar</button></div>
      <div class="panel-body"><div id="pruebasDetalle" class="pruebas-grid"></div></div></div>`;
  pintarGridPruebas(p.key, 'pruebasDetalle');
}
function editarActual() { State.view = 'editar'; render(); }

async function eliminarActual() {
  if (!confirm(`¿Eliminar el proceso de ${State.current.nombre}? Esta acción no se puede deshacer.`)) return;
  const claveBorrada = State.current.key;
  await DB.del('procesos', claveBorrada);
  // Borrar también sus pruebas (archivos del bucket + registros en la nube)
  try {
    const prs = await obtenerPruebas(claveBorrada);
    const paths = prs.map(p => p.path).filter(Boolean);
    if (window.SB) {
      if (paths.length) await SB.storage.from(BUCKET_PRUEBAS).remove(paths);
      await SB.from('pd_pruebas').delete().eq('proc_key', claveBorrada);
    }
  } catch (e) { /* sin problema */ }
  State.procesos = State.procesos.filter(p => p.key !== claveBorrada);
  toast('Proceso eliminado', 'ok'); irA('procesos');
}

// Separa un artículo del catálogo en encabezado + numerales seleccionables
function parsearArticulo(a) {
  const raw = a.texto.split('\n').map(l => l.trim()).filter(l => l !== '');
  const header = [], items = [];
  let started = false;
  for (const l of raw) {
    const m = l.match(/^(\d+)\.\s+(.+)/);
    if (m) { started = true; items.push({ num: m[1], full: l }); }
    else if (started) { if (items.length) items[items.length - 1].full += ' ' + l; }
    else header.push(l);
  }
  if (!items.length) {
    // Artículo sin numerales (ej. CST 115): encabezado = títulos de norma, cuerpo = un solo item
    const head = [], cuerpo = [];
    header.forEach(l => {
      if (/^(REGLAMENTO|C[ÓO]DIGO|CAP[IÍ]TULO)/i.test(l)) head.push(l); else cuerpo.push(l);
    });
    return { id: a.id, titulo: a.titulo, header: head.length ? head : header.slice(0, 1), items: [{ num: '', full: (cuerpo.length ? cuerpo : header).join(' ') }] };
  }
  return { id: a.id, titulo: a.titulo, header, items };
}

/* ---------- 8b. Pruebas (fotos y videos) — en la nube (Storage) ---------- */
const BUCKET_PRUEBAS = 'pruebas-disciplinarias';
const nombreSeguro = n => String(n || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_');

// Sube un archivo al bucket privado; devuelve la ruta (path) o lanza error
async function subirPruebaNube(file, procKey, id) {
  if (!window.SB) throw new Error('Sin conexión a la nube');
  const path = `${procKey}/${id}_${nombreSeguro(file.name)}`;
  const { error } = await SB.storage.from(BUCKET_PRUEBAS).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}
// Enlace temporal (firmado) para ver un archivo privado
async function urlPrueba(path) {
  if (!window.SB || !path) return null;
  try {
    const { data, error } = await SB.storage.from(BUCKET_PRUEBAS).createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  } catch (e) { return null; }
}

// Lee las pruebas SOLO de la nube (pd_pruebas)
async function obtenerPruebas(procKey) {
  if (!window.SB) return [];
  try {
    const { data } = await SB.from('pd_pruebas').select('*').eq('proc_key', procKey);
    return (data || []).map(r => ({ id: r.id, procKey: r.proc_key, nombre: r.nombre, tipo: r.tipo, fecha: r.fecha, path: r.path }));
  } catch (e) { return []; }
}

async function pintarGridPruebas(procKey, contId) {
  const cont = document.getElementById(contId);
  if (!cont) return;
  const lista = await obtenerPruebas(procKey);
  if (!lista.length) { cont.innerHTML = '<span class="muted" style="font-size:13px">Aún no hay fotos ni videos.</span>'; return; }
  const items = await Promise.all(lista.map(async r => {
    const url = r.path ? await urlPrueba(r.path) : null;        // enlace firmado de la nube
    const media = !url
      ? `<div class="muted" style="font-size:12px;padding:8px">No se pudo cargar el archivo</div>`
      : (r.tipo || '').startsWith('video')
        ? `<video src="${url}" controls preload="metadata"></video>`
        : `<a href="${url}" target="_blank"><img src="${url}" alt="${esc(r.nombre)}"></a>`;
    return `<div class="prueba-item">${media}
      <div class="prueba-cap" title="${esc(r.nombre)}">${esc(r.nombre)}</div>
      <button type="button" class="btn btn-danger btn-sm" onclick="quitarPrueba('${r.id}','${esc(procKey)}','${contId}')">🗑️ Quitar</button>
    </div>`;
  }));
  cont.innerHTML = items.join('');
}

async function agregarPruebas(files, procKey, contId) {
  let ok = 0, fallo = 0, ultimoError = '';
  for (const f of files) {
    const id = nuevaKey();
    try {
      const path = await subirPruebaNube(f, procKey, id);                       // sube al bucket
      const { error } = await SB.from('pd_pruebas').upsert({ id, proc_key: procKey, nombre: f.name, tipo: f.type, fecha: hoyISO(), path });
      if (error) throw error;                                                    // registra en la tabla
      ok++;
    } catch (e) { fallo++; ultimoError = e.message || String(e); console.warn('No se pudo subir la prueba:', ultimoError); }
  }
  if (fallo) toast(`⚠️ ${fallo} no se subió(eron). Motivo: ${ultimoError || 'sin conexión'}`, 'err');
  if (ok) toast(`${ok} prueba(s) subida(s) a la nube`, 'ok');
  pintarGridPruebas(procKey, contId);
}

async function quitarPrueba(id, procKey, contId) {
  if (!confirm('¿Quitar esta prueba (foto/video)?')) return;
  if (!window.SB) { toast('Sin conexión a la nube', 'err'); return; }
  try {
    const { data } = await SB.from('pd_pruebas').select('path').eq('id', id).maybeSingle();
    const path = data && data.path;
    if (path) await SB.storage.from(BUCKET_PRUEBAS).remove([path]);
    await SB.from('pd_pruebas').delete().eq('id', id);
    toast('Prueba eliminada', 'ok');
  } catch (e) { toast('No se pudo eliminar: ' + (e.message || e), 'err'); }
  pintarGridPruebas(procKey, contId);
}

/* ---------- 9. Formulario crear/editar ---------- */
function renderForm(c, p) {
  const editando = !!p;
  const formKey = editando ? p.key : nuevaKey();   // clave estable para asociar las pruebas (fotos/videos)
  const v = k => editando ? (p[k] || '') : '';
  const campoHTML = ([k, lbl, tipo]) => {
    let val = v(k);
    if (tipo.startsWith('select:')) {
      const ops = tipo.slice(7).split('|');
      return `<div class="field"><label>${lbl}</label><select name="${k}">${ops.map(o => `<option value="${esc(o)}" ${o===val?'selected':''}>${o||'—'}</option>`).join('')}</select></div>`;
    }
    if (tipo === 'textarea') return `<div class="field full"><label>${lbl}</label><textarea name="${k}">${esc(val)}</textarea></div>`;
    if (tipo === 'date') val = aISO(val);
    return `<div class="field"><label>${lbl}</label><input type="${tipo}" name="${k}" value="${esc(val)}"></div>`;
  };
  const emps = window.EMPLEADOS || [];
  const opcionesEmp = lista => lista.map(e => `<option value="${esc(e.nombre)} — ${esc(e.cc)}">${esc(e.estado||'')} · ${esc(e.area||'')} · ${esc(e.cargo||'')}</option>`).join('');
  const activos = emps.filter(e => norm(e.estado) === 'activo');
  const selector = `
    <div class="panel"><div class="panel-head"><h2>👤 Seleccionar empleado (autocompleta los datos)</h2>
        <label class="flex" style="font-size:13px;font-weight:500;gap:6px;cursor:pointer">
          <input type="checkbox" id="soloActivos" checked> Solo activos</label></div>
      <div class="panel-body">
        <div class="field full"><label>Busca por nombre o cédula y selecciónalo de la lista</label>
          <input list="listaEmp" id="empBuscar" placeholder="Escribe nombre o cédula…" autocomplete="off">
          <datalist id="listaEmp">${opcionesEmp(activos)}</datalist>
        </div>
        <p class="muted" style="font-size:12px" id="empContador">${activos.length} empleados activos. También puedes llenar los campos manualmente más abajo.</p>
        <div id="empHistorial"></div>
      </div></div>`;
  // Paso 1 = citación: en "nuevo" solo se muestran las secciones necesarias para la citación
  const SECCIONES_PASO1 = ['Empleado', 'La falta', 'Citación a descargos'];
  const seccs = editando ? SECCIONES : SECCIONES.filter(s => SECCIONES_PASO1.includes(s.titulo));
  const panelPruebas = !editando ? `<div class="panel"><div class="panel-head"><h2>Pruebas</h2></div>
      <div class="panel-body"><div class="form-grid">
        <div class="field full"><label>Pruebas (descripción / enlaces que se ponen de presente)</label><textarea name="pruebas"></textarea></div>
      </div></div></div>` : '';
  const panelEvidencias = `<div class="panel"><div class="panel-head"><h2>📎 Pruebas: fotos y videos</h2></div>
      <div class="panel-body">
        <input type="file" id="inpPruebas" accept="image/*,video/*" multiple hidden>
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('inpPruebas').click()">📷 Agregar fotos o videos</button>
        <span class="muted" style="font-size:12px;margin-left:8px">Se guardan en este equipo y quedan asociadas al proceso (no se incluyen en el respaldo JSON).</span>
        <div id="pruebasPrev" class="pruebas-grid mt"></div>
      </div></div>`;
  const aviso = !editando ? `<div class="panel" style="border-left:4px solid #2c5282">
      <div class="panel-body" style="padding:14px 18px"><strong>Paso 1 · Citación a descargos.</strong>
      <span class="muted">Completa los datos y al guardar se generará la citación. Las etapas de descargos y sanción se registran después editando el proceso.</span>
      <div style="margin-top:6px;font-size:12px;color:#c53030">Los campos marcados con <span class="req-mark">*</span> son obligatorios.</div></div></div>` : '';
  // Asistente del Reglamento: faltas (Art. 108) y artículos para insertar
  const faltas = window.CATALOGO_FALTAS || [];
  const arts = window.CATALOGO_ARTICULOS || [];
  const artsParsed = arts.map(parsearArticulo);
  const asistente = `
    <div class="panel"><div class="panel-head"><h2>⚖️ Asistente del Reglamento Interno</h2></div>
      <div class="panel-body">
        <div class="field full"><label>Faltas del Reglamento (Art. 108) — marca uno o varios numerales</label>
          <input type="search" id="faltaFiltro" placeholder="Filtrar por número o texto (ej. 5, abandono, velocidad…)" autocomplete="off">
          <div id="faltaLista" class="falta-lista">
            ${faltas.map(x => `<label class="falta-item"><input type="checkbox" class="faltaChk" value="${x.n}"><span><b>N° ${x.n}</b> · ${esc(x.d)}</span></label>`).join('')}
          </div>
        </div>
        <div id="faltaResumen" class="muted" style="font-size:12px"></div>
        <hr style="border:none;border-top:1px solid var(--borde);margin:14px 0">
        <label style="font-size:12px;font-weight:600;color:var(--texto2)">Artículos para insertar en la citación — marca los numerales que apliquen</label>
        <input type="search" id="artFiltro" placeholder="Filtrar por número o texto (ej. velocidad, dinero, embriaguez…)" autocomplete="off" style="margin-top:6px">
        <div id="artLista" class="falta-lista" style="max-height:280px">
          ${artsParsed.map(a => `<div class="art-grupo">
            <div class="art-grupo-tit"><label class="art-all"><input type="checkbox" class="artAll" data-art="${a.id}"> ${esc(a.titulo)}</label></div>
            ${a.items.map((it, ix) => `<label class="falta-item"><input type="checkbox" class="artNumChk" data-art="${a.id}" data-ix="${ix}"><span>${it.num ? `<b>${it.num}.</b> ` : ''}${esc(it.full.replace(/^\d+\.\s*/, ''))}</span></label>`).join('')}
          </div>`).join('')}
        </div>
        <span class="muted" style="font-size:12px">✅ Al marcar un numeral se agrega solo al campo «Artículos infringidos»; al desmarcarlo se quita. La casilla del título marca todo el artículo.</span>
        ${editando ? `<hr style="border:none;border-top:1px solid var(--borde);margin:14px 0">
        <label style="font-size:12px;font-weight:600;color:var(--texto2)">Diligencia de descargos (paso 3)</label>
        <div class="flex mt" style="flex-wrap:wrap"><button type="button" class="btn btn-outline btn-sm" id="btnPlantillaPreg">📋 Insertar plantilla de preguntas</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnPreguntasIA">✨ Sugerir preguntas con IA</button>
          <span class="muted" style="font-size:12px">La plantilla usa preguntas estándar; la IA las genera a la medida del caso.</span></div>` : ''}
      </div></div>`;
  c.innerHTML = `
    <form id="formProceso">
    ${aviso}
    ${selector}
    ${asistente}
    ${seccs.map(s => `<div class="panel"><div class="panel-head"><h2>${s.titulo}</h2></div>
      <div class="panel-body"><div class="form-grid">${s.campos.map(campoHTML).join('')}</div></div></div>`).join('')}
    ${panelPruebas}
    ${panelEvidencias}
    <div class="form-actions">
      <button type="button" class="btn btn-outline" onclick="${editando?`verDetalle('${p.key}')`:`irA('procesos')`}">Cancelar</button>
      <button type="submit" class="btn btn-success">${editando ? '💾 Guardar cambios' : '📄 Crear y generar citación'}</button>
    </div></form>`;

  // Alternar lista activos / todos
  $('#soloActivos').addEventListener('change', e => {
    const lista = e.target.checked ? activos : emps;
    $('#listaEmp').innerHTML = opcionesEmp(lista);
    $('#empContador').textContent = `${lista.length} ${e.target.checked ? 'empleados activos' : 'empleados en total'}. También puedes llenar los campos manualmente más abajo.`;
  });

  // Autocompletar al elegir empleado
  const setVal = (name, val) => { const el = document.querySelector(`#formProceso [name="${name}"]`); if (el && val != null) el.value = val; };
  $('#empBuscar').addEventListener('change', e => {
    const txt = e.target.value;
    const m = txt.match(/—\s*(\d+)\s*$/);
    const cc = m ? m[1] : null;
    const emp = emps.find(x => (cc && x.cc === cc) || (`${x.nombre} — ${x.cc}` === txt));
    if (!emp) return;
    setVal('nombre', emp.nombre); setVal('cc', emp.cc); setVal('empresa', emp.empresa);
    setVal('fechaIngreso', aISO(emp.fechaIngreso)); setVal('interno', emp.interno);
    setVal('area', emp.area); setVal('cargo', emp.cargo); setVal('ruta', emp.ruta);
    setVal('propietario', emp.propietario); setVal('correoNotificacion', emp.correo); setVal('celular', emp.celular);
    aplicarFaltas();                           // recalcular reincidencia con el empleado ya cargado
    mostrarHistorialEmpleado(emp.cc);          // mostrar cuántos procesos tiene y por qué
    toast(`Datos de ${emp.nombre} cargados`, 'ok');
    if (!avisarContacto(emp.celular, emp.correo)) {} // advierte si falta celular/correo (notificaciones)
  });

  // Asistente: filtrar la lista de faltas por número o texto
  $('#faltaFiltro').addEventListener('input', e => {
    const q = norm(e.target.value);
    document.querySelectorAll('#faltaLista .falta-item').forEach(it => {
      it.style.display = (!q || norm(it.textContent).includes(q)) ? '' : 'none';
    });
  });
  // Al marcar/desmarcar faltas: actualiza el campo «falta», las sanciones y la reincidencia
  $('#faltaLista').addEventListener('change', e => {
    if (e.target.classList.contains('faltaChk')) aplicarFaltas();
  });

  function faltasSeleccionadas() {
    return [...document.querySelectorAll('.faltaChk:checked')]
      .map(c => faltas.find(f => f.n === +c.value)).filter(Boolean);
  }

  function aplicarFaltas() {
    const sel = faltasSeleccionadas();
    setVal('falta', sel.map(f => `Art. 108 #${f.n}: ${f.d}`).join('  |  '));
    const primera = sel[0];
    setVal('primeraVez', primera ? (primera.s[0] || '') : '');
    setVal('segundaVez', primera ? (primera.s[1] || '') : '');
    setVal('terceraVez', primera ? (primera.s[2] || '') : '');
    setVal('cuartaVez',  primera ? (primera.s[3] || '') : '');
    sugerirSancion(sel);
  }

  // Calcula la reincidencia por CADA falta marcada y sugiere la sanción del nivel correspondiente
  function sugerirSancion(sel) {
    const cont = $('#faltaResumen'); if (!cont) return;
    if (!sel.length) { cont.innerHTML = ''; return; }
    const niveles = ['1ª vez', '2ª vez', '3ª vez', '4ª vez'];
    const cc = (document.querySelector('#formProceso [name="cc"]')?.value || '').trim();
    const keyActual = editando ? p.key : null;
    cont.innerHTML = sel.map(fa => {
      const escala = fa.s.map((v, i) => v ? `<strong>${niveles[i]}:</strong> ${esc(v)}` : null).filter(Boolean).join(' · ');
      const previos = cc ? State.procesos.filter(x => x.cc === cc && x.key !== keyActual && faltaNumDe(x.falta) === fa.n) : [];
      const idx = Math.min(previos.length, fa.s.length - 1);
      let sugerida = fa.s[idx], nivelTxt = niveles[idx];
      if (!sugerida) { for (let i = fa.s.length - 1; i >= 0; i--) { if (fa.s[i]) { sugerida = fa.s[i]; nivelTxt = niveles[i]; break; } } }
      let html = `<div style="margin-top:8px"><strong>N° ${fa.n} · ${esc(fa.d)}</strong><br><span class="muted">Escala: ${escala}</span>`;
      if (cc) {
        html += `<div style="margin-top:4px;padding:8px 11px;border-radius:8px;background:#e9f5ee;border:1px solid #bfe3cd">
          🔎 <strong>${previos.length}</strong> proceso(s) previo(s) por esta falta → corresponde la <strong>${nivelTxt}</strong>: <strong>${esc(sugerida || '—')}</strong></div>`;
      }
      return html + `</div>`;
    }).join('') + (cc ? '' : `<div class="muted" style="margin-top:6px">Selecciona el empleado para calcular la reincidencia y sugerir la sanción.</div>`);
  }

  // Asistente: filtrar la lista de artículos por número o texto
  $('#artFiltro').addEventListener('input', e => {
    const q = norm(e.target.value);
    document.querySelectorAll('#artLista .art-grupo').forEach(g => {
      let algunoVisible = false;
      g.querySelectorAll('.falta-item').forEach(it => {
        const ok = !q || norm(it.textContent).includes(q);
        it.style.display = ok ? '' : 'none';
        if (ok) algunoVisible = true;
      });
      g.style.display = algunoVisible ? '' : 'none';
    });
  });

  // Reconstruye el campo «Artículos infringidos» con los numerales marcados (en tiempo real)
  function actualizarReglamento() {
    const checked = [...document.querySelectorAll('.artNumChk:checked')];
    const porArt = {};
    checked.forEach(c => { (porArt[c.dataset.art] = porArt[c.dataset.art] || []).push(+c.dataset.ix); });
    // mantener el orden del catálogo
    const bloques = artsParsed.filter(a => porArt[a.id]).map(a => {
      const sel = porArt[a.id].sort((x, y) => x - y).map(ix => a.items[ix].full);
      return a.header.join('\n') + '\n' + sel.join('\n');
    });
    const ta = document.querySelector('#formProceso [name="reglamento"]');
    if (ta) ta.value = bloques.join('\n\n');
  }

  // Al marcar/desmarcar: la casilla del título marca todo el artículo, y se actualiza el campo al instante
  $('#artLista').addEventListener('change', e => {
    if (e.target.classList.contains('artAll')) {
      const id = e.target.dataset.art, on = e.target.checked;
      document.querySelectorAll(`.artNumChk[data-art="${id}"]`).forEach(c => c.checked = on);
    }
    actualizarReglamento();
  });

  // Pruebas: subir fotos/videos y mostrar la galería
  $('#inpPruebas').addEventListener('change', e => {
    if (e.target.files.length) agregarPruebas(e.target.files, formKey, 'pruebasPrev');
    e.target.value = '';
  });
  pintarGridPruebas(formKey, 'pruebasPrev');

  // Asistente: plantilla de preguntas de descargos (solo en edición)
  const btnPlant = $('#btnPlantillaPreg');
  if (btnPlant) btnPlant.addEventListener('click', () => {
    const ta = document.querySelector('#formProceso [name="acta"]');
    if (!ta) return;
    if (ta.value.trim() && !confirm('El campo «Acta» ya tiene contenido. ¿Reemplazarlo por la plantilla?')) return;
    ta.value = PLANTILLA_DESCARGOS;
    toast('Plantilla de preguntas insertada', 'ok');
  });
  const btnIA = $('#btnPreguntasIA');
  if (btnIA) btnIA.addEventListener('click', () => sugerirPreguntasIA(btnIA));

  // Historial del empleado: cuántos procesos/descargos tiene y por qué
  function mostrarHistorialEmpleado(cc) {
    const cont = $('#empHistorial');
    if (!cont) return;
    cc = (cc || '').trim();
    if (!cc) { cont.innerHTML = ''; return; }
    const keyActual = editando ? p.key : null;
    const previos = State.procesos
      .filter(x => x.cc === cc && x.key !== keyActual)
      .sort((a, b) => (parseFecha(b.fechaCitacion) || 0) - (parseFecha(a.fechaCitacion) || 0));

    if (!previos.length) {
      cont.innerHTML = `<div class="hist-box ok">✅ Esta persona <strong>no tiene procesos previos</strong> en el sistema. Sería su primer proceso disciplinario.</div>`;
      return;
    }

    // Agrupar por motivo de la falta (usa la falta del Art. 108 si existe, si no el motivo)
    const motivoDe = x => {
      const fn = faltaNumDe(x.falta);
      if (fn) { const fa = (window.CATALOGO_FALTAS || []).find(f => f.n === fn); return fa ? `N° ${fn} · ${fa.d}` : (x.falta || 'Sin clasificar'); }
      return (x.motivo || x.falta || 'Sin clasificar').trim() || 'Sin clasificar';
    };
    const grupos = agrupar(previos, motivoDe);
    const conSancion = previos.filter(x => norm(x.estado).includes('sancion')).length;

    const filas = previos.slice(0, 8).map(x => `
      <tr onclick="verDetalle('${x.key}')">
        <td>${esc(x.fechaCitacion || '—')}</td>
        <td title="${esc(x.motivo || '')}">${esc(motivoDe(x).slice(0, 60))}</td>
        <td>${estadoBadge(x.estado)}</td>
      </tr>`).join('');
    const masTxt = previos.length > 8 ? `<p class="muted" style="font-size:12px;margin-top:6px">…y ${previos.length - 8} más. Abre la ficha del empleado para ver todos.</p>` : '';

    cont.innerHTML = `
      <div class="hist-box warn">
        <div class="hist-top">📋 Esta persona tiene <strong>${previos.length}</strong> proceso(s) en su historial${conSancion ? ` · <strong>${conSancion}</strong> con sanción` : ''}.</div>
        <div class="hist-chips">${grupos.map(([m, n]) => `<span class="hist-chip">${esc(m)} <b>×${n}</b></span>`).join('')}</div>
        <div class="tbl-wrap" style="margin-top:10px"><table>
          <thead><tr><th>Fecha</th><th>Motivo / falta</th><th>Estado</th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>
        ${masTxt}
      </div>`;
  }
  if (editando && p.cc) mostrarHistorialEmpleado(p.cc);

  $('#formProceso').addEventListener('submit', async e => {
    e.preventDefault();
    // Campos obligatorios: al crear se exigen los de la citación; al editar solo nombre y cédula
    const reqProc = editando
      ? [['nombre', 'Nombre'], ['cc', 'Cédula']]
      : [['nombre', 'Nombre'], ['cc', 'Cédula'], ['motivo', 'Reporte de los hechos'], ['fechaCitacion', 'Fecha de citación'], ['horaCitacion', 'Hora de citación']];
    if (!validarObligatorios('#formProceso', reqProc).ok) return;
    const fd = new FormData(e.target);
    // Al editar, combinar sobre la versión más reciente de la base (no perder firmas hechas en la tablet)
    let base = editando ? { ...p } : { key: formKey };
    if (editando) { try { const fresco = await DB.get('procesos', p.key); if (fresco) base = fresco; } catch (e2) { /* sin problema */ } }
    const reg = { ...base };
    TODOS_CAMPOS.forEach(k => { const val = fd.get(k); if (val !== null) reg[k] = val.toString().trim(); else if (!editando) reg[k] = ''; });
    if (!reg.responsable) reg.responsable = State.config.responsable;
    if (!reg.empresa) reg.empresa = State.config.empresa;
    if (!editando) reg.estado = 'CITACION A DESCARGOS';
    // Datos de contacto: imprescindibles para las notificaciones del proceso
    const fc = faltaContacto(reg.celular, reg.correoNotificacion);
    if (fc.ninguno) {
      if (!confirm('⚠️ ATENCIÓN\n\nEste trabajador NO tiene celular NI correo registrado.\n\nSin estos datos NO podrá recibir las notificaciones del proceso disciplinario (citación, descargos, sanción).\n\n¿Deseas continuar de todas formas?')) return;
    } else if (fc.cel || fc.correo) {
      toast('⚠️ Falta ' + (fc.cel ? 'el celular' : 'el correo') + ' para las notificaciones', 'err');
    }
    // ¿Cambió la fecha u hora de la citación al editar? → hay que reenviar la citación
    const cambioCitacion = editando &&
      String(reg.fechaCitacion || '').trim() &&
      ((base.fechaCitacion || '') !== (reg.fechaCitacion || '') || (base.horaCitacion || '') !== (reg.horaCitacion || ''));
    const idx = State.procesos.findIndex(x => x.key === reg.key);
    if (idx >= 0) State.procesos[idx] = reg; else State.procesos.push(reg);
    State.current = reg;
    await DB.put('procesos', reg);
    State.view = 'detalle'; render();
    if (!editando) {
      // Generar la citación de inmediato (el PDF se enviará al webhook desde imprimirDoc)
      generarDoc('citacion');
      toast('Proceso creado · citación generada', 'ok');
    } else if (cambioCitacion) {
      if (confirm('Cambiaste la fecha u hora de la citación.\n\n¿Reenviar la citación actualizada al trabajador y a los líderes?')) {
        generarDoc('citacion');   // reenvía al trabajador y, por ser citación, también a los líderes
        toast('Citación actualizada y reenviada', 'ok');
      } else {
        toast('Cambios guardados (sin reenviar)', 'ok');
      }
    } else {
      toast('Cambios guardados', 'ok');
    }
  });

  // Guía: marcar con * los campos obligatorios
  marcarObligatorios('#formProceso', editando
    ? ['nombre', 'cc']
    : ['nombre', 'cc', 'motivo', 'fechaCitacion', 'horaCitacion']);
}

/* ---------- 9a-bis. Datos de contacto para notificaciones ---------- */
// Comprueba si faltan celular o correo (imprescindibles para notificar al trabajador)
function faltaContacto(cel, correo) {
  const c = String(cel || '').replace(/\D/g, '');
  const m = String(correo || '').trim();
  return { cel: !c, correo: !m, ninguno: !c && !m };
}
// Muestra una advertencia (toast) si falta algún dato de contacto. Devuelve true si está completo.
function avisarContacto(cel, correo) {
  const f = faltaContacto(cel, correo);
  if (f.ninguno) { toast('⚠️ Sin celular NI correo: el trabajador no podrá recibir las notificaciones', 'err'); return false; }
  if (f.cel) { toast('⚠️ Falta el celular: no se podrá notificar por WhatsApp', 'err'); return false; }
  if (f.correo) { toast('⚠️ Falta el correo: no se podrá notificar por email', 'err'); return false; }
  return true;
}

/* ---------- 9b. Historial por cédula ---------- */
// Clasifica el motivo de un proceso: usa la falta del Art. 108 si existe, si no el motivo escrito
function clasificarFalta(x) {
  const fn = faltaNumDe(x.falta);
  if (fn) { const fa = (window.CATALOGO_FALTAS || []).find(f => f.n === fn); return fa ? `N° ${fn} · ${fa.d}` : (x.falta || 'Sin clasificar'); }
  return (x.motivo || x.falta || 'Sin clasificar').trim() || 'Sin clasificar';
}

function consultarHistorial() {
  const val = ($('#histBuscar')?.value || '').trim();
  const m = val.match(/(\d{4,})\s*$/);
  State.histCC = m ? m[1] : val;
  renderHistorial($('#content'));
}

function renderHistorial(c) {
  const P = State.procesos;
  const empByCC = cc => (window.EMPLEADOS || []).find(e => e.cc === cc);
  const nombreDe = cc => empByCC(cc)?.nombre || P.find(p => p.cc === cc)?.nombre || cc;

  // Trabajadores que tienen procesos, ordenados por cantidad
  const conteo = agrupar(P.filter(p => p.cc), p => p.cc);
  const datalist = conteo.map(([cc, n]) =>
    `<option value="${esc(nombreDe(cc))} — ${esc(cc)}">${n} proceso(s)</option>`).join('');

  const cc = (State.histCC || '').trim();
  const valInput = cc ? `${nombreDe(cc)} — ${cc}` : '';

  let resultado = '';
  if (cc) {
    const procs = P.filter(p => p.cc === cc)
      .sort((a, b) => (parseFecha(b.fechaCitacion) || 0) - (parseFecha(a.fechaCitacion) || 0));

    if (!procs.length) {
      resultado = `<div class="panel"><div class="panel-body empty"><div class="big">🔍</div>
        No se encontraron procesos para la cédula <strong>${esc(cc)}</strong>.</div></div>`;
    } else {
      const emp = empByCC(cc) || {};
      const ref = procs[0];
      const nombre = emp.nombre || ref.nombre || '—';
      const conSancion = procs.filter(x => norm(x.estado).includes('sancion')).length;
      const finalizados = procs.filter(x => norm(x.estado).includes('finaliz')).length;
      const abiertos = procs.length - finalizados;
      const totalDias = procs.filter(x => x.diasSuspension && !isNaN(+x.diasSuspension)).reduce((s, x) => s + (+x.diasSuspension), 0);
      const grupos = agrupar(procs, clasificarFalta);

      const filas = procs.map(x => `
        <tr onclick="verDetalle('${x.key}')">
          <td>${esc(x.fechaCitacion || '—')}</td>
          <td title="${esc(x.motivo || '')}">${esc(clasificarFalta(x))}</td>
          <td class="text-c">${esc(x.asistencia || '—')}</td>
          <td class="text-c">${x.diasSuspension ? esc(x.diasSuspension) : '—'}</td>
          <td>${estadoBadge(x.estado)}</td>
        </tr>`).join('');

      resultado = `
        <div class="hist-cabecera">
          <div class="hc-avatar">${esc((nombre[0] || '?').toUpperCase())}</div>
          <div class="hc-info">
            <h2>${esc(nombre)}</h2>
            <p>CC ${esc(cc)} · ${esc(emp.cargo || ref.cargo || '—')} · ${esc(emp.area || ref.area || '—')}
              ${emp.estado ? `· <span class="badge ${norm(emp.estado)==='activo'?'finalizado':'vacio'}">${esc(emp.estado)}</span>` : ''}</p>
            <p class="muted">${esc(emp.empresa || ref.empresa || '')} ${emp.celular ? '· 📱 '+esc(emp.celular) : ''} ${emp.correo ? '· ✉️ '+esc(emp.correo) : ''}</p>
          </div>
          <button class="btn btn-primary" onclick="nuevoParaCC('${esc(cc)}')">➕ Nuevo proceso</button>
        </div>

        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-ico">📋</div><div><div class="num">${procs.length}</div><div class="lbl">Procesos totales</div></div></div>
          <div class="kpi amar"><div class="kpi-ico">📂</div><div><div class="num">${abiertos}</div><div class="lbl">Abiertos</div></div></div>
          <div class="kpi rojo"><div class="kpi-ico">⚖️</div><div><div class="num">${conSancion}</div><div class="lbl">Con sanción</div></div></div>
          <div class="kpi verde"><div class="kpi-ico">📅</div><div><div class="num">${totalDias}</div><div class="lbl">Días suspensión (total)</div></div></div>
        </div>

        <div class="panel"><div class="panel-head"><h2>¿Por qué? Motivos / faltas</h2></div>
          <div class="panel-body"><div class="hist-chips">
            ${grupos.map(([m, n]) => `<span class="hist-chip" title="${esc(m)}">${esc(m)} <b>×${n}</b></span>`).join('')}
          </div></div></div>

        <div class="panel"><div class="panel-head"><h2>Detalle de los ${procs.length} proceso(s)</h2></div>
          <div class="panel-body"><div class="tbl-wrap"><table>
            <thead><tr><th>Fecha citación</th><th>Motivo / falta</th><th>Asistió</th><th>Días susp.</th><th>Estado</th></tr></thead>
            <tbody>${filas}</tbody>
          </table></div></div></div>`;
    }
  } else {
    resultado = `<div class="panel"><div class="panel-body empty"><div class="big">🔎</div>
      Escribe una cédula o nombre arriba y pulsa <strong>Consultar</strong> para ver el historial de descargos del trabajador.</div></div>`;
  }

  c.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>🔎 Consultar historial por cédula</h2>
      <span class="muted">${conteo.length} trabajador(es) con procesos</span></div>
      <div class="panel-body">
        <div class="flex" style="gap:10px;flex-wrap:wrap">
          <input list="listaHist" id="histBuscar" placeholder="Escribe la cédula o el nombre…" autocomplete="off"
            value="${esc(valInput)}" style="flex:1;min-width:260px;padding:11px 14px;border:1px solid var(--borde);border-radius:8px;font-size:14px">
          <datalist id="listaHist">${datalist}</datalist>
          <button class="btn btn-primary" id="btnHistBuscar">🔎 Consultar</button>
          ${cc ? `<button class="btn btn-outline" id="btnHistLimpiar">✕ Limpiar</button>` : ''}
        </div>
      </div></div>
    ${resultado}`;

  $('#histBuscar').addEventListener('change', consultarHistorial);
  $('#btnHistBuscar').addEventListener('click', consultarHistorial);
  const lim = $('#btnHistLimpiar');
  if (lim) lim.addEventListener('click', () => { State.histCC = ''; renderHistorial(c); });
  if (!cc) $('#histBuscar').focus();
}

// Abre "Nuevo proceso" con el empleado ya cargado por cédula
function nuevoParaCC(cc) {
  State.view = 'nuevo';
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === 'nuevo'));
  render();
  const emp = (window.EMPLEADOS || []).find(e => e.cc === cc);
  if (emp) {
    const inp = $('#empBuscar');
    if (inp) { inp.value = `${emp.nombre} — ${emp.cc}`; inp.dispatchEvent(new Event('change')); }
  }
}

/* ---------- 9b. Perfil sociodemográfico ---------- */
function consultarPerfil() {
  const val = ($('#perfBuscar')?.value || '').trim();
  const m = val.match(/(\d{4,})\s*$/);
  State.perfilCC = m ? m[1] : val;
  renderPerfil($('#content'));
}
function renderPerfil(c) {
  const emps = window.EMPLEADOS || [];
  const datalist = emps.map(e => `<option value="${esc(e.nombre)} — ${esc(e.cc)}">${esc(e.estado||'')} · ${esc(e.area||'')}</option>`).join('');
  const cc = (State.perfilCC || '').trim();
  const emp = cc ? emps.find(e => e.cc === cc) : null;
  const valInput = emp ? `${emp.nombre} — ${emp.cc}` : '';

  // Cuántos procesos disciplinarios tiene (para enlazar con el historial)
  const nProc = cc ? State.procesos.filter(p => p.cc === cc).length : 0;

  let resultado = '';
  if (cc && !emp) {
    resultado = `<div class="panel"><div class="panel-body empty"><div class="big">🔍</div>
      No se encontró ningún empleado con la cédula <strong>${esc(cc)}</strong>.</div></div>`;
  } else if (emp) {
    const dato = (lbl, val) => `<div class="di"><dt>${lbl}</dt><dd>${val && String(val).trim() ? esc(val) : '<span class="muted">—</span>'}</dd></div>`;
    const bloque = (titulo, ico, campos) => `
      <div class="panel"><div class="panel-head"><h2>${ico} ${titulo}</h2></div>
        <div class="panel-body"><div class="di-grid">${campos.join('')}</div></div></div>`;
    const estadoCls = norm(emp.estado) === 'activo' ? 'finalizado' : 'vacio';

    resultado = `
      <div class="hist-cabecera">
        <div class="hc-avatar">${esc((emp.nombre[0] || '?').toUpperCase())}</div>
        <div class="hc-info">
          <h2>${esc(emp.nombre)}</h2>
          <p>${esc(emp.tipoId || 'CC')} ${esc(emp.cc)} · ${esc(emp.cargo || '—')}
            · <span class="badge ${estadoCls}">${esc(emp.estado || '—')}</span></p>
          <p class="muted">📱 ${esc(emp.celular || '—')} · ✉️ ${esc(emp.correo || '—')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="State.histCC='${esc(cc)}';irA('historial')">📋 Ver historial (${nProc})</button>
          <button class="btn btn-primary" onclick="nuevoParaCC('${esc(cc)}')">➕ Nuevo proceso</button>
        </div>
      </div>

      ${bloque('Contacto (para notificaciones)', '📨', [
        dato('Correo electrónico', emp.correo),
        dato('Número celular', emp.celular),
        dato('Ciudad', emp.ciudad),
        dato('Dirección', emp.direccion),
        dato('Barrio', emp.barrio),
        dato('Medio de desplazamiento', emp.medioDesplazamiento),
      ])}

      ${bloque('Datos personales', '🧑', [
        dato('Tipo de identificación', emp.tipoId),
        dato('Fecha de nacimiento', emp.fechaNacimiento),
        dato('Edad', emp.edad),
        dato('Sexo', emp.sexo),
        dato('Estado civil', emp.estadoCivil),
        dato('Tipo de sangre', emp.tipoSangre),
        dato('Grado de escolaridad', emp.escolaridad),
        dato('Composición familiar', emp.composicionFamiliar),
        dato('Estrato socioeconómico', emp.estrato),
      ])}

      ${bloque('Seguridad social', '🏥', [
        dato('EPS', emp.eps),
        dato('Fondo de pensiones (AFP)', emp.afp),
      ])}

      ${bloque('Datos laborales', '💼', [
        dato('Empresa', emp.empresa),
        dato('Área', emp.area),
        dato('Cargo', emp.cargo),
        dato('Centro de trabajo', emp.centroTrabajo),
        dato('Turno', emp.turno),
        dato('Tipo de vinculación', emp.tipoVinculacion),
        dato('Fecha de ingreso', emp.fechaIngreso),
        dato('Fecha de retiro', emp.fechaRetiro),
        dato('Interno', emp.interno),
        dato('Ruta', emp.ruta),
        dato('Propietario / afiliado', emp.propietario),
        dato('Vehículo asociado', emp.vehiculoAsociado),
      ])}

      ${bloque('Conducción', '🚍', [
        dato('¿Conduce en sus funciones?', emp.conduce),
        dato('Tipo de vehículo', emp.tipoVehiculo),
        dato('Años de experiencia conduciendo', emp.aniosConduccion),
      ])}`;
  } else {
    resultado = `<div class="panel"><div class="panel-body empty"><div class="big">👤</div>
      Escribe una cédula o nombre arriba y pulsa <strong>Consultar</strong> para ver el perfil sociodemográfico del trabajador.</div></div>`;
  }

  c.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>👤 Perfil sociodemográfico</h2>
      <span class="muted">${emps.length} empleados en la base</span></div>
      <div class="panel-body">
        <div class="flex" style="gap:10px;flex-wrap:wrap">
          <input list="listaPerf" id="perfBuscar" placeholder="Escribe la cédula o el nombre…" autocomplete="off"
            value="${esc(valInput)}" style="flex:1;min-width:260px;padding:11px 14px;border:1px solid var(--borde);border-radius:8px;font-size:14px">
          <datalist id="listaPerf">${datalist}</datalist>
          <button class="btn btn-primary" id="btnPerfBuscar">🔎 Consultar</button>
          ${emp ? `<button class="btn btn-outline" id="btnPerfLimpiar">✕ Limpiar</button>` : ''}
        </div>
      </div></div>
    ${resultado}`;

  $('#perfBuscar').addEventListener('change', consultarPerfil);
  $('#btnPerfBuscar').addEventListener('click', consultarPerfil);
  const lim = $('#btnPerfLimpiar');
  if (lim) lim.addEventListener('click', () => { State.perfilCC = ''; renderPerfil(c); });
  if (!cc) $('#perfBuscar').focus();
}

/* ---------- 10. Reportes ---------- */
function renderReportes(c) {
  const P = State.procesos;
  const porMes = new Map();
  P.forEach(p => { const d = parseFecha(p.fechaCitacion); if (d) { const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; porMes.set(k, (porMes.get(k)||0)+1); } });
  const meses = [...porMes.entries()].sort((a,b)=>a[0]<b[0]?-1:1).slice(-12);
  const porCC = agrupar(P.filter(x=>x.cc), x=>x.cc);
  const reincidentes = porCC.filter(([,n])=>n>1);
  const susp = P.filter(p => p.diasSuspension && !isNaN(+p.diasSuspension)).reduce((s,p)=>s+(+p.diasSuspension),0);

  c.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi"><div class="num">${P.length}</div><div class="lbl">Procesos</div></div>
      <div class="kpi rojo"><div class="num">${reincidentes.length}</div><div class="lbl">Empleados reincidentes</div></div>
      <div class="kpi amar"><div class="num">${susp}</div><div class="lbl">Días de suspensión (total)</div></div>
      <div class="kpi gris"><div class="num">${agrupar(P,x=>x.ruta).length}</div><div class="lbl">Rutas involucradas</div></div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Procesos por mes (últimos 12)</h2></div>
      <div class="panel-body">${meses.length?barras(meses, P.length):'<p class="muted">Sin datos de fecha.</p>'}</div></div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h2>Faltas más frecuentes</h2></div>
        <div class="panel-body">${barras(agrupar(P.filter(x=>x.falta), x=>x.falta).slice(0,8), P.length, 'amar')||'<p class="muted">Sin datos.</p>'}</div></div>
      <div class="panel"><div class="panel-head"><h2>Asistencia a descargos</h2></div>
        <div class="panel-body">${barras(agrupar(P, x=>x.asistencia||'(sin registrar)'), P.length, 'verde')}</div></div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Empleados reincidentes</h2>
      <button class="btn btn-outline btn-sm" onclick="exportarCSV()">⬇️ Exportar CSV</button></div>
      <div class="panel-body"><div class="tbl-wrap"><table><thead><tr><th>Empleado</th><th>Cédula</th><th>N° procesos</th></tr></thead><tbody>
      ${reincidentes.slice(0,30).map(([cc,n])=>{const r=P.find(p=>p.cc===cc);return `<tr onclick="verDetalle('${r.key}')"><td>${esc(r?.nombre||'—')}</td><td>${esc(cc)}</td><td><strong>${n}</strong></td></tr>`;}).join('')||'<tr><td colspan="3" class="muted text-c">No hay reincidentes.</td></tr>'}
      </tbody></table></div></div></div>`;
}

/* ---------- 11. Configuración ---------- */
// Líderes a notificar por defecto (se pueden editar desde Configuración y se guardan en la nube)
const DEFAULT_LIDERES = {
  reglas: [
    { etiqueta: 'Operaciones (conductores y gestores)', frases: 'conductor, gestor', correo: 'direccionoperaciones@combuses.com.co' },
    { etiqueta: 'Control de flota', frases: 'flota', correo: 'coordcontrol@combuses.com.co' },
    { etiqueta: 'Contabilidad', frases: 'contab, contad', correo: 'contador@combuses.com.co' }
  ],
  adminCorreo: 'administrativo@combuses.com.co',
  adminExcluye: 'conductor, gestor, flota'
};
function lidModel() {
  if (!State.config.lideres) State.config.lideres = JSON.parse(JSON.stringify(DEFAULT_LIDERES));
  if (!Array.isArray(State.config.lideres.reglas)) State.config.lideres.reglas = [];
  return State.config.lideres;
}
function htmlLideres() {
  const L = lidModel();
  const filas = L.reglas.map((r, i) => `
    <div class="lid-fila" style="display:grid;grid-template-columns:1.2fr 1fr 1.5fr auto;gap:8px;align-items:end;margin-bottom:8px">
      <div class="field"><label>Nombre del grupo</label><input value="${esc(r.etiqueta || '')}" onchange="lidSet(${i},'etiqueta',this.value)"></div>
      <div class="field"><label>Si el cargo contiene…</label><input value="${esc(r.frases || '')}" placeholder="conductor, gestor" onchange="lidSet(${i},'frases',this.value)"></div>
      <div class="field"><label>Correo del líder</label><input type="email" value="${esc(r.correo || '')}" onchange="lidSet(${i},'correo',this.value)"></div>
      <button type="button" class="btn btn-danger btn-sm" title="Quitar" onclick="lidQuitar(${i})">✕</button>
    </div>`).join('');
  return `${filas || '<p class="muted">No hay reglas. Agrega una.</p>'}
    <button type="button" class="btn btn-outline btn-sm" onclick="lidAgregar()">➕ Agregar grupo/líder</button>
    <hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0">
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:8px">
      <div class="field"><label>Correo de administrativos (copia)</label><input type="email" value="${esc(L.adminCorreo || '')}" onchange="lidSetAdmin('adminCorreo',this.value)"></div>
      <div class="field"><label>Cargos operativos que NO llevan esa copia</label><input value="${esc(L.adminExcluye || '')}" placeholder="conductor, gestor, flota" onchange="lidSetAdmin('adminExcluye',this.value)"></div>
    </div>
    <div class="form-actions"><button type="button" class="btn btn-success" onclick="lidGuardar()">💾 Guardar líderes</button></div>`;
}
function lidSet(i, campo, val) { lidModel().reglas[i][campo] = val.trim(); }
function lidSetAdmin(campo, val) { lidModel()[campo] = val.trim(); }
function lidAgregar() { lidModel().reglas.push({ etiqueta: '', frases: '', correo: '' }); const e = document.getElementById('panelLideres'); if (e) e.innerHTML = htmlLideres(); }
function lidQuitar(i) { lidModel().reglas.splice(i, 1); const e = document.getElementById('panelLideres'); if (e) e.innerHTML = htmlLideres(); }
async function lidGuardar() {
  State.config = { ...State.config, id: 'app' };
  try {
    await DB.put('config', State.config);
    window.PD_LIDERES = State.config.lideres;   // refrescar para notificaciones.js
    toast('Líderes guardados en la nube', 'ok');
  } catch (e) { toast('No se pudo guardar: ' + (e.message || e), 'err'); }
}

function renderConfig(c) {
  const cf = State.config;
  c.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Datos de la empresa (para los documentos)</h2></div>
      <div class="panel-body"><form id="formCfg"><div class="form-grid">
        <div class="field"><label>Empresa</label><input name="empresa" value="${esc(cf.empresa)}"></div>
        <div class="field"><label>Ciudad</label><input name="ciudad" value="${esc(cf.ciudad)}"></div>
        <div class="field"><label>Responsable / área</label><input name="responsable" value="${esc(cf.responsable)}"></div>
        <div class="field"><label>Nombre de quien firma</label><input name="nombreFirma" value="${esc(cf.nombreFirma||'')}"></div>
        <div class="field"><label>Cédula de quien firma</label><input name="cedulaFirma" value="${esc(cf.cedulaFirma||'')}"></div>
        <div class="field"><label>Cargo de quien firma</label><input name="cargoFirma" value="${esc(cf.cargoFirma)}"></div>
      </div><div class="form-actions"><button class="btn btn-success">💾 Guardar configuración</button></div></form></div></div>
    <div class="panel"><div class="panel-head"><h2>Imágenes de los documentos (logo y pie de página)</h2></div>
      <div class="panel-body"><div class="grid-2">
        <div class="field"><label>Logo / encabezado</label>
          <div class="img-prev" id="prevLogo">${cf.logo?`<img src="${cf.logo}">`:'<span class="muted">Sin logo</span>'}</div>
          <div class="flex mt"><button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('inpLogo').click()">📁 Subir logo</button>
          ${cf.logo?`<button type="button" class="btn btn-outline btn-sm" onclick="quitarImg('logo')">Quitar</button>`:''}</div>
          <input type="file" id="inpLogo" accept="image/*" hidden></div>
        <div class="field"><label>Pie de página</label>
          <div class="img-prev" id="prevPie">${cf.pie?`<img src="${cf.pie}">`:'<span class="muted">Sin pie de página</span>'}</div>
          <div class="flex mt"><button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('inpPie').click()">📁 Subir pie</button>
          ${cf.pie?`<button type="button" class="btn btn-outline btn-sm" onclick="quitarImg('pie')">Quitar</button>`:''}</div>
          <input type="file" id="inpPie" accept="image/*" hidden></div>
        <div class="field"><label>Firma escaneada del responsable</label>
          <div class="img-prev" id="prevFirma" style="background:#fff">${cf.firmaImg?`<img src="${cf.firmaImg}">`:'<span class="muted">Sin firma</span>'}</div>
          <div class="flex mt"><button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('inpFirma').click()">📁 Subir firma</button>
          ${cf.firmaImg?`<button type="button" class="btn btn-outline btn-sm" onclick="quitarImg('firmaImg')">Quitar</button>`:''}</div>
          <input type="file" id="inpFirma" accept="image/*" hidden></div>
      </div><p class="muted mt" style="font-size:12px">Sugerencia: usa imágenes PNG. El logo va arriba a la izquierda y el pie al final de cada documento. La <strong>firma</strong> se coloca sobre la línea de firma del responsable (se le quita el fondo blanco automáticamente).</p></div></div>
    <div class="panel"><div class="panel-head"><h2>🤖 Asistente de IA (Claude)</h2></div>
      <div class="panel-body"><form id="formIA"><div class="form-grid">
        <div class="field full"><label>API key de Anthropic (Claude)</label>
          <input type="password" name="apiKey" value="${esc(cf.apiKey||'')}" placeholder="sk-ant-..." autocomplete="off">
        </div>
      </div><div class="form-actions"><button class="btn btn-success">💾 Guardar API key</button></div></form>
      <p class="muted" style="font-size:12px">Con la API key activada, en la diligencia de descargos podrás pulsar <strong>«✨ Sugerir preguntas con IA»</strong> para que Claude genere preguntas a la medida del caso. La key se guarda solo en este navegador. Consíguela en <strong>console.anthropic.com</strong>.</p>
      </div></div>
    <div class="panel"><div class="panel-head"><h2>📨 Líderes a notificar (citación a descargos)</h2></div>
      <div class="panel-body">
        <p class="muted" style="font-size:13px;margin-top:0">Cuando se cita a alguien a descargos, se avisa por correo al líder según su <strong>cargo</strong>. Escribe en «Si el cargo contiene…» una o varias palabras separadas por coma; si el cargo del trabajador contiene alguna, se avisa a ese correo.</p>
        <div id="panelLideres">${htmlLideres()}</div>
      </div></div>
    <div class="panel"><div class="panel-head"><h2>Datos y respaldo</h2></div><div class="panel-body">
      <p class="muted">Hay <strong>${State.procesos.length}</strong> procesos guardados en este navegador.</p>
      <div class="flex mt">
        <button class="btn btn-outline" onclick="exportar()">⬇️ Descargar respaldo (JSON)</button>
        <button class="btn btn-outline" onclick="exportarCSV()">⬇️ Exportar a CSV (Excel)</button>
        <button class="btn btn-outline" onclick="document.getElementById('fileImport').click()">⬆️ Restaurar respaldo</button>
        <button class="btn btn-danger" onclick="recargarSemilla()">♻️ Recargar datos originales</button>
      </div>
      <p class="muted mt" style="font-size:12px">⚠️ Los datos viven en este navegador y computador. Haz respaldos periódicos.</p>
    </div></div>`;
  $('#formCfg').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    State.config = { ...State.config, id: 'app', empresa: fd.get('empresa'), ciudad: fd.get('ciudad'),
      responsable: fd.get('responsable'), cargoFirma: fd.get('cargoFirma'),
      nombreFirma: fd.get('nombreFirma'), cedulaFirma: fd.get('cedulaFirma') };
    await DB.put('config', State.config);
    toast('Configuración guardada', 'ok');
  });
  $('#inpLogo').addEventListener('change', e => cargarImg(e, 'logo'));
  $('#inpPie').addEventListener('change', e => cargarImg(e, 'pie'));
  $('#inpFirma').addEventListener('change', e => cargarFirma(e));
  $('#formIA').addEventListener('submit', async e => {
    e.preventDefault();
    State.config = { ...State.config, id: 'app', apiKey: new FormData(e.target).get('apiKey').trim() };
    await DB.put('config', State.config);
    toast('API key guardada', 'ok');
  });
}
function cargarImg(e, campo) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    State.config = { ...State.config, id: 'app', [campo]: reader.result };
    await DB.put('config', State.config);
    toast(campo === 'logo' ? 'Logo guardado' : 'Pie de página guardado', 'ok');
    renderConfig($('#content'));
  };
  reader.readAsDataURL(file);
}
// Carga la firma y le quita el fondo claro (deja solo el trazo) para que se vea natural sobre la línea
function cargarFirma(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = async () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, cv.width, cv.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum > 180) {
            d[i + 3] = 0;                       // fondo claro → transparente
          } else {
            const f = Math.max(0, Math.min(1, (200 - lum) / 200));
            d[i] = d[i + 1] = d[i + 2] = 0;     // trazo en negro nítido
            d[i + 3] = Math.round(255 * f);
          }
        }
        ctx.putImageData(data, 0, 0);
        State.config = { ...State.config, id: 'app', firmaImg: cv.toDataURL('image/png') };
        await DB.put('config', State.config);
        toast('Firma guardada', 'ok');
        renderConfig($('#content'));
      } catch (err) {
        console.error(err); toast('No se pudo procesar la firma', 'err');
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
async function quitarImg(campo) {
  State.config = { ...State.config, id: 'app', [campo]: '' };
  await DB.put('config', State.config);
  toast('Imagen quitada', 'ok'); renderConfig($('#content'));
}
async function recargarSemilla() {
  if (!confirm('¿Volver a cargar los procesos desde la nube? (descarta cambios sin guardar)')) return;
  try {
    const arr = await cargarDesdeNube();
    if (!arr) { toast('Sin conexión a la nube', 'err'); return; }
    DB._set('procesos', arr.filter(r => !String(r.key || '').startsWith('TEST_AUTO_')), 'key');
    State.procesos = await DB.all('procesos');
    toast('Procesos recargados desde la nube', 'ok'); irA('dashboard');
  } catch (e) { toast('No se pudo recargar: ' + (e.message || e), 'err'); }
}

/* ---------- 11b. Usuarios y roles ---------- */
const ROLES_LBL = { admin: 'Administrador', solicitante: 'Solicitante', operador: 'Operador de firma' };
async function renderUsuarios(c) {
  c.innerHTML = `<div class="panel"><div class="panel-body"><p class="muted">Cargando usuarios…</p></div></div>`;
  let perfiles = [];
  try {
    const { data, error } = await SB.from('pd_perfiles').select('*').order('email');
    if (error) throw error;
    perfiles = data || [];
  } catch (e) {
    c.innerHTML = `<div class="panel"><div class="panel-body"><p>⚠️ No se pudieron cargar los usuarios: ${esc(e.message || e)}</p>
      <p class="muted" style="font-size:13px">Si no tienes permiso, asegúrate de que tu cuenta sea administrador (sql/02_roles.sql).</p></div></div>`;
    return;
  }
  const roles = ['admin', 'solicitante', 'operador'];
  const filas = perfiles.map(u => `
    <tr style="border-bottom:1px solid #e2e8f0">
      <td style="padding:10px 8px">${esc(u.email || u.id)}</td>
      <td style="padding:10px 8px">${esc(u.nombre || '')}</td>
      <td style="padding:10px 8px">
        <select onchange="cambiarRol('${esc(u.id)}', this.value, this)" style="padding:7px 10px;border:1.5px solid #cbd5e0;border-radius:8px">
          ${roles.map(r => `<option value="${r}" ${u.rol === r ? 'selected' : ''}>${ROLES_LBL[r]}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');
  c.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>👥 Usuarios y roles</h2></div>
      <div class="panel-body">
        <p class="muted" style="font-size:13px;margin-top:0">
          Para <strong>crear</strong> un usuario nuevo (correo y contraseña) se hace en Supabase → Authentication → Users.
          Aquí le asignas su <strong>rol</strong>. Roles: <strong>Administrador</strong> (todo), <strong>Solicitante</strong> (crea solicitudes), <strong>Operador de firma</strong> (recoge firmas).</p>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead><tr style="text-align:left;border-bottom:2px solid #cbd5e0">
              <th style="padding:10px 8px">Correo</th><th style="padding:10px 8px">Nombre</th><th style="padding:10px 8px">Rol</th></tr></thead>
            <tbody>${filas || '<tr><td colspan="3" class="muted" style="padding:14px 8px">No hay usuarios todavía.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}
async function cambiarRol(id, rol, sel) {
  if (sel) sel.disabled = true;
  try {
    const { error } = await SB.from('pd_perfiles').update({ rol }).eq('id', id);
    if (error) throw error;
    toast('Rol actualizado a ' + (ROLES_LBL[rol] || rol), 'ok');
  } catch (e) { toast('No se pudo cambiar el rol: ' + (e.message || e), 'err'); }
  if (sel) sel.disabled = false;
}

/* ---------- 12. Modal ---------- */
function abrirModal(titulo, html) { $('#modalTitle').textContent = titulo; $('#modalBody').innerHTML = html; $('#modal').hidden = false; }
function cerrarModal() { $('#modal').hidden = true; }

/* ---------- 13. Generación de documentos ---------- */
function menuDocumentos() {
  const acciones = tipo => `<div style="display:flex;gap:6px">
      <button class="btn btn-outline btn-sm" title="Ver cómo queda" onclick="generarDoc('${tipo}', true)">👁️ Vista previa</button>
      <button class="btn btn-primary btn-sm" onclick="generarDoc('${tipo}')">Generar</button>
    </div>`;
  abrirModal('Generar documento', `<div class="notif-list">
    <div class="notif-item"><div class="ni-ico">📄</div><div class="ni-body"><strong>Citación a descargos</strong><span>Carta formal de citación</span></div>${acciones('citacion')}</div>
    <div class="notif-item"><div class="ni-ico">📝</div><div class="ni-body"><strong>Acta de descargos</strong><span>Si la asistencia es «NO», genera el acta de inasistencia automáticamente</span></div>${acciones('acta')}</div>
    <div class="notif-item"><div class="ni-ico">⚖️</div><div class="ni-body"><strong>Resolución de sanción</strong><span>Comunicación de la sanción impuesta</span></div>${acciones('sancion')}</div>
  </div><p class="muted mt" style="font-size:12px">👁️ <strong>Vista previa</strong>: muestra el documento sin descargarlo ni enviarlo. «Generar» crea el PDF y lo envía por WhatsApp/correo.</p>`);
}

async function generarDoc(tipo, preview = false) {
  cerrarModal();
  // Releer el proceso desde la base para incluir firmas hechas en el Portal de firma (tablet)
  if (State.current && State.current.key) {
    try {
      const fresco = await DB.get('procesos', State.current.key);
      if (fresco) {
        State.current = fresco;
        const idx = State.procesos.findIndex(x => x.key === fresco.key);
        if (idx >= 0) State.procesos[idx] = fresco;
      }
    } catch (e) { /* sin problema */ }
  }
  const p = State.current, cf = State.config;
  // Documento generado con la plantilla OFICIAL compartida (la misma que usa el portal de firma)
  if (window.PD_DOCS) { const _d = PD_DOCS.construir(tipo, p, cf); return entregarDoc(_d.titulo, _d.cuerpo, _d.showTitle, preview); }
  const hoy = fechaLarga(hoyISO());
  const firma = `<div class="firma"><p>Atentamente,</p>
    <div class="firma-linea">${cf.firmaImg?`<img src="${cf.firmaImg}" alt="firma">`:''}</div>
    <p><strong>${esc(cf.nombreFirma||cf.responsable)}</strong><br>${esc(cf.cargoFirma||'')}<br>${esc(cf.empresa)}</p></div>`;
  // Firmas de la resolución (suspensión / invitación): empresa + trabajador + dos testigos
  const firmasSancion = `
    <div class="firmas-sanc">
      <div class="fs-col"><p>Atentamente,</p>
        <div class="fs-sp">${cf.firmaImg?`<img src="${cf.firmaImg}" alt="firma">`:''}</div>
        <p><strong>${esc(cf.nombreFirma||cf.responsable)}</strong><br>${esc(cf.cargoFirma||'Coordinación de Procesos Disciplinarios')}<br>${esc(cf.empresa)}</p></div>
      <div class="fs-col"><p>Recibí,</p>
        <div class="fs-sp">${p.firmaDecision?`<img src="${p.firmaDecision}" alt="firma trabajador">`:''}</div>
        <p><strong>${esc(p.nombre)}</strong><br>C.C. ${esc(p.cc)}</p></div>
    </div>
    <div class="firmas-sanc" style="margin-top:26px">
      <div class="fs-col"><div class="fs-sp"></div><p>Testigo 1<br>C.C. ____________</p></div>
      <div class="fs-col"><div class="fs-sp"></div><p>Testigo 2<br>C.C. ____________</p></div>
    </div>`;
  let titulo = '', cuerpo = '';

  if (tipo === 'citacion') {
    titulo = 'CITACIÓN A DESCARGOS';
    const pruebasTxt = (p.pruebas && p.pruebas.trim()) ? esc(p.pruebas).replace(/\n/g,'<br>') : '';
    cuerpo = `
      <p class="lugar2">${esc(cf.ciudad)}, ${hoy}</p>
      <p>Señor(a) <strong>${esc(p.nombre)}</strong><br>
         CC: ${esc(p.cc)}<br>
         ${p.celular ? `Celular: ${esc(p.celular)}<br>` : ''}${p.correoNotificacion ? `Correo: ${esc(p.correoNotificacion)}<br>` : ''}Ciudad: ${esc(cf.ciudad)}</p>
      <p><strong>ASUNTO: CITACIÓN A DESCARGOS</strong></p>
      <p>Con el fin de dar cumplimiento al artículo 115 del Código Sustantivo del Trabajo, se le cita a diligencia de descargos para el <strong>${fechaConDia(p.fechaCitacion)}</strong> a las <strong>${esc(p.horaCitacion||'____')}</strong> en las instalaciones de ${esc(cf.empresa)} con el fin de que rinda su versión sobre los hechos que tuvo conocimiento la empresa el pasado <strong>${fechaLarga(p.fechaHechos||p.fechaCitacion)}</strong> reportados por la empresa de la siguiente manera:</p>
      <p class="reporte">${esc(p.motivo||'____________').replace(/\n/g,'<br>')}</p>
      <p>Estas conductas presuntamente transgreden el Reglamento Interno de Trabajo, contrato de trabajo, manual de funciones y el Código Sustantivo del Trabajo, en los artículos:</p>
      <div class="reglamento">${esc(p.reglamento||'____________')}</div>
      <p>La empresa cuenta con las siguientes pruebas, que se le ponen de presente para que ejerza su derecho a la defensa.${pruebasTxt?'<br>'+pruebasTxt:''}</p>
      <p>Recuerde que puede presentarse a la diligencia con dos personas quienes actuarán como testigos de los descargos, los cuales tienen el fin único de observar el cumplimiento de las garantías constitucionales y legales en el proceso disciplinario que actualmente se tramita. Los mismos no tendrán ni voz ni voto en la diligencia, salvo que vayan a rendir testimonios como pruebas para su defensa.</p>
      <p>La no comparecencia a los descargos constituye la renuncia a rendir las declaraciones sobre lo sucedido por parte del trabajador, entendiéndose así la renuncia a su derecho a la defensa.</p>
      <div class="firmas-cit">
        <div class="fc-col"><p>Atentamente,</p>
          <div class="fc-sp">${cf.firmaImg?`<img src="${cf.firmaImg}" alt="firma">`:''}</div>
          <p>NOMBRE: ${esc(cf.nombreFirma||cf.responsable)}</p></div>
        <div class="fc-col"><p>Recibí:</p><div class="fc-sp">${p.firmaCitacion?`<img src="${p.firmaCitacion}" alt="firma trabajador">`:''}</div>
          <p>C.C: ${esc(p.cc||'____________')}<br>NOMBRE: ${esc(p.nombre||'____________')}</p></div>
      </div>`;
    entregarDoc(titulo, cuerpo, false, preview);
    return;
  } else if (tipo === 'acta') {
    const fechaDil = p.fechaActaDescargos || p.fechaDiligenciamiento || p.fechaCitacion;
    const horaDil = p.horaActaDescargos || p.horaDiligenciamiento || p.horaCitacion || '____';
    const dirige = cf.nombreFirma || p.disciplinario || cf.responsable;
    if (norm(p.asistencia) === 'no') {
      // Acta de no comparecencia a descargos (formato COMBUSES)
      titulo = 'ACTA DE NO COMPARECENCIA A DESCARGOS';
      const datos = `<table class="dd-datos">
        <tr><td colspan="2"><strong>Nombre:</strong> ${esc(p.nombre)}</td></tr>
        <tr><td><strong>C.C.:</strong> ${esc(p.cc)}</td><td><strong>Cargo:</strong> ${esc(p.cargo||p.area||'')}</td></tr>
        <tr><td><strong>Área:</strong> ${esc(p.area||'')}</td><td><strong>Interno:</strong> ${esc(p.interno||'')}</td></tr>
        <tr><td><strong>Propietario del vehículo:</strong> ${esc(p.propietario||'')}</td><td><strong>Ruta:</strong> ${esc(p.ruta||'')}</td></tr></table>`;
      cuerpo = `<p class="lugar2">${esc(cf.ciudad)}, ${fechaLarga(fechaDil)}</p>
        ${datos}
        <h3 class="sec">MOTIVO DE LA CITACIÓN</h3>
        <p>El trabajador fue citado a diligencia de descargos con ocasión de los siguientes hechos:</p>
        <p>${esc(p.motivo||'____________').replace(/\n/g,'<br>')}</p>
        <h3 class="sec">INASISTENCIA A LA DILIGENCIA</h3>
        <p>Se deja constancia de que el (la) trabajador(a) <strong>${esc(p.nombre)}</strong>, identificado(a) con cédula de ciudadanía N° ${esc(p.cc)}, fue citado(a) formalmente a diligencia de descargos para el día <strong>${fechaLarga(fechaDil)}</strong>${horaDil&&horaDil!=='____'?` a las <strong>${esc(horaDil)}</strong>`:''}, con el fin de ejercer su derecho de defensa y contradicción frente a los hechos descritos. Sin embargo, <strong>NO SE PRESENTÓ</strong> a la diligencia ni justificó su inasistencia.</p>
        <p>De conformidad con el Reglamento Interno de Trabajo y lo señalado en la citación, en el caso de que el trabajador no asista y no justifique dentro del día hábil siguiente su inasistencia, o se niegue a comparecer a la diligencia de descargos, se entenderá que renuncia al derecho que tiene de ser escuchado por la empresa, quedando esta facultada para imponer la sanción disciplinaria a que haya lugar.</p>
        ${p.reglamento&&p.reglamento.trim()?`<h3 class="sec">NORMAS PRESUNTAMENTE VULNERADAS</h3><div class="reglamento">${esc(p.reglamento)}</div>`:''}
        <h3 class="sec">CONSTANCIA</h3>
        <p>Se deja la presente acta como evidencia de la no comparecencia del (de la) trabajador(a) a la citación a descargos, lo cual será tenido en cuenta dentro del proceso disciplinario conforme a la normatividad laboral vigente y el Reglamento Interno de Trabajo.</p>
        <div class="firmas2" style="margin-top:36px">
          <div>${cf.firmaImg?`<div class="f2-linea"><img src="${cf.firmaImg}" alt="firma"></div>`:'<div class="f2-linea"></div>'}<strong>${esc(dirige)}</strong><br>${esc(cf.cargoFirma||'Coordinación de Procesos Disciplinarios')}<br>${esc(cf.empresa)}</div>
          <div><div class="f2-linea"></div>Firma testigo<br>C.C. ____________</div>
        </div>`;
    } else {
      // Acta de diligencia de descargos (formato oficial COMBUSES)
      titulo = 'Diligencia de descargos';
      const horaIni = p.horaActaDescargos || p.horaCitacion || '____';
      const horaFin = p.horaDiligenciamiento || '____';
      const interno = p.interno ? ` del interno ${esc(p.interno)}` : '';
      const ruta = p.ruta ? ` en la ruta ${esc(p.ruta)}` : '';
      cuerpo = `
        <p class="dd-enc">Procesos Administrativos<br>Recursos Humanos</p>
        <h2 class="dd-tit">Diligencia de descargos</h2>
        <table class="dd-datos"><tr><td><strong>Fecha:</strong> ${fechaLarga(fechaDil)}</td><td><strong>Hora:</strong> ${esc(horaIni)}</td></tr>
          <tr><td colspan="2"><strong>Trabajador:</strong> ${esc(p.nombre)}</td></tr>
          <tr><td><strong>C.C.:</strong> ${esc(p.cc)}</td><td><strong>Cargo:</strong> ${esc(p.cargo||p.area)}</td></tr></table>
        <p><strong>Motivo de la diligencia:</strong> Presentación de descargos por la siguiente presunta falta:</p>
        <p>El (la) trabajador(a) <strong>${esc(p.nombre)}</strong> fue citado(a) con el fin de rendir descargos por los hechos reportados relacionados con que el día ${p.fechaHechos?`<strong>${esc(p.fechaHechos)}</strong>`:'____________'}, durante su jornada laboral como ${esc(p.cargo||p.area)}${interno}${ruta}, presuntamente: ${esc(p.motivo||'____________')}</p>
        <p>En la fecha y hora antes anotada y previa convocatoria que se hizo por escrito al trabajador para diligencia de descargos con fecha de citación del <strong>${fechaLarga(p.fechaCitacion)}</strong>, misma en la que también se le dieron a conocer las posibles faltas disciplinarias, comparece a las oficinas de la empresa el trabajador antes mencionado, con el propósito de presentar descargos o las presuntas justificaciones que pueda tener con relación a los cargos que le endilga la empresa; a tal efecto, comparece a esta diligencia en representación de la empresa la ${esc(cf.responsable||'Coordinación de Procesos Disciplinarios')} y el trabajador antes anotado. Se invita al trabajador a que de manera libre y espontánea manifieste voluntariamente los descargos o justificaciones que pueda tener con relación a las presuntas faltas disciplinarias a que se alude y a que sea veraz en sus explicaciones:</p>
        <p class="dd-cuest"><strong>CUESTIONARIO DE DESCARGOS</strong></p>
        <div class="dd-qa">${(p.acta||p.textoActa)?esc(p.acta||p.textoActa).replace(/\n/g,'<br>'):'<br><br><br><br><br><br>'}</div>
        <p>Siendo las <strong>${esc(horaFin)}</strong>, se da por terminada la presente diligencia y se le informa al trabajador que dentro del término legal la empresa le dará a conocer cualquier pronunciamiento con relación a los cargos y a los descargos que ha presentado.</p>
        <p>Para constancia se firma por los intervinientes,</p>
        <div class="firmas2" style="margin-top:40px">
          <div>Por la Empresa,<div class="f2-linea">${cf.firmaImg?`<img src="${cf.firmaImg}" alt="firma">`:''}</div>${esc(cf.nombreFirma||cf.responsable)}<br>${esc(cf.cargoFirma||'Coordinador(a) de Procesos Disciplinarios')}</div>
          <div>Recibe,<div class="f2-linea">${p.firmaDescargos?`<img src="${p.firmaDescargos}" alt="firma trabajador">`:''}</div>${esc(p.nombre)}<br>C.C. ${esc(p.cc)}</div>
        </div>`;
    }
  } else {
    const fechaDesc = p.fechaActaDescargos || p.fechaDiligenciamiento || p.fechaCitacion;
    const horaDesc = p.horaActaDescargos || p.horaCitacion || '';
    const cargoTxt = p.cargo || p.area || '';
    const participo = norm(p.asistencia) === 'no' ? 'usted no compareció' : 'usted participó';
    const encabezado = `<p class="lugar2">${esc(cf.ciudad)}, ${hoy}</p>
      <p>Señor(a)<br><strong>${esc(p.nombre)}</strong><br>C.C. ${esc(p.cc)}<br>Cargo: ${esc(cargoTxt)}<br>Ciudad</p>`;
    const bloqueDescargos = (p.resumenDescargos && p.resumenDescargos.trim())
      ? `<h3 class="sec">DESCARGOS DEL TRABAJADOR</h3><p>${esc(p.resumenDescargos).replace(/\n/g,'<br>')}</p>` : '';
    const bloqueNormas = (p.reglamento && p.reglamento.trim())
      ? `<h3 class="sec">NORMAS VULNERADAS</h3><div class="reglamento">${esc(p.reglamento)}</div>` : '';

    if (norm(p.tipoDecision).includes('invit')) {
      // Invitación al mejoramiento (medida más leve que la suspensión)
      titulo = 'INVITACIÓN AL MEJORAMIENTO';
      cuerpo = `${encabezado}
        <p>La empresa ${esc(cf.empresa)}, una vez surtida la diligencia de descargos realizada el <strong>${fechaLarga(fechaDesc)}</strong> dentro del proceso disciplinario adelantado en su contra, y garantizando el debido proceso y el derecho de defensa y contradicción, se permite comunicarle la presente <strong>INVITACIÓN AL MEJORAMIENTO</strong>, con fundamento en los hechos ocurridos el ${fechaLarga(p.fechaHechos||fechaDesc)}.</p>
        <h3 class="sec">ANTECEDENTES</h3>
        <p>${esc(p.antecedentes||p.motivo||'____________').replace(/\n/g,'<br>')}</p>
        ${bloqueDescargos}
        ${bloqueNormas}
        <h3 class="sec">CONSIDERACIONES</h3>
        <p>${esc(p.consideraciones||'Analizados los hechos y los descargos rendidos por el trabajador, la empresa considera procedente, en esta oportunidad, realizar un llamado al mejoramiento en lugar de imponer una sanción disciplinaria, sin perjuicio de las acciones que correspondan ante una eventual reincidencia.').replace(/\n/g,'<br>')}</p>
        <h3 class="sec">INVITACIÓN AL MEJORAMIENTO</h3>
        <p>En consecuencia, la empresa lo (la) invita formalmente a mejorar su comportamiento y a dar estricto cumplimiento al Reglamento Interno de Trabajo, al contrato de trabajo, al manual de funciones y a las directrices de la empresa.</p>
        ${p.compromisos&&p.compromisos.trim()?`<p><strong>Compromisos de mejora:</strong></p><div class="reglamento">${esc(p.compromisos)}</div>`:''}
        <p>Se le advierte que la reincidencia en este tipo de conductas podrá dar lugar a la imposición de sanciones disciplinarias más severas, conforme al procedimiento establecido en el Reglamento Interno de Trabajo y la ley.</p>
        <p>La presente invitación al mejoramiento se deja como constancia dentro de su historial laboral.</p>
        ${firmasSancion}`;
    } else if (norm(p.tipoDecision).includes('llamado') || norm(p.tipoDecision).includes('atencion')) {
      // Llamado de atención escrito (medida disciplinaria menor que la suspensión)
      titulo = 'LLAMADO DE ATENCIÓN';
      cuerpo = `${encabezado}
        <p>La empresa ${esc(cf.empresa)}, una vez surtida la diligencia de descargos realizada el <strong>${fechaLarga(fechaDesc)}</strong> dentro del proceso disciplinario adelantado en su contra, y garantizando el debido proceso y el derecho de defensa y contradicción, se permite realizarle el presente <strong>LLAMADO DE ATENCIÓN ESCRITO</strong>, con fundamento en los hechos ocurridos el ${fechaLarga(p.fechaHechos||fechaDesc)}.</p>
        <h3 class="sec">ANTECEDENTES</h3>
        <p>${esc(p.antecedentes||p.motivo||'____________').replace(/\n/g,'<br>')}</p>
        ${bloqueDescargos}
        ${bloqueNormas}
        <h3 class="sec">CONSIDERACIONES</h3>
        <p>${esc(p.consideraciones||'Analizados los hechos y los descargos rendidos por el trabajador, la empresa considera procedente realizar un llamado de atención escrito, dejando constancia de la conducta dentro de su historial laboral.').replace(/\n/g,'<br>')}</p>
        <h3 class="sec">LLAMADO DE ATENCIÓN</h3>
        <p>En consecuencia, la empresa le hace un <strong>LLAMADO DE ATENCIÓN ESCRITO</strong> y le exhorta a dar estricto cumplimiento al Reglamento Interno de Trabajo, al contrato de trabajo, al manual de funciones y a las directrices de la empresa.</p>
        ${p.compromisos&&p.compromisos.trim()?`<p><strong>Compromisos de mejora:</strong></p><div class="reglamento">${esc(p.compromisos)}</div>`:''}
        <p>Se le advierte que la reincidencia en este tipo de conductas podrá dar lugar a la imposición de sanciones disciplinarias más severas, conforme al procedimiento establecido en el Reglamento Interno de Trabajo y la ley.</p>
        <p>El presente llamado de atención se deja como constancia dentro de su historial laboral.</p>
        ${firmasSancion}`;
    } else if (norm(p.tipoDecision).includes('terminacion') || norm(p.tipoDecision).includes('contrato')) {
      // Terminación del contrato de trabajo por justa causa
      titulo = 'TERMINACIÓN DEL CONTRATO DE TRABAJO';
      cuerpo = `${encabezado}
        <p>La empresa ${esc(cf.empresa)}, en ejercicio de sus facultades legales y reglamentarias, una vez surtido el debido proceso y garantizado el derecho de defensa y contradicción, con fundamento en los hechos ocurridos el <strong>${fechaLarga(p.fechaHechos||fechaDesc)}</strong>, analizados dentro del proceso disciplinario para el cual usted fue citado a diligencia de descargos el <strong>${fechaLarga(fechaDesc)}</strong>${horaDesc?` a las <strong>${esc(horaDesc)}</strong>`:''}, diligencia en la cual ${participo}, se permite comunicarle la <strong>TERMINACIÓN DE SU CONTRATO DE TRABAJO POR JUSTA CAUSA</strong>.</p>
        <h3 class="sec">ANTECEDENTES</h3>
        <p>${esc(p.antecedentes||p.motivo||'____________').replace(/\n/g,'<br>')}</p>
        ${bloqueDescargos}
        ${bloqueNormas}
        <h3 class="sec">CONSIDERACIONES</h3>
        <p>${esc(p.consideraciones||'Analizados los hechos, las pruebas y los descargos rendidos, la empresa concluye que el trabajador incurrió en una falta grave que constituye justa causa para dar por terminado el contrato de trabajo, conforme al artículo 62 del Código Sustantivo del Trabajo y el Reglamento Interno de Trabajo.').replace(/\n/g,'<br>')}</p>
        <h3 class="sec">DECISIÓN</h3>
        <p>El proceso se adelantó en cumplimiento de las garantías del debido proceso, el derecho de defensa y contradicción; se realizó la debida citación y se pusieron en conocimiento las pruebas con las que contaba la empresa. En consecuencia, la empresa <strong>RESUELVE</strong>:</p>
        <p>Dar por <strong>terminado el contrato de trabajo</strong> del (de la) trabajador(a) <strong>${esc(p.nombre)}</strong>, C.C. ${esc(p.cc)}, <strong>por justa causa</strong>, de conformidad con el artículo 62 del Código Sustantivo del Trabajo y el Reglamento Interno de Trabajo${p.numeralesSancion&&p.numeralesSancion.trim()?`, ${esc(p.numeralesSancion)}`:''}, a partir de la fecha de recibo de esta comunicación.</p>
        <p>La liquidación de las prestaciones sociales a que haya lugar se pondrá a su disposición conforme a la ley.</p>
        ${firmasSancion}`;
    } else {
      // Suspensión disciplinaria (formato COMBUSES)
      titulo = 'SUSPENSIÓN DISCIPLINARIA';
      const dias = p.diasSuspension || '____';
      cuerpo = `${encabezado}
        <p>La empresa ${esc(cf.empresa)}, en ejercicio de sus facultades legales y reglamentarias, se permite imponer la presente <strong>suspensión disciplinaria</strong>, con fundamento en los hechos ocurridos el <strong>${fechaLarga(p.fechaHechos||fechaDesc)}</strong>, analizados dentro del proceso disciplinario para el cual usted fue citado a diligencia de descargos el <strong>${fechaLarga(fechaDesc)}</strong>${horaDesc?` a las <strong>${esc(horaDesc)}</strong>`:''}, diligencia en la cual ${participo}.</p>
        <h3 class="sec">ANTECEDENTES</h3>
        <p>${esc(p.antecedentes||p.motivo||'____________').replace(/\n/g,'<br>')}</p>
        ${bloqueDescargos}
        ${bloqueNormas}
        <h3 class="sec">CONSIDERACIONES</h3>
        <p>${esc(p.consideraciones||'Analizados los hechos, las pruebas y los descargos rendidos, la empresa concluye que el trabajador incurrió en las faltas disciplinarias señaladas, encontrándose acreditada su responsabilidad, así como la afectación a las normas legales e internas de la compañía.').replace(/\n/g,'<br>')}</p>
        <h3 class="sec">DECISIÓN</h3>
        <p>El proceso se adelantó en cumplimiento de las garantías del debido proceso, el derecho de defensa y contradicción; se realizó la debida citación y se pusieron en conocimiento las pruebas con las que contaba la empresa. En consecuencia, la empresa <strong>RESUELVE</strong>:</p>
        <p>Suspender al (a la) trabajador(a) <strong>${esc(p.nombre)}</strong>, C.C. ${esc(p.cc)}, por el término de <strong>${esc(dias)} día(s)</strong>${p.numeralesSancion&&p.numeralesSancion.trim()?`, por incurrir en las faltas previstas en el Reglamento Interno de Trabajo, ${esc(p.numeralesSancion)}`:''}.</p>
        <h3 class="sec">RECURSO</h3>
        <p>Frente a esta decisión procede el recurso de reposición, el cual debe interponerse ante ${esc(p.recursoAnte||'la Coordinación de SST')} en el término de ${esc(p.recursoDias||'1')} día hábil siguiente al recibo de esta notificación.</p>
        <p>En caso de no impugnarse esta decisión, la suspensión se hará efectiva ${p.fechaInicioSancion?`a partir del <strong>${fechaLarga(p.fechaInicioSancion)}</strong>`:'____________'}${p.fechaFinSancion?` hasta el <strong>${fechaLarga(p.fechaFinSancion)}</strong>`:''}${p.fechaReintegro?`, reintegrándose a laborar el día <strong>${fechaLarga(p.fechaReintegro)}</strong>`:''}.</p>
        ${firmasSancion}`;
    }
  }
  // El acta de diligencia trae su propio encabezado → sin título centrado. La de inasistencia y la sanción sí.
  const conTitulo = !(tipo === 'acta' && norm(p.asistencia) !== 'no');
  entregarDoc(titulo, cuerpo, conTitulo, preview);
}

// Decide la salida del documento: vista previa en pantalla o PDF (descarga + envío)
function entregarDoc(titulo, cuerpo, showTitle, preview) {
  if (preview) return previsualizarDoc(titulo, cuerpo, showTitle);
  return imprimirDoc(titulo, cuerpo, showTitle);
}
// Muestra el documento tal como quedará, en una ventana aparte (para revisarlo con el trabajador)
function previsualizarDoc(titulo, cuerpo, showTitle) {
  const html = armarDocumentoHTML(titulo, cuerpo, showTitle);
  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para ver la vista previa', 'err'); return; }
  w.document.write(html); w.document.close(); w.focus();
}

// Estilos del documento PDF (maquetación compacta validada: logo arriba, pie junto a las firmas)
const PRINT_CSS = `
  @page{margin:2cm 1.7cm 2.4cm 1.7cm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.34;color:#000}
  .doc-wrap{max-width:18cm;margin:0 auto;padding:0 4px}
  .doc-header{margin-bottom:10px}
  .doc-header img{height:48px;width:auto}
  .doc-footer{margin-top:24px;text-align:right;page-break-inside:avoid}
  .doc-footer img{height:58px;width:auto;max-width:100%}
  h1{text-align:center;font-size:12.5pt;text-transform:uppercase;margin:2px 0 14px;border-bottom:2px solid #000;padding-bottom:6px}
  p{margin:5px 0;text-align:justify}
  .lugar{text-align:right} .lugar2{margin-bottom:12px}
  .reporte{margin:6px 0}
  .reglamento{white-space:pre-wrap;font-size:9.5pt;line-height:1.28;margin:7px 0;text-align:justify}
  blockquote{margin:9px 22px;padding:8px 14px;border-left:3px solid #555;background:#f6f6f6;font-style:italic}
  .acta-box{border:1px solid #888;min-height:150px;padding:12px;margin:8px 0}
  .dd-enc{text-align:center;font-size:9.5pt;font-weight:bold;margin-bottom:4px}
  .dd-tit{text-align:center;font-size:12.5pt;margin:4px 0 14px;text-decoration:underline}
  .dd-datos{width:100%;border-collapse:collapse;margin:8px 0 14px}
  .dd-datos td{padding:3px 6px;font-size:10pt}
  .dd-cuest{text-align:center;margin:14px 0 8px}
  .dd-qa{white-space:pre-wrap;font-size:10pt;line-height:1.45;text-align:justify}
  .firma{margin-top:30px;page-break-inside:avoid}
  .firma .firma-linea{height:56px;width:7.5cm;border-bottom:1px solid #000;margin:6px 0 4px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
  .firma .firma-linea img{max-height:54px;max-width:96%}
  .firmas2{display:flex;justify-content:space-between;margin-top:40px;gap:30px;text-align:center;font-size:10pt;page-break-inside:avoid}
  .firmas2 > div{flex:1}
  .f2-linea{height:52px;width:85%;border-bottom:1px solid #000;margin:6px auto 4px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
  .f2-linea img{max-height:50px;max-width:96%}
  .firmas-cit{display:flex;justify-content:space-between;gap:40px;margin-top:26px;page-break-inside:avoid}
  .firmas-cit .fc-col{flex:1}
  .firmas-cit .fc-sp{height:56px;border-bottom:1px solid #000;margin:6px 0 4px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
  .firmas-cit .fc-sp img{max-height:54px;max-width:96%}
  h3.sec{font-size:10.5pt;font-weight:bold;text-transform:uppercase;text-align:left;margin:14px 0 4px;border-bottom:1px solid #999;padding-bottom:2px}
  .firmas-sanc{display:flex;justify-content:space-between;gap:40px;margin-top:34px;page-break-inside:avoid}
  .firmas-sanc .fs-col{flex:1;text-align:center}
  .firmas-sanc .fs-col p{text-align:center;margin:3px 0}
  .firmas-sanc .fs-sp{height:54px;border-bottom:1px solid #000;margin:6px auto 4px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
  .firmas-sanc .fs-sp img{max-height:52px;max-width:96%}
`;

function nombreArchivo(titulo, p) {
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${slug(titulo) || 'documento'}_${slug(p.nombre) || 'doc'}_${hoyISO()}.pdf`;
}

// Arma el HTML completo del documento (con membrete) usando la plantilla OFICIAL compartida
function armarDocumentoHTML(titulo, cuerpo, showTitle) {
  return window.PD_DOCS.documentoHTML(titulo, cuerpo, showTitle, State.config);
}

// Pide el PDF al servidor local (Edge) — mejor calidad. Lanza error si no está disponible.
async function pedirPDFServidor(html, filename) {
  let ultimoError;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const res = await fetch('/generar-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, filename }) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.blob();
    } catch (e) { ultimoError = e; if (intento < 2) await new Promise(r => setTimeout(r, 700)); }
  }
  throw ultimoError;
}
// Genera el PDF en el propio navegador (funciona también en la web, sin servidor local)
async function generarPDFNavegador(titulo, cuerpo, showTitle) {
  if (!window.html2pdf || !window.PD_DOCS) throw new Error('Generador de PDF no disponible');
  const cont = document.createElement('div');
  cont.style.cssText = 'position:fixed;left:-10000px;top:0;width:760px;background:#fff';
  cont.innerHTML = window.PD_DOCS.documentoInner(titulo, cuerpo, showTitle, State.config);
  document.body.appendChild(cont);
  try {
    return await html2pdf().set({
      margin: 8,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(cont).outputPdf('blob');
  } finally { cont.remove(); }
}
// Genera y DESCARGA el PDF: usa el servidor local si está disponible (mejor calidad);
// si no (por ejemplo en la web), lo genera el propio navegador.
async function imprimirDoc(titulo, cuerpo, showTitle = true) {
  const p = State.current || {};
  const filename = nombreArchivo(titulo, p);
  toast('Generando PDF…');
  let blob = null;
  const esLocal = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  if (esLocal) {
    try { blob = await pedirPDFServidor(armarDocumentoHTML(titulo, cuerpo, showTitle), filename); }
    catch (e) { console.warn('Servidor PDF local no disponible; se genera en el navegador:', e); }
  }
  if (!blob) {
    try { blob = await generarPDFNavegador(titulo, cuerpo, showTitle); }
    catch (e) { console.error(e); toast('No se pudo generar el PDF.', 'err'); return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('PDF generado ✓', 'ok');
  // Avisar si no hay datos de contacto para enviar la notificación
  const fc = faltaContacto(p.celular || p.celularCitado, p.correoNotificacion || p.correoCitado);
  if (fc.ninguno) toast('⚠️ Sin celular ni correo: el documento no se podrá enviar al trabajador', 'err');
  // Enviar el PDF al webhook de Pabbly (para WhatsApp/correo), si está configurado
  if (window.enviarDocumentoWebhook) enviarDocumentoWebhook(blob, filename, p, titulo);
}

/* ---------- 14. Notificaciones ---------- */
function menuNotificar() {
  const p = State.current;
  const correo = p.correoNotificacion || p.correoCitado || p.correoAfiliado || '';
  const cel = (p.celular || p.celularCitado || p.celularAfiliado || '').replace(/\D/g, '');
  const asunto = `Citación a descargos - Proceso disciplinario - ${p.nombre}`;
  const cuerpo = `Señor(a) ${p.nombre} (C.C. ${p.cc}):\n\nSe le cita a diligencia de descargos el día ${p.fechaCitacion||'____'} a las ${p.horaCitacion||'____'}, por el siguiente motivo:\n\n${p.motivo||''}\n\nAtentamente,\n${State.config.nombreFirma||State.config.responsable}\n${State.config.empresa}`;
  const mailto = `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  const wa = cel ? `https://wa.me/57${cel}?text=${encodeURIComponent(cuerpo)}` : '';
  State._notifMsg = cuerpo;
  abrirModal('Notificar al empleado', `<div class="notif-list">
    <div class="notif-item"><div class="ni-ico">📧</div><div class="ni-body"><strong>Correo electrónico</strong><span>${correo?esc(correo):'<i>sin correo registrado</i>'}</span></div>
      <a class="btn btn-primary btn-sm" ${correo?`href="${mailto}"`:'style="pointer-events:none;opacity:.4"'}>Abrir correo</a></div>
    <div class="notif-item"><div class="ni-ico">💬</div><div class="ni-body"><strong>WhatsApp</strong><span>${cel?'+57 '+esc(cel):'<i>sin celular registrado</i>'}</span></div>
      <a class="btn btn-success btn-sm" ${wa?`href="${wa}" target="_blank"`:'style="pointer-events:none;opacity:.4"'}>Abrir WhatsApp</a></div>
    <div class="notif-item"><div class="ni-ico">📋</div><div class="ni-body"><strong>Copiar mensaje</strong><span>Para pegarlo donde necesites</span></div>
      <button class="btn btn-outline btn-sm" onclick="copiar()">Copiar</button></div>
  </div>`);
}
function copiar() { navigator.clipboard.writeText(State._notifMsg || '').then(() => toast('Mensaje copiado', 'ok'), () => toast('No se pudo copiar', 'err')); }

/* ---------- 14b. Asistente de IA (Claude) ---------- */
async function llamarClaude({ system, user, schema, maxTokens = 4000 }) {
  const key = (State.config.apiKey || '').trim();
  if (!key) throw new Error('Configura tu API key de Claude en ⚙️ Configuración.');
  const body = {
    model: 'claude-opus-4-8',
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: user }]
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const j = await res.json(); if (j.error?.message) msg += `: ${j.error.message}`; } catch {}
    if (res.status === 401) msg = 'API key inválida. Revísala en Configuración.';
    throw new Error(msg);
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('La IA no pudo procesar esta solicitud.');
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('La IA no devolvió contenido.');
  return JSON.parse(textBlock.text);
}

async function sugerirPreguntasIA(btn) {
  const ta = document.querySelector('#formProceso [name="acta"]') || document.querySelector('#formPaso [name="acta"]');
  if (!ta) return;
  const reg = State.current || {};
  const g = name => {
    const el = document.querySelector(`#formProceso [name="${name}"]`) || document.querySelector(`#formPaso [name="${name}"]`);
    return ((el ? el.value : '') || reg[name] || '').toString().trim();
  };
  const ctx = {
    nombre: g('nombre'), cargo: g('cargo') || g('area'), area: g('area'), ruta: g('ruta'),
    interno: g('interno'), motivo: g('motivo'), falta: g('falta'),
    fechaHechos: g('fechaHechos'), reglamento: g('reglamento')
  };
  if (!ctx.motivo && !ctx.falta) { toast('Primero escribe el motivo o la falta', 'err'); return; }
  if (ta.value.trim() && !confirm('El cuestionario ya tiene contenido. ¿Reemplazarlo por las preguntas sugeridas?')) return;

  const txtOrig = btn.textContent; btn.disabled = true; btn.textContent = '⏳ Generando…';
  try {
    const schema = { type: 'object', additionalProperties: false,
      properties: { preguntas: { type: 'array', items: { type: 'string' } } },
      required: ['preguntas'] };
    const system = `Eres un abogado experto en derecho laboral colombiano y en procesos disciplinarios de COMBUSES S.A., una empresa de transporte de pasajeros de Medellín. Redactas los cuestionarios para las diligencias de descargos respetando el debido proceso (Sentencia C-593 de 2014, Ley 2466 de 2025 y el Reglamento Interno de Trabajo). Las preguntas deben ser claras, imparciales, específicas a los hechos, dirigidas al trabajador (de usted), y orientadas a esclarecer lo ocurrido y garantizar su derecho de defensa.`;
    const user = `Genera entre 10 y 14 preguntas para la diligencia de descargos del siguiente caso. Empieza siempre con la pregunta de identificación (nombre, cédula, cargo, empresa, interno, ruta y propietario) y termina con una pregunta sobre si se le garantizó el debido proceso. Incluye preguntas específicas sobre los hechos.

Trabajador: ${ctx.nombre || 'N/D'}
Cargo: ${ctx.cargo || 'N/D'} · Área: ${ctx.area || 'N/D'} · Ruta: ${ctx.ruta || 'N/D'} · Interno: ${ctx.interno || 'N/D'}
Fecha de los hechos: ${ctx.fechaHechos || 'N/D'}
Falta imputada: ${ctx.falta || 'N/D'}
Motivo / hechos reportados: ${ctx.motivo || 'N/D'}
Artículos del Reglamento posiblemente infringidos: ${(ctx.reglamento || 'N/D').slice(0, 1500)}

Devuelve solo las preguntas (sin numerar), una por elemento del arreglo.`;
    const out = await llamarClaude({ system, user, schema, maxTokens: 8000 });
    const preguntas = (out.preguntas || []).filter(p => p && p.trim());
    if (!preguntas.length) throw new Error('No se generaron preguntas.');
    ta.value = preguntas.map((p, i) => `${i + 1}. ${p.trim()}\nR:`).join('\n\n');
    toast(`${preguntas.length} preguntas generadas con IA`, 'ok');
  } catch (err) {
    toast(err.message, 'err');
    if (/CORS|Failed to fetch|NetworkError/i.test(err.message)) alert('No se pudo conectar con la API de Claude.\n\nSi abriste la app con doble clic (file://), el navegador puede bloquear la conexión. Avísame y te configuro una forma de abrirla que sí lo permita.');
  } finally {
    btn.disabled = false; btn.textContent = txtOrig;
  }
}

/* ---------- 15. Respaldo / Importar / Exportar CSV ---------- */
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportar() {
  const fecha = hoyISO();
  descargar(`respaldo_procesos_${fecha}.json`, JSON.stringify(State.procesos, null, 2), 'application/json');
  toast('Respaldo descargado', 'ok');
}
function exportarCSV() {
  const cols = ['key', ...TODOS_CAMPOS.filter(c => c !== 'reglamento' && c !== 'acta' && c !== 'textoActa')];
  const cab = cols.join(',');
  const filas = State.procesos.map(p => cols.map(c => {
    let v = (p[c] ?? '').toString().replace(/"/g, '""');
    return /[",\n]/.test(v) ? `"${v}"` : v;
  }).join(','));
  descargar(`procesos_${hoyISO()}.csv`, '﻿' + cab + '\n' + filas.join('\n'), 'text/csv');
  toast('CSV exportado', 'ok');
}
async function importar(e) {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error('formato');
    if (!confirm(`El respaldo tiene ${data.length} procesos. Se agregarán o actualizarán sobre los actuales. ¿Continuar?`)) return;
    for (const r of data) { if (!r.key) r.key = nuevaKey(); await DB.put('procesos', r); }
    State.procesos = await DB.all('procesos');
    toast(`${data.length} procesos restaurados`, 'ok'); irA('dashboard');
  } catch (err) { toast('Archivo inválido', 'err'); }
  e.target.value = '';
}

/* ---------- arranque ---------- */
init().catch(err => { console.error(err); document.getElementById('content').innerHTML = `<div class="empty"><div class="big">⚠️</div>Error al iniciar: ${esc(err.message)}</div>`; });
