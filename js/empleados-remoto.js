/* ============================================================
   Empleados desde el CSV publicado (Google Sheets)
   ------------------------------------------------------------
   La lista de empleados (datos personales) NO se sube al repo
   público. En su lugar, la app la descarga en vivo desde el CSV
   publicado del Google Sheet y la deja en window.EMPLEADOS, que
   es lo que usa toda la aplicación.

   - Funciona igual en la web (GitHub Pages) y en localhost.
   - Si no hay internet, usa la última copia guardada (caché) o,
     en local, el archivo js/empleados.js si existe.
   - Para actualizar la base, basta con editar el Google Sheet.
   ============================================================ */
(function () {
  // Enlace "Publicar en la web → CSV" del Google Sheet (hoja de empleados)
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhcZDdAeeACcX0D5zVxGotVpA4vuTfkrlZAxFumqHwyfkoI9EvbYGjAv9mEkuOCpqYw6J3cQvrg3lh/pub?gid=0&single=true&output=csv';
  const CACHE_KEY = 'pd_empleados_cache_v1';

  // Encabezado del CSV  ->  campo que usa la app
  const MAP = {
    'ESTADO': 'estado',
    'FECHA DE INGRESO': 'fechaIngreso',
    'FECHA DE RETIRO': 'fechaRetiro',
    'CEDULA': 'cc',
    'FOTO': 'foto',
    'TIPO DE IDENTIFICACION': 'tipoId',
    'NOMBRE COMPLETO': 'nombre',
    'CENTRO DE TRABAJO': 'centroTrabajo',
    'FECHA DE NACIMIENTO': 'fechaNacimiento',
    'EDAD': 'edad',
    'SEXO DE IDENTIFICACION': 'sexo',
    'TIPO DE VINCULACION': 'tipoVinculacion',
    'TURNO DE TRABAJO': 'turno',
    'ESTADO CIVIL': 'estadoCivil',
    'CARGO FUNCIONARIO': 'cargo',
    'EMPRESA': 'empresa',
    'SALARIO': 'salario',
    'EPS': 'eps',
    'AFP': 'afp',
    'GRADO DE ESCOLARIDAD': 'escolaridad',
    'COMPOSICION FAMILIAR': 'composicionFamiliar',
    'NOMBRE CENTRO DE TRABAJO': 'area',
    'CORREO ELECTRONICO': 'correo',
    'NUMERO CELULAR': 'celular',
    'LUGAR DE RESIDENCIA': 'ciudad',
    'DIRECCION DE RESIDENCIA': 'direccion',
    'BARRIO': 'barrio',
    'MEDIO DE DESPLAZAMIENTO QUE UTILIZA IN-ITINERE': 'medioDesplazamiento',
    'TIENE QUE CONDUCIR PARA EL DESEMPENO DE SUS FUNCIONES': 'conduce',
    'QUE TIPO DE VEHICULO CONDUCE': 'tipoVehiculo',
    'RAZA': 'raza',
    'ANOS DE EXPERIENCIA EN CONDUCCION': 'aniosConduccion',
    'ESTRATO SOCIOECONOMICO': 'estrato',
    'TIPO DE SANGRE': 'tipoSangre',
    'AFILIADO': 'propietario',
    'NUMERO_INTERNO': 'interno',
    'VEHICULO_ASOCIADO': 'vehiculoAsociado',
    'RUTA': 'ruta'
  };

  // Normaliza encabezados: mayúsculas, sin tildes, espacios colapsados
  const norm = s => String(s || '').toUpperCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  // Mapa normalizado (para tolerar tildes/espacios distintos en el encabezado)
  const NMAP = {};
  Object.keys(MAP).forEach(k => { NMAP[norm(k)] = MAP[k]; });

  // Parser CSV robusto: respeta comillas (campos con comas, p.ej. salario "1,423,500")
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQ = false;
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Convierte el texto CSV en el arreglo de empleados que usa la app
  function csvAEmpleados(text) {
    const rows = parseCSV(text);
    if (!rows.length) return [];
    const cols = rows[0].map(h => NMAP[norm(h)] || null);  // campo destino por columna (o null si se ignora)
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const fila = rows[r];
      if (!fila || !fila.length) continue;
      const o = {};
      for (let c = 0; c < cols.length; c++) {
        const campo = cols[c];
        if (campo) o[campo] = (fila[c] != null ? String(fila[c]).trim() : '');
      }
      o.cc = String(o.cc || '').trim();
      if (!o.cc) continue;                 // sin cédula no sirve
      out.push(o);
    }
    return out;
  }

  // Descarga el CSV, lo convierte y lo deja en window.EMPLEADOS. Devuelve la cantidad cargada.
  async function cargarEmpleadosRemoto() {
    const local = Array.isArray(window.EMPLEADOS) ? window.EMPLEADOS.slice() : null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(CSV_URL, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const arr = csvAEmpleados(await res.text());
      if (!arr.length) throw new Error('CSV vacío');
      window.EMPLEADOS = arr;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(arr)); } catch (e) { /* cuota llena: no pasa nada */ }
      return arr.length;
    } catch (e) {
      console.warn('No se pudo cargar empleados del CSV:', e);
      // Respaldo 1: archivo local js/empleados.js (solo existe en el PC/localhost)
      if (local && local.length) return local.length;
      // Respaldo 2: última copia guardada en este navegador
      try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
        if (cache.length) { window.EMPLEADOS = cache; return cache.length; }
      } catch (e2) { /* nada */ }
      return 0;
    }
  }

  window.cargarEmpleadosRemoto = cargarEmpleadosRemoto;
})();
