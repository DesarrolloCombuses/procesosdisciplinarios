# Plan del Sistema · Procesos Disciplinarios COMBUSES S.A.

Documento de referencia. Resume cómo está armado el sistema y hacia dónde va.

---

## 1. Arquitectura (las 3 piezas)
| Pieza | Qué es | Dónde vive |
|---|---|---|
| El programa | La app (pantallas, formularios) | Navegador |
| Servidor local (`server.py`) | Sirve la app y **genera los PDF** (con Edge) | PC, puerto **8780** |
| La nube (Supabase) | Donde **viven los datos** | Internet |

> Los datos viven en la nube. El servidor local solo se necesita para generar PDFs.

---

## 2. Roles (usuarios del sistema)
| Rol | Quién | Qué hace |
|---|---|---|
| **Administrador** | Coordinación | Todo: revisa solicitudes, **genera citaciones**, ve todo |
| **Solicitante** | Jefes / supervisores de área | Crea solicitudes con pruebas; ve **solo las suyas** |
| **Operador de firma** (testigo) | Personas que recogen firmas | Busca al citado, le hace **leer y firmar**; si no firma, registra el **motivo** y firma como testigo |

> El **citado (empleado) NO es usuario**. Solo lee y firma en el dispositivo del operador.

---

## 3. Flujo completo
```
SOLICITANTE (jefe)                    ADMINISTRADOR                  OPERADOR DE FIRMA
─────────────────                     ─────────────                 ─────────────────
Nueva solicitud
(cédula → autollena,
 hechos, falta, PRUEBAS)  ─────►  Bandeja de solicitudes
                                  Revisa y ajusta
                                  GENERA CITACIÓN  ─────►  Busca al citado por cédula
                                  (descargos, sanción…)    El citado LEE y FIRMA
                                                           (si no firma: motivo + firma testigo)
```

---

## 4. Evidencia de cada firma (valor legal)
Por cada firma se guarda: fecha/hora **del servidor**, cédula y nombre, imagen de la firma,
tipo de documento, **huella del documento** (integridad), dispositivo + IP,
**quién operó/supervisó**, estado (firmó / no firmó / ausente) y **motivo** si no firma.
Base legal: Ley 527/1999 y Decreto 2364/2012.

---

## 5. Estado actual
| | Parte | Estado |
|---|---|---|
| ✅ | Login y seguridad (RLS) | Listo |
| ✅ | Procesos en la nube (leer + guardar, con respaldo local) | Listo (en prueba) |
| ✅ | Generar PDFs | Listo |
| ✅ | Portal de firma (versión local) con lectura antes de firmar y filtro de fecha | Listo |
| ⏳ | Roles + Solicitudes + Pruebas en Storage + Bandeja admin | Pendiente |
| ⏳ | Portal de firma en la nube + evidencia | Pendiente |
| ⏳ | Notificaciones (correo + WhatsApp/SMS) | Pendiente |

---

## 6. Roadmap (orden de construcción)
1. **Procesos en la nube** — ✅ hecho (confirmar en pruebas)
2. **Roles + Solicitudes** — cuentas de jefes, formulario de solicitud, **fotos/videos en Storage privado**, bandeja del admin
3. **Portal de firma en la nube + evidencia** — operador con sesión, firma del citado, motivo/testigo si no firma
4. **Notificaciones** — correo + WhatsApp/SMS (requiere cuentas de servicios externos)

---

## 7. Decisiones ya tomadas
- **Firma:** presencial (tablet/PC de oficina), operada por un usuario con sesión.
- **Notificación:** correo + WhatsApp/SMS (última etapa).
- **Testigo:** firma solo cuando el citado no firma o está ausente.
- **Solicitantes:** jefes/supervisores de área.
- **Visibilidad del solicitante:** solo sus propias solicitudes.
- **Admin ante una solicitud:** la revisa, ajusta y genera la citación.
- **Operadores de firma:** rol aparte, cada uno con su propio usuario.
- **GitHub:** repositorio público, pero **sin datos personales** (`.gitignore` excluye empleados y procesos).

---

## 8. Datos técnicos
- Supabase URL: `https://cbplebkmxrkaafqdhiyi.supabase.co`
- Tabla principal: `procesos_disciplinarios` (columna `datos jsonb` = proceso completo; RLS activo)
- App: puerto local **8780** (`http://localhost:8780/index.html`)
- Configuración nube documentada en `sql/01_configuracion_nube.sql`
