# Manual del Controlador — ARQOS

**Rol:** Controlador
**Versión:** 2026-04-16

---

## 1. Qué hace un Controlador

El controlador es la figura de calidad. Su responsabilidad es:

1. Auto-asignarse expedientes cuando el valuador termina la visita
2. Buscar comparables de mercado y generar el **Preavaluo**
3. Revisar el valor ajustado que propone el valuador
4. Aprobar, devolver o rechazar el expediente
5. Firmar el dictamen oficial

---

## 2. Acceder al sistema

1. Abre **arqosuv.com** → "Iniciar sesión"
2. Ingresa email y contraseña
3. El sistema te redirige al **Panel del Controlador**

---

## 3. Configura tu firma digital

Igual que el valuador:

1. Click en **"FIRMA"** en la barra superior
2. Sube una imagen PNG o JPG con tu firma
3. Guarda — se usará en todos los PDF que firmes

---

## 4. Flujo de revisión

### 4.1 Auto-asignarse un expediente

1. Ve a **"EXPEDIENTES"**
2. Filtra por estado `visita_realizada` — estos son los que esperan preavaluo
3. Abre uno y haz click en **"Auto-asignarme"**
4. El sistema registra que eres el controlador de ese expediente

### 4.2 Agregar comparables

1. En el expediente asignado, ve a la sección **"Comparables"**
2. Click en **"+ Agregar comparable"**
3. Llena:
   - Dirección
   - Municipio
   - Superficie de terreno
   - Superficie de construcción
   - Precio total
   - Precio por m² (se puede calcular)
   - Fuente (Vivanuncios, Inmuebles24, etc.)
   - URL de la fuente (opcional)
   - Fecha de publicación
4. Agrega mínimo **3 comparables** (recomendado 4–6)

### 4.3 Generar preavaluo

1. Click en **"Generar Preavaluo"**
2. El sistema calcula `valor_uv = promedio(precio_m2 de comparables) × superficie_construccion`
3. Estado cambia a `preavaluo`

**Nota:** El cálculo actual es un promedio simple. Las fases futuras incluirán los 3 enfoques SHF (físico, mercado, ingresos) con conciliación ponderada.

### 4.4 Revisar el valor del valuador

Cuando el valuador envíe a revisión (estado `revision`):

1. Abre el expediente
2. Compara `valor_uv` (tu cálculo) contra `valor_valuador`
3. Decide:
   - **Aprobar** → estado pasa a `firma`
   - **Devolver** → estado vuelve a `preavaluo` con motivo escrito (el valuador ajusta)
   - **Rechazar** → estado pasa a `rechazado` (termina el flujo)

### 4.5 Firmar

En estado `firma`:

1. Abre el expediente
2. Click en **"Firmar como UV"**
3. Tu firma se registra (`firmado_uv = true`, `fecha_firma_uv = now`)
4. El valuador firma después y se genera el PDF oficial
5. Estado cambia a `aprobado`

---

## 5. Analíticas del controlador

En **"ANALÍTICAS"** verás:
- Total de expedientes revisados
- Aprobados vs. rechazados
- Tasa de aprobación
- Valor total aprobado (MXN)
- Actividad por mes (gráfica apilada)
- Pendientes ahora

---

## 6. Preguntas frecuentes

**¿Por qué no veo el expediente X en mi lista?**
Probablemente aún está en captura o agenda de visita (lo maneja el valuador). Aparece cuando llega a `visita_realizada`.

**¿Puedo agregar comparables después de generar el preavaluo?**
Sí, hasta que el expediente pase a estado `aprobado`. Después de eso, el dictamen es inmutable.

**¿Qué es una devolución?**
Es regresar el expediente al estado `preavaluo` con un motivo escrito para que el valuador ajuste. No es un rechazo. El contador `devoluciones_count` sube.

**¿Puedo firmar antes que el valuador?**
Sí, el orden es: controlador firma primero → valuador firma y se genera PDF.

---

## 7. Soporte

- **Email:** soporte@arqosuv.com
- **Ayuda dentro del sistema:** botón "AYUDA" en la barra lateral
