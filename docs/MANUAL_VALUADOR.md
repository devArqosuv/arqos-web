# Manual del Valuador — ARQOS

**Rol:** Evaluador
**Versión:** 2026-04-16

---

## 1. Acceder al sistema

1. Abre **arqosuv.com** en el navegador
2. Haz click en "Iniciar sesión" (esquina superior derecha)
3. Ingresa tu email y contraseña
4. El sistema te lleva al **Panel del Valuador**

Si olvidaste tu contraseña, contacta al administrador.

---

## 2. Configura tu firma digital (una sola vez)

Antes de firmar cualquier avalúo debes subir tu firma:

1. En la barra superior, haz click en **"FIRMA"**
2. Sube una imagen PNG o JPG con tu firma (fondo transparente ideal)
3. Confirma — tu firma queda guardada en tu perfil

Esta imagen se insertará automáticamente en todos los PDF que firmes.

---

## 3. Flujo completo de un avalúo

### 3.1 Crear un expediente nuevo

1. Ve a **"AVALÚOS"** en la barra lateral
2. Click en **"+ Nuevo Avalúo"**
3. Selecciona el tipo:
   - **1.0 — Primera Enajenación**
   - **2.0 — Crédito Bancario** (selecciona banco)
4. Sube los documentos en los slots correspondientes:
   - Título Notarial (PDF)
   - Boleta Predial (PDF o imagen)
   - Identificación Oficial del propietario (INE)
   - Acreditación de Uso de Suelo (solo fuera de Querétaro)
5. Si el inmueble está en **Querétaro**, el sistema te muestra un dropdown con los usos de suelo disponibles. Selecciona el que aplique.
6. Click en **"Analizar"** — la IA (Claude) revisa los documentos y:
   - Identifica el tipo real de cada uno
   - Valida cruces de datos (nombres, superficies)
   - Verifica que la INE esté vigente
   - **Extrae y auto-llena 28 campos SHF** del expediente
7. Si la IA bloquea por alguna razón (ej. nombres no coinciden), puedes:
   - Corregir los documentos y reintentar
   - Hacer **Override Manual** con motivación escrita
8. Click en **"Guardar"** — se crea el expediente con folio automático (`PE-2026-0001` o `CR-2026-0001`)

### 3.2 Agendar visita

1. Abre el expediente desde **"EXPEDIENTES"**
2. Haz click en **"Agendar Visita"**
3. Selecciona fecha y hora
4. Guarda — el estado cambia a `agenda_visita`

### 3.3 Registrar visita realizada

1. Abre el expediente el día de la visita
2. Sube las **fotos obligatorias** (desde celular o cámara):
   - **1 foto de fachada**
   - **1 foto de portada**
   - **2 fotos de entorno**
   - **5–8 fotos de interior**
3. Asegúrate de que las fotos lleven **GPS activado** (lat, lng, accuracy)
4. Llena el formulario de **Verificación de servicios**:
   - Agua
   - Luz
   - Alumbrado público
   - Banquetas
   - Tipo de calles
   - Teléfono / internet
5. Click en **"Confirmar Visita"** — estado cambia a `visita_realizada`

### 3.4 Esperar al Controlador

Una vez confirmada la visita, el controlador se auto-asignará al expediente y generará el **Preavaluo** con comparables de mercado.

### 3.5 Revisar preavaluo y ajustar valor

1. Cuando el expediente esté en estado `preavaluo`, abre el detalle
2. Verás el **`valor_uv`** calculado por el controlador
3. Ingresa tu propio **`valor_valuador`** (puede ser igual o diferente al UV, con justificación)
4. Click en **"Enviar a Revisión"** — estado cambia a `revision`

### 3.6 Firma

Cuando el controlador apruebe la revisión:
1. Estado cambia a `firma`
2. El controlador firma primero
3. Cuando te toque, abre el expediente y haz click en **"Firmar y Generar PDF"**
4. Tu firma (la imagen que subiste) se inserta automáticamente
5. El PDF oficial se genera y el estado cambia a `aprobado`

---

## 4. Ver mis inmuebles

En **"INMUEBLES"** verás una vista tipo galería o lista de todos los inmuebles que has valuado, con:
- Tipo (con icono)
- Dirección
- Superficies
- Valor estimado
- Estado actual

Filtro por búsqueda de texto.

---

## 5. Analíticas

En **"ANALÍTICAS"** verás tus KPIs personales:
- Valor total valuado (acumulado)
- Valor promedio por avalúo
- Tasa de aprobación (%)
- Total de expedientes
- Gráfica de avalúos por mes
- Distribución por estado

---

## 6. Reportes (descarga de PDFs)

En **"REPORTES"** puedes:
- Ver la lista de tus avalúos **aprobados**
- Descargar el PDF oficial de cada uno
- Solo aprobados — los demás estados no generan reporte

---

## 7. Preguntas frecuentes

**¿Por qué la IA bloqueó mi expediente?**
Revisa que los nombres del propietario coincidan entre Título, Boleta y INE. La IA es flexible con el orden de nombres mexicanos pero marca bloqueo si los nombres son sustancialmente distintos. También verifica que la INE no esté vencida.

**¿Puedo subir documentos Excel (XLSX)?**
Sí. El sistema los convierte a Markdown automáticamente para que la IA los analice.

**¿Qué pasa si el controlador me devuelve el preavaluo?**
El estado regresa a `preavaluo` con un motivo escrito. Ajusta lo indicado y vuelve a enviar a revisión. El contador `devoluciones_count` se incrementa.

**¿Dónde veo el histórico de un expediente?**
Cada expediente tiene una pestaña "Historial" con todos los cambios de estado y comentarios.

**¿Puedo editar un avalúo ya aprobado?**
No. Los avalúos aprobados son inmutables. Si hay un error, debes crear un avalúo corregido con referencia al original.

---

## 8. Soporte

- **Email:** soporte@arqosuv.com
- **Ayuda dentro del sistema:** botón "AYUDA" en la barra lateral
