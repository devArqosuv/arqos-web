# ARQOS — Arquitectura Técnica

**Versión:** 2026-04-16
**Mantenedor:** Paola Güemez

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + componentes propios |
| Base de datos | Supabase Pro (PostgreSQL 15) |
| Autenticación | Supabase Auth (email + password) |
| Storage | Supabase Storage (bucket `documentos`) |
| IA | OpenRouter API → Anthropic Claude Sonnet 4.5 |
| PDF | `@react-pdf/renderer` |
| XLSX | `xlsx` (SheetJS) |
| Deploy | Vercel (auto-deploy en push a `main`) |
| Dominio | arqosuv.com |

---

## 2. Estructura del repositorio

```
arqos-web/
├── app/
│   ├── (public)/                      # Rutas públicas
│   │   ├── landing/                   # Landing institucional
│   │   └── arqos-data/                # Portal público con IA
│   ├── dashboard/                     # App interna (requiere login)
│   │   ├── admin/                     # Panel administrador
│   │   │   ├── expedientes/
│   │   │   ├── tabla/                 # Tabla SHF 91 columnas
│   │   │   ├── tarifas/               # CRUD tarifas (nuevo)
│   │   │   ├── bancos/                # CRUD bancos (nuevo)
│   │   │   ├── usuarios/              # Gestión usuarios (nuevo)
│   │   │   ├── costos/                # Dashboard costos (nuevo)
│   │   │   ├── noticias/              # CRUD noticias (nuevo)
│   │   │   └── redes/                 # Redes sociales IA (nuevo)
│   │   ├── valuador/
│   │   │   ├── inicio/
│   │   │   ├── expedientes/
│   │   │   ├── inmuebles/
│   │   │   ├── analiticas/
│   │   │   └── reportes/
│   │   ├── controlador/
│   │   ├── firma/                     # Upload firma imagen
│   │   └── ayuda/                     # Página de ayuda (nuevo)
│   ├── api/                           # Route handlers
│   │   ├── analizar-avaluo/           # IA analiza docs + llena SHF
│   │   ├── estimar-valor/             # Portal público — estimación
│   │   ├── chat-valuacion/            # Chat streaming SSE
│   │   ├── guardar-estimacion/        # Lead capture
│   │   └── generar-contenido-redes/   # Generador IA social (nuevo)
│   ├── components/                    # Componentes compartidos
│   ├── login/
│   ├── auth/
│   ├── layout.tsx
│   └── page.tsx                       # Router inteligente (según auth)
├── supabase/
│   ├── migrations/                    # SQL numerado (01 → 15)
│   └── backup_schema_2026-04-13.sql
├── util/
│   ├── supabase/
│   │   ├── client.ts                  # Browser client
│   │   ├── server.ts                  # Server client
│   │   ├── middleware.ts              # Session refresh
│   │   └── dal.ts                     # requireRole helpers
│   ├── rate-limit.ts                  # (nuevo)
│   ├── openrouter.ts                  # (nuevo)
│   └── logger.ts                      # (nuevo)
├── types/
│   └── arqos.ts                       # Tipos compartidos
├── docs/                              # Este directorio
└── CLAUDE.md / AGENTS.md              # Instrucciones para IA
```

---

## 3. Productos en un solo codebase

1. **Landing institucional** en `/landing` — visitantes sin login
2. **App interna** en `/dashboard/*` — 3 roles (admin / valuador / controlador) con RLS
3. **ARQOS Data (portal público)** en `/arqos-data` — estimación IA + chat + lead capture

Router inteligente en `app/page.tsx`:
- Sin sesión → redirige a `/landing`
- Con sesión → redirige según rol:
  - `administrador` → `/dashboard/admin`
  - `evaluador` → `/dashboard/valuador/inicio`
  - `controlador` → `/dashboard/controlador`

---

## 4. Base de datos

### Tablas principales (ver `project_database_schema.md` para esquema completo)

