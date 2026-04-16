# Manual del Administrador — ARQOS

**Rol:** Administrador
**Versión:** 2026-04-16

---

## 1. Qué hace el Administrador

El administrador tiene acceso completo al sistema. Sus responsabilidades:

1. Gestionar **usuarios** (valuadores y controladores)
2. Mantener **catálogos** (tarifas, bancos, tipos de avalúo)
3. Supervisar **todos los expedientes**
4. Ver la **tabla SHF maestra** (91 columnas) y exportar a Excel
5. Publicar **noticias** al equipo
6. Gestionar **redes sociales** con IA
7. Monitorear **costos** de servicios
8. Administrar **leads** del portal público

---

## 2. Panel Admin

Al iniciar sesión como administrador, entras a `/dashboard/admin` donde verás:

- Lista de usuarios institucionales
- Proyectos aprobados recientes
- KPIs generales

Desde la barra lateral tienes acceso a todas las secciones.

---

## 3. Gestión de usuarios

**Ruta:** `/dashboard/admin/usuarios`

### Lo que puedes hacer
- Ver la lista completa de usuarios (admin, evaluadores, controladores)
- **Activar/desactivar** un usuario (no se borra, solo deja de acceder)
- **Cambiar rol** de un usuario existente
- Filtrar por rol
- Buscar por nombre o email

### Lo que NO puedes hacer desde la UI
- Crear usuarios nuevos (debe hacerse directo desde Supabase Auth para mayor seguridad)
- Cambiar contraseñas (cada usuario lo hace desde su perfil)

---

## 4. Catálogos

### 4.1 Tarifas — `/dashboard/admin/tarifas`

Define el precio por tipo de avalúo y rango de valor del inmueble.

- **Tipo de avalúo:** 1.0 (primera enajenación) o 2.0 (crédito bancario)
- **Nombre:** descriptivo, ej. "1.0 Vivienda Media"
- **Rango valor:** mínimo y máximo del inmueble
- **Precio:** lo que se cobra al cliente
- **Activa:** toggle para habilitar/deshabilitar sin borrar

### 4.2 Bancos — `/dashboard/admin/bancos`

Catálogo de bancos con los que ARQOS tiene convenio (para avalúos tipo 2.0).

Por cada banco puedes agregar los **documentos obligatorios** que piden (ej. BBVA pide "Acta de matrimonio notariada").

### 4.3 Noticias — `/dashboard/admin/noticias`

Publicaciones que aparecen en el panel de los usuarios.

- **Tipo:** info, actualización, alerta, mantenimiento
- **Destinatarios:** check el rol al que aplica (admin/evaluador/controlador)
- **Fecha de expiración:** opcional — desaparece automáticamente después
- **Activa:** toggle

Las noticias aparecen en `/dashboard/valuador/inicio` y `/dashboard/controlador` según los destinatarios seleccionados.

---

## 5. Expedientes

**Ruta:** `/dashboard/admin/expedientes`

Ves **todos los expedientes** del sistema, sin importar a quién pertenecen.

### Acciones disponibles
- Ver detalle de cualquier expediente
- Filtrar por estado, tipo, fecha, valuador, controlador
- Exportar listado

---

## 6. Tabla SHF maestra

**Ruta:** `/dashboard/admin/tabla`

Vista de los **91 campos SHF** de todos los avalúos, agrupados en 11 secciones (Datos Generales, Ubicación, Marco Legal, etc.).

### Funcionalidad
- Buscador por folio / propietario / dirección
- Filtro por estado
- **Exportar a Excel** (XLSX) — descarga el archivo completo

---

## 7. Portal público — ARQOS Data

### Ver leads capturados

Los leads del portal público están en la tabla `estimaciones_portal` (acceso directo desde Supabase por ahora).

Cada lead incluye:
- Nombre, email, teléfono
- Dirección, tipo, superficie, recámaras
- Valor estimado por IA (rango)
- Chat de refinamiento (si lo usaron)
- Si solicitó avalúo formal
- Flag `atendida` para marcar como procesado

**Próximamente:** UI admin dedicada para gestionar leads y convertirlos en expedientes.

---

## 8. Redes Sociales con IA

**Ruta:** `/dashboard/admin/redes`

Módulo para generar contenido para LinkedIn, Instagram, X, Facebook y TikTok con IA.

### Tres vistas

**Generador:**
1. Selecciona plataforma
2. Escribe el tema
3. Elige el tono (profesional, cercano, educativo, promocional)
4. Click en "Generar con IA" → Claude devuelve título, contenido y hashtags
5. Edita si hace falta y guarda como borrador

**Lista:**
- Tabla con todas las publicaciones
- Filtros por plataforma y estado
- Acciones: Aprobar, Programar, Marcar como publicada, Archivar

**Calendario editorial:**
- Vista mensual
- Publicaciones programadas aparecen como chips de color por plataforma
- Click en un chip para ver detalle

### Estados de una publicación

```
borrador → en_revision → aprobada → programada → publicada
                                                  ↓
                                               archivada
```

**Importante:** el sistema NO publica automáticamente en las plataformas. "Publicada" es un estado manual que se marca una vez que la persona publicó el contenido en la red social real. Publicación directa vía API se implementará en fases futuras.

---

## 9. Costos

**Ruta:** `/dashboard/admin/costos`

Dashboard con la estimación de costos mensuales de servicios:
- Supabase Pro
- Vercel Pro
- OpenRouter (Claude)
- Facturapi (pendiente integrar)
- Mapbox (pendiente integrar)

KPIs:
- Costo total mensual
- Costo anualizado (x12)
- Costo promedio por avalúo (dividiendo entre expedientes del mes)

Los montos son editables desde la misma UI.

---

## 10. Firma digital del admin

Igual que los demás roles, sube tu firma desde el botón "FIRMA" en la barra superior. Si firmas un expediente como administrador, tu firma se usa.

---

## 11. Preguntas frecuentes

**¿Cómo creo un nuevo usuario?**
Actualmente se hace desde Supabase Dashboard → Authentication → Users → Invite. Luego el usuario aparece en `/dashboard/admin/usuarios` y puedes asignarle el rol correcto.

**¿Puedo asignar un expediente manualmente a un valuador?**
No, el valuador crea sus propios expedientes. El controlador se auto-asigna cuando llega a `visita_realizada`. El bolillero automático está pendiente.

**¿Cómo cambio el precio de un avalúo ya creado?**
El precio en `tarifas` solo define el precio para **nuevos** avalúos. Los ya creados mantienen su precio original si se llegó a registrar.

**¿Cómo apruebo un expediente?**
El admin no aprueba expedientes. Esa función es del controlador. Si quieres intervenir, puedes abrir el expediente y forzar un cambio de estado (solo si es necesario — registrado en audit).

---

## 12. Soporte

- **Email técnico:** soporte@arqosuv.com
- **Documentación técnica:** `/docs/ARQUITECTURA.md` en el repositorio
- **Ayuda dentro del sistema:** botón "AYUDA" en la barra lateral
