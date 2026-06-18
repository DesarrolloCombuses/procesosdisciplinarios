# Procesos Disciplinarios · COMBUSES S.A.

Aplicación web para la gestión de procesos disciplinarios de COMBUSES S.A.
(empresa de transporte, Medellín, Colombia). Permite registrar procesos,
generar documentos (citaciones, descargos, decisiones), recoger **firmas
electrónicas** (Ley 527/1999 y Decreto 2364/2012) y archivar todo en la nube.

> ⚠️ **Privacidad (Ley 1581/2012 – Habeas Data):** este repositorio contiene
> **solo el código**. Los datos personales de los empleados y los expedientes
> disciplinarios **NO** se publican: están excluidos en `.gitignore` y viven en
> Supabase con autenticación y políticas de seguridad (RLS).

## 🧩 Arquitectura

- **Frontend:** HTML/CSS/JavaScript puro (sin framework ni compilación). PWA.
- **Backend de datos:** [Supabase](https://supabase.com) (PostgreSQL + Auth +
  Storage). Todo se guarda en la nube; nada queda local.
- **Generación de PDF:** servidor local en Python (`server.py`) que usa Microsoft
  Edge en modo *headless* para imprimir el documento a PDF.
- **Notificaciones:** envío del documento por WhatsApp/correo vía Pabbly Connect + WATI.

## 👥 Roles

| Rol           | Acceso                                                              |
| ------------- | ------------------------------------------------------------------ |
| `admin`       | Todo. Revisa solicitudes, genera citaciones, administra usuarios.  |
| `solicitante` | Jefes de área. Crean solicitudes de descargo con pruebas.         |
| `operador`    | Recogen firmas de los citados (portal de firma).                   |

## 🚀 Puesta en marcha (local)

> Por seguridad, este repositorio **no incluye** las credenciales, el webhook ni
> el arrancador local. Debes crearlos a partir de las plantillas `*.example.js`.

1. Instalar [Python 3](https://www.python.org/) y tener Microsoft Edge.
2. Crear los archivos de configuración a partir de las plantillas:
   - Copiar `js/supabase-config.example.js` → `js/supabase-config.js` y poner tu
     URL y *publishable key* de Supabase.
   - Copiar `js/notificaciones.example.js` → `js/notificaciones.js` y poner tu
     webhook de Pabbly (opcional).
3. Crear los archivos de datos locales (no incluidos por privacidad):
   - `js/empleados.js` — catálogo de empleados para autocompletar.
   - `js/datos_procesos.js` — semilla opcional de procesos.
4. Servir los archivos estáticos con cualquier servidor web local
   (la generación de PDF usa un pequeño servidor en Python que se mantiene
   privado y no se publica en este repositorio).

## 🗄️ Base de datos

Los scripts SQL para crear las tablas en Supabase están en la carpeta [`sql/`](sql/).
Todas las tablas usan el prefijo `pd_` para no chocar con otras apps del mismo
proyecto Supabase.

## 📄 Documentos generados

- Citación a descargos
- Diligenciamiento de descargos
- Decisión / sanción

Cada documento se genera en PDF, se archiva en Supabase Storage y puede enviarse
al empleado por WhatsApp o correo.

## 🔐 Seguridad

- Autenticación por correo y contraseña (Supabase Auth).
- Políticas RLS por rol.
- La *publishable key* de Supabase es pública por diseño; la seguridad real está
  en RLS + Auth. **Nunca** se publica la `service_role` ni claves secretas.

---

© COMBUSES S.A. — Uso interno.