- **`perfiles`** (= `auth.users.id`) — datos del usuario, rol, `firma_imagen_url`
- **`avaluos`** — tabla central con ~100 columnas (datos generales + 50 campos SHF + workflow)
- **`documentos`** — archivos subidos por expediente
- **`comparables`** — comparables de mercado por expediente
- **`bancos`** + **`banco_documentos`** — catálogo de bancos y sus requisitos
- **`usos_suelo_qro`** — catálogo Querétaro
- **`workflow_estados`** + **`workflow_transiciones`** — definición del flujo
- **`avaluo_historial`** — log de transiciones de estado
- **`notificaciones`** — bandeja de avisos (pendiente activar envío)
- **`estimaciones_portal`** — leads del portal público (migración 12)
- **`tarifas`** — catálogo de precios por tipo/rango (migración 13)
- **`configuracion_costos`** — dashboard admin (migración 13)
- **`noticias`** — tablón interno (migración 14)
- **`publicaciones_redes`** — redes sociales IA (migración 15)

### Vistas

- **`vw_avaluos_dashboard`** — join listo para paneles con nombres resueltos
- **`vw_estadisticas_evaluadores`** — KPIs por valuador

### Enums clave

- **`estado_avaluo`** — 9 valores del workflow
- **`rol_usuario`** — administrador / evaluador / controlador
- **`tipo_inmueble`** — casa, departamento, local_comercial, oficina, terreno, bodega, nave_industrial, otro
- **`tipo_noticia`** — info, actualizacion, alerta, mantenimiento
- **`plataforma_red`** — linkedin, instagram, facebook, x, tiktok
- **`estado_publicacion`** — borrador, en_revision, aprobada, programada, publicada, archivada

### RLS

Todas las tablas sensibles tienen Row Level Security. Patrón recurrente:
- Cada rol ve solo lo suyo (`valuador_id = auth.uid()` o `controlador_id = auth.uid()`)
- Admin ve todo (subquery sobre `perfiles.rol = 'administrador'`)
- Portal público inserta en `estimaciones_portal` como `anon` — admin lee

---

## 5. Flujo del avalúo (9 estados)

```
solicitud → captura → agenda_visita → visita_realizada → preavaluo → revision → firma → aprobado
                                                              ↑         ↓
                                                              └─ devolución (motivo)
                                                    rechazado ←── (desde revision)
```

Cambios de estado vía funciones RPC:
- `fn_cambiar_estado_avaluo(id, nuevo_estado, user, comentario)`
- `fn_devolver_a_preavaluo(id, user, motivo)`
- `fn_generar_folio(tipo)` — `PE-2026-0001` o `CR-2026-0001`

Cada transición valida contra `workflow_transiciones` y registra en `avaluo_historial`.

---

## 6. APIs

### `/api/analizar-avaluo` (interno, autenticado)

Valuador sube PDFs a Storage → llama este endpoint con los paths. El servidor:
1. Descarga los archivos de Storage (no del FormData, evita 413)
2. Convierte XLSX → Markdown si aplica
3. Envía a Claude Sonnet 4.5 (contenido multimodal)
4. La IA devuelve JSON con 38 campos consolidados
5. 28 de esos campos se mapean a `avaluos` al crear el expediente

Límite de body: 4MB (configurado en `next.config.ts`).

### `/api/estimar-valor` (público, rate-limited 10/h por IP)

Portal público ARQOS Data. Recibe dirección + tipo + m² + recámaras → Claude genera rango de valor + justificación + factores.

### `/api/chat-valuacion` (público, rate-limited 30/h por IP)

Streaming SSE con Claude para refinar la estimación del portal (chat conversacional).

### `/api/guardar-estimacion` (público, rate-limited 5/h por IP)

Persiste lead en `estimaciones_portal` antes de mostrar el resultado.

### `/api/generar-contenido-redes` (admin)

Genera posts para redes sociales con Claude — LinkedIn / Instagram / X / Facebook / TikTok.

---

## 7. Auto-llenado IA (28 campos SHF)

El prompt de `analizar-avaluo` extrae **38 campos** de los documentos y la creación del expediente mapea **28 de esos campos** directamente a columnas SHF de `avaluos`:

- 20 campos textuales (propietario, situación legal, descripción, etc.)
- 8 numéricos (superficies, valor catastral, recámaras, baños, etc.)
- `tipo_inmueble` auto-detectado
- `uso_suelo` como fallback si no hay selección manual
- `calle / colonia / municipio / estado_inmueble / cp` desde la dirección desglosada

Los ~22 campos SHF restantes son de análisis posterior (enfoques de valuación, conciliación, declaraciones) y requieren UI específica (ver roadmap Nivel 1B).

---

## 8. Storage

Bucket `documentos` organizado así:

```
documentos/
├── temp/{tempId}/...              # Durante upload + análisis IA
├── avaluos/{avaluoId}/
│   ├── docs/...                   # Documentos del expediente
│   ├── fotos/...                  # Fotos de visita (GPS)
│   └── pdf/avaluo-{folio}.pdf     # PDF oficial firmado
└── firmas/{userId}/firma-*.png    # Imagen de firma del valuador
```

Signed URLs con expiración de 1h (refrescables).

---

## 9. Seguridad

- **Auth:** Supabase Auth con email/password
- **RLS:** activo en todas las tablas con datos sensibles
- **Storage:** policies por bucket, signed URLs
- **Rate limiting:** in-memory por IP en endpoints públicos (10/h, 30/h, 5/h)
- **OpenRouter retries:** 3 intentos con backoff exponencial
- **Env vars:** `.env.local` — NUNCA se commitea. Prod en Vercel.

---

## 10. Deploy

1. Push a `main` en GitHub (`devArqosuv/arqos-web`)
2. Vercel detecta y despliega automáticamente
3. Dominio `arqosuv.com` apunta a Vercel

### Variables de entorno requeridas (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://oeoopbqndgnxrlldyzeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENROUTER_API_KEY=...
```

### Aplicar migraciones

Las migraciones NO se aplican automáticamente. Proceso manual:

1. Entrar a Supabase Dashboard → SQL Editor
2. Copiar el contenido de `supabase/migrations/NN_name.sql`
3. Ejecutar
4. Verificar con `SELECT * FROM tabla_nueva LIMIT 1;`

---

## 11. Usuarios de prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@prueba.com | 12345 | administrador |
| valuadores@prueba.com | 12345 | evaluador |
| controladores@prueba.com | 12345 | controlador |

---

## 12. Limitaciones actuales (abril 2026)

- Preavaluo solo calcula promedio simple (falta enfoque físico, ingresos, conciliación)
- Firma nivel 1 (imagen) — falta FIEL + NOM-151
- Sin integración SHF Web Service SMA
- Sin pagos SPEI ni Facturapi
- Notificaciones: tabla existe, sin envío de email
- Sin paginación real (limitado a 20 por lista — en progreso)

Ver `project_roadmap.md` y `project_pending_work.md` en `.claude/projects/.../memory/` para el detalle completo.

---

## 13. Convenciones de código

- TypeScript estricto (no `any` salvo justificado)
- Server components por default; `'use client'` solo donde hace falta interactividad
- Server Actions para mutaciones (con `'use server'`)
- Shape de responses: `{ ok: true, data?: T } | { ok: false, error: string }`
- Design tokens:
  - Primary: `#0F172A` (slate-900)
  - Background: `bg-[#F8FAFC]`
  - Borders: `border-slate-200`
  - Radius: `rounded-2xl` para cards, `rounded-xl` para inputs/botones
  - Labels: `text-[10px] font-bold uppercase tracking-widest text-slate-400`
  - Títulos: `text-2xl font-black tracking-tight text-slate-900`

---

## 14. Para contribuir

Lee `CLAUDE.md` y `AGENTS.md` en la raíz. Para entender el estado actual del proyecto y qué falta, lee:

- `project_roadmap.md`
- `project_pending_work.md`
- `project_avaluo_lifecycle.md`
- `project_database_schema.md`
- `project_ia_analysis.md`
- `project_upload_architecture.md`

Todos están en `/Users/paolaguemez/.claude/projects/-Users-paolaguemez-Desktop-arqos-arqos-web/memory/`.
