import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

// Formato de contenido OpenAI-compatible usado por OpenRouter
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; file: { filename: string; file_data: string } }
  | { type: 'image_url'; image_url: { url: string } };

// MIME types permitidos para análisis con IA
const MIME_PERMITIDOS: Record<string, string> = {
  pdf:  'application/pdf',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
};

// Convierte un buffer XLSX/XLS a texto Markdown legible para la IA.
// Cada hoja se renderiza como una sección con su nombre + tabla CSV.
function xlsxBufferToMarkdown(buffer: ArrayBuffer): string {
  const wb = XLSX.read(buffer, { type: 'array' });
  const partes: string[] = [];
  for (const nombreHoja of wb.SheetNames) {
    const hoja = wb.Sheets[nombreHoja];
    const csv = XLSX.utils.sheet_to_csv(hoja, { blankrows: false }).trim();
    if (!csv) continue;
    partes.push(`### Hoja: ${nombreHoja}\n\n${csv}`);
  }
  return partes.length > 0 ? partes.join('\n\n') : '(hoja de cálculo vacía)';
}

function detectarMime(fileName: string, fallback: string): string {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return MIME_PERMITIDOS[ext] ?? fallback;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY no está configurada en el servidor.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const tipoAvaluo = formData.get('tipoAvaluo') as string;
    const files = formData.getAll('pdfs') as File[];
    const docIds = formData.getAll('docIds') as string[];
    const docNombres = formData.getAll('docNombres') as string[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos.' }, { status: 400 });
    }
    if (!tipoAvaluo || !['1.0', '2.0'].includes(tipoAvaluo)) {
      return NextResponse.json({ error: 'Tipo de avalúo inválido.' }, { status: 400 });
    }

    // Convertir cada archivo. Para PDF/imagen → base64. Para XLSX → texto Markdown server-side.
    const documentos = await Promise.all(
      files.map(async (file, index) => {
        const bytes = await file.arrayBuffer();
        const mime = detectarMime(file.name, file.type || 'application/octet-stream');
        const esExcel =
          mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          mime === 'application/vnd.ms-excel';
        return {
          id: docIds[index],
          nombre: docNombres[index],
          fileName: file.name,
          mime,
          // Sólo guardamos base64 cuando es PDF/imagen (lo necesita el contenido multimodal)
          base64: esExcel ? null : Buffer.from(bytes).toString('base64'),
          // Sólo convertimos a Markdown cuando es Excel
          markdown: esExcel ? xlsxBufferToMarkdown(bytes) : null,
        };
      })
    );

    // Validar que todos los archivos sean de un formato soportado
    const formatoInvalido = documentos.find(
      (d) => !Object.values(MIME_PERMITIDOS).includes(d.mime)
    );
    if (formatoInvalido) {
      return NextResponse.json(
        { error: `Formato no soportado en ${formatoInvalido.fileName}. Solo se aceptan PDF, JPG, PNG o XLSX.` },
        { status: 400 }
      );
    }

    // Construir el contenido multimodal: cada doc etiquetado + PDF como `file`, imagen como `image_url`, XLSX como texto
    const contentBlocks: ContentPart[] = [];

    for (const doc of documentos) {
      contentBlocks.push({
        type: 'text',
        text: `\n===== DOCUMENTO ${doc.id}: ${doc.nombre} (archivo: ${doc.fileName}) =====`,
      });

      if (doc.markdown !== null) {
        // Hoja de cálculo: la insertamos como bloque de texto tabular
        contentBlocks.push({
          type: 'text',
          text: `\n[Hoja de cálculo extraída del archivo ${doc.fileName}. Trátalo como datos tabulares — extrae las columnas/valores relevantes; no intentes validarlo como Título o Boleta]\n\n${doc.markdown}\n`,
        });
        continue;
      }

      const dataUrl = `data:${doc.mime};base64,${doc.base64}`;

      if (doc.mime === 'application/pdf') {
        contentBlocks.push({
          type: 'file',
          file: { filename: doc.fileName, file_data: dataUrl },
        });
      } else {
        // image/jpeg o image/png
        contentBlocks.push({
          type: 'image_url',
          image_url: { url: dataUrl },
        });
      }
    }

    contentBlocks.push({
      type: 'text',
      text: `
Eres un perito valuador experto en avalúos bancarios mexicanos. Recibirás ${documentos.length} documentos (PDF o imágenes JPG/PNG) de un expediente de avalúo tipo ${tipoAvaluo} y debes analizarlos con criterios profesionales ESTRICTOS. Tu trabajo es proteger al banco y al cliente de fraudes y errores: PREFIERE BLOQUEAR un expediente válido que dejar pasar uno inválido.

═══════════════════════════════════════════════════════════════
REGLA NÚMERO UNO — INDISPENSABLE — IDENTIFICACIÓN DE TIPO
═══════════════════════════════════════════════════════════════

Antes de extraer ningún dato, para CADA documento debes ejecutar estos pasos en orden:

PASO A — IDENTIFICAR EL TIPO REAL DEL ARCHIVO:
NO asumas que el archivo es lo que dice el slot del sistema. Examina el contenido visual:
  • Header / título / membrete (gobierno, notaría, banco, utility company, dependencia)
  • Logos y sellos oficiales
  • Estructura visual (tarjeta plástica, recibo, hoja notarial, mapa, foto, hoja de cálculo)
  • Etiquetas de los campos y la palabra clave del documento

GUÍA DE TIPOS COMUNES EN AVALÚOS MEXICANOS:

  ▸ TÍTULO DE PROPIEDAD / ESCRITURA PÚBLICA:
    - Documento NOTARIAL formal emitido por un notario público mexicano
    - Header con escudo nacional, nombre del notario, número de notaría
    - Estructura: "PRIMERA.-...", "SEGUNDA.-...", "ANTECEDENTES", "ESTIPULACIONES"
    - Menciona explícitamente "ESCRITURA", "TÍTULO DE PROPIEDAD" o "COMPRAVENTA"
    - Número de escritura, número de volumen, fojas, fecha, RPP/RPPC
    - Sello del notario y firma
    - Suele ser de varias páginas
    - NO confundir con: solicitud de crédito, aviso de instrucción, oficio, mapa, foto

  ▸ BOLETA PREDIAL / CÉDULA CATASTRAL:
    - Recibo o constancia oficial del MUNICIPIO o catastro estatal
    - Header de la Tesorería Municipal o dependencia de Catastro
    - Tiene la palabra "PREDIAL", "IMPUESTO PREDIAL", "CÉDULA CATASTRAL" o "BOLETA PREDIAL" en el header
    - Contiene CLAVE CATASTRAL (formato: 14-001-001-178-7017 o similar 14 dígitos)
    - Muestra periodos de pago (bimestres/anualidad), importes, recargos, descuentos
    - Nombre del propietario empadronado y dirección del inmueble
    - NO confundir con: mapa de macrolocalización, plano arquitectónico, recibo de agua/luz, foto del terreno

  ▸ IDENTIFICACIÓN OFICIAL (INE / IFE / Pasaporte / Cédula Profesional):
    - DEBE ser una credencial oficial reconocida en México
    - INE/IFE: tarjeta plástica horizontal con FOTO del titular, nombre, CURP, clave de elector, domicilio, fecha de nacimiento, fecha de vigencia explícita, código QR/MRZ
    - Pasaporte: libreta con header de SRE, foto, datos personales, vigencia
    - Cédula profesional: tarjeta SEP con foto, profesión, número
    - REQUISITO ABSOLUTO: debe tener FOTO del titular y FECHA DE VIGENCIA visible
    - NO confundir con: solicitud de crédito, formulario, hoja de Excel, oficio, recibo

  ▸ ACREDITACIÓN DE USO DE SUELO:
    - Constancia OFICIAL emitida por la dirección de Desarrollo Urbano municipal o dependencia equivalente
    - Header con escudo del municipio o estado, nombre de la dependencia ("DESARROLLO URBANO", "CATASTRO", "PLANEACIÓN URBANA")
    - Menciona explícitamente "USO DE SUELO" y la categoría (habitacional / comercial / mixto / industrial)
    - Tiene número de constancia, vigencia, sello oficial, firma del director
    - NO confundir con: recibo de agua (CEA, JAPAC, JMAS), recibo de luz (CFE), comprobante de domicilio, mapa, foto

  ▸ COMPROBANTE DE SERVICIO (agua, luz, gas):
    - Recibo de utility company (CEA, CFE, JAPAC, JMAS, etc.)
    - Logo del proveedor en header
    - Periodo de servicio, consumo, importes
    - NO es un comprobante de uso de suelo aunque mencione la dirección

  ▸ MACROLOCALIZACIÓN / PLANO / MAPA:
    - Imagen aérea o esquema con líneas y polígonos
    - NO es Boleta Predial, NO es Título, NO es Identificación

  ▸ HOJA DE CÁLCULO (XLSX/XLS):
    - Datos tabulares con filas y columnas
    - NUNCA puede ser un Título, Boleta, Identificación o Acreditación oficial
    - Si aparece en un slot que requiere documento oficial → ERROR BLOQUEANTE inmediato

PASO B — COMPARAR TIPO DETECTADO VS SLOT:
Cada documento llega etiquetado con un slot del sistema (ej: "DOCUMENTO 1.2: Boleta Predial").
  • Si el slot pide "Boleta Predial" pero detectaste un mapa de macrolocalización → marca el documento como NO VÁLIDO con error: "El archivo subido en el slot 'Boleta Predial' es un MAPA DE MACROLOCALIZACIÓN, no una boleta predial. El expediente no puede continuar hasta que se suba la boleta correcta."
  • Si el slot pide "Acreditación de uso de suelo" pero detectaste un recibo de la CEA o CFE → marca el documento como NO VÁLIDO con error: "El archivo subido en el slot 'Acreditación de uso de suelo' es un RECIBO DE [SERVICIO], no una constancia oficial de uso de suelo. Sube la constancia emitida por Desarrollo Urbano municipal."
  • Si el slot pide "Identificación oficial" pero detectaste una solicitud, hoja Excel, o cualquier cosa que no sea INE/IFE/Pasaporte/Cédula Profesional con foto → ERROR BLOQUEANTE.
  • Si el slot pide "Título de Propiedad" pero detectaste un oficio, formato, recibo, o documento sin sello notarial → ERROR BLOQUEANTE.

CADA mismatch de tipo es ERROR BLOQUEANTE individual del documento Y suma a errores_bloqueantes a nivel raíz. No los enmascares.

PASO C — SOLO SI EL TIPO COINCIDE, procede a extraer datos y validar criterios cruzados (siguientes reglas).

═══════════════════════════════════════════════════════════════
CRITERIOS DE VALIDACIÓN CRUZADA (sólo aplican a docs con tipo correcto)
═══════════════════════════════════════════════════════════════

1. NOMBRE DEL PROPIETARIO:
   - Debe ser IDÉNTICO en el Título de Propiedad y la Boleta Predial/Cédula Catastral.
   - Acepta variaciones menores de formato (mayúsculas, orden de apellidos) pero el nombre debe corresponder a la misma persona.
   - Si no coincide → ERROR BLOQUEANTE.
   - CASO ESPECIAL: Si la identificación oficial del SOLICITANTE del crédito tiene un nombre DISTINTO al propietario actual del Título, eso indica una compraventa en proceso. DEBE existir además un documento que acredite la transmisión (contrato de compraventa, promesa, instrucción notarial). Si no está → ERROR BLOQUEANTE.

2. DIRECCIÓN/UBICACIÓN DEL INMUEBLE:
   - IMPORTANTE: En avalúos mexicanos, la dirección frecuentemente NO aparece en el mismo orden o formato entre Título y Boleta Predial.
   - Compara elementos clave: ejido/fraccionamiento + lote + manzana + municipio + superficie.
   - Si los elementos clave coinciden aunque el orden sea distinto → VÁLIDO.
   - Si claramente son inmuebles diferentes → ERROR BLOQUEANTE.

3. SUPERFICIE DEL TERRENO:
   - Debe coincidir entre Título y Boleta Predial.
   - Tolerancia: hasta 0.5 m² por redondeo.
   - Diferencia mayor → ADVERTENCIA (no bloqueante, va en observaciones).

4. CLAVE CATASTRAL:
   - Extraer de la Boleta Predial.
   - Verificar que corresponda al municipio indicado en el Título.

5. VIGENCIA DE IDENTIFICACIONES OFICIALES:
   - Hoy es ${new Date().toISOString().slice(0, 10)}.
   - Extrae la fecha de vigencia de cada INE/pasaporte/cédula.
   - VENCIDA → ERROR BLOQUEANTE. Menciona la fecha en el error.
   - Vence en menos de 30 días → ADVERTENCIA en observaciones.
   - Vigencia ilegible → ADVERTENCIA pidiendo verificación manual.

6. CALIDAD / LEGIBILIDAD:
   - Si un documento (que sí es del tipo correcto) está borroso, oscuro, cortado o pixelado de modo que no se pueden leer los campos clave → NO VÁLIDO con error: "Documento ilegible: [campos]. Se requiere mejor escaneo."
   - NO adivines valores ilegibles. Prefiere null en datos_extraidos.
   - Si más del 50% de los campos clave son ilegibles → ERROR BLOQUEANTE a nivel raíz.

INSTRUCCIÓN CRÍTICA SOBRE DIRECCIONES:
En México, especialmente en desarrollos ejidales y fraccionamientos nuevos, es NORMAL que la dirección aparezca diferente entre documentos. Enfócate en identificar: mismo ejido/fraccionamiento + mismo lote + misma manzana + mismo municipio. Si estos elementos coinciden, la dirección ES la misma aunque el formato sea completamente diferente.

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin backticks, sin texto extra, con la siguiente estructura:

{
  "valido": true | false,
  "errores_bloqueantes": [
    "Descripción clara del error bloqueante. Ej: 'El nombre del propietario en el Título de Propiedad (Juan García López) no coincide con el de la Boleta Predial (María González Ruiz). El expediente no puede continuar.'"
  ],
  "documentos": [
    {
      "id": "1.1",
      "nombre": "Título de Propiedad",
      "tipo_detectado": "Descripción concisa del tipo REAL detectado en el archivo, ej: 'Escritura notarial', 'Mapa de macrolocalización', 'Recibo CEA', 'Hoja de cálculo Excel', etc.",
      "tipo_coincide": true | false,
      "valido": true | false,
      "datos_extraidos": {
        "numero_titulo": "valor o null",
        "propietario": "nombre completo o null",
        "ubicacion": "dirección completa o null",
        "superficie": "con unidad o null",
        "fecha": "DD/MM/AAAA o null"
      },
      "errores": ["descripción del error si valido=false, array vacío si valido=true. Si tipo_coincide=false, el primer error DEBE explicar el mismatch de tipo"]
    }
  ],
  "datos_consolidados": {
    "propietario": "nombre del propietario confirmado o null",
    "ubicacion": "dirección del inmueble confirmada o null",
    "clave_catastral": "clave catastral o null",
    "superficie": "superficie total con unidad o null",
    "valor_estimado": "null (no aplica para validación documental)",
    "observaciones": "resumen de validación: documentos revisados, datos confirmados, advertencias no bloqueantes (ej. diferencia de superficie) y cualquier observación relevante"
  }
}

REGLAS CRÍTICAS DE SALIDA:
- Si CUALQUIER documento tiene "tipo_coincide": false → "valido" RAÍZ = false y debe haber al menos un mensaje en "errores_bloqueantes" explicando el mismatch.
- Nunca marques "tipo_coincide": true sin estar 100% seguro. Ante la duda → false.
- "valido" en el objeto raíz es false SOLO si hay al menos un ERROR BLOQUEANTE (mismatch de tipo, documento inválido, nombre distinto, inmueble diferente, identificación vencida, ilegible). Las ADVERTENCIAS no bloquean el expediente.
- "errores_bloqueantes" debe ser explícito: menciona los valores en conflicto para que el valuador sepa qué corregir. Array vacío si no hay errores bloqueantes.
- Las advertencias (ej. diferencia de superficie menor) van en "datos_consolidados.observaciones", NO en errores_bloqueantes.
- Si un documento está en blanco, corrupto o no corresponde al tipo indicado, es un error bloqueante.
- "datos_consolidados" solo se llena con datos confirmados y consistentes. Si hay conflicto, pon null en ese campo.
- El array "documentos" debe tener exactamente ${documentos.length} elementos, uno por cada documento recibido, en el mismo orden.
- Responde SOLO con el JSON.
      `,
    });

    // Llamada a OpenRouter (formato OpenAI-compatible)
    const openrouterRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        // Opcional pero recomendado por OpenRouter para analíticas
        'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqos.local',
        'X-Title': 'ARQOS - Validador de expedientes',
      },
      body: JSON.stringify({
        model: MODEL,
        // 8192 da margen suficiente para validar 5+ documentos sin que se corte el JSON
        max_tokens: 8192,
        // JSON mode: fuerza al modelo a devolver SIEMPRE un JSON válido,
        // sin preámbulo ni postámbulo, sin markdown.
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: contentBlocks }],
      }),
    });

    if (!openrouterRes.ok) {
      const errText = await openrouterRes.text();
      console.error('Error OpenRouter:', openrouterRes.status, errText);
      return NextResponse.json(
        { error: `Error de OpenRouter (${openrouterRes.status}): ${errText}` },
        { status: 502 }
      );
    }

    const openrouterJson = await openrouterRes.json();
    const rawText: string = openrouterJson?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!rawText) {
      return NextResponse.json(
        { error: 'La IA devolvió una respuesta vacía.', raw: openrouterJson },
        { status: 500 }
      );
    }

    // Estrategia de parseo tolerante:
    //  1. Quitar fences markdown (```json ... ```)
    //  2. Si aún falla, extraer el primer bloque {...} del texto
    //  3. Si aún falla, log detallado y error explícito
    let parsed: unknown;
    const intentoParseo = (texto: string): unknown | null => {
      try { return JSON.parse(texto); } catch { return null; }
    };

    const sinFences = rawText.replace(/```json|```/g, '').trim();
    parsed = intentoParseo(sinFences);

    if (parsed === null) {
      // Buscar el primer { y el último } y probar con ese substring
      const primeroLlave = sinFences.indexOf('{');
      const ultimaLlave = sinFences.lastIndexOf('}');
      if (primeroLlave !== -1 && ultimaLlave > primeroLlave) {
        const candidato = sinFences.slice(primeroLlave, ultimaLlave + 1);
        parsed = intentoParseo(candidato);
      }
    }

    if (parsed === null) {
      console.error('Parseo IA falló. Texto crudo recibido:\n', rawText.slice(0, 2000));
      return NextResponse.json(
        {
          error: 'La IA no pudo generar una respuesta estructurada. Intenta de nuevo.',
          raw: rawText.slice(0, 500), // primeros 500 chars para que el cliente lo muestre
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error: unknown) {
    console.error('Error en /api/analizar-avaluo:', error);
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + mensaje },
      { status: 500 }
    );
  }
}
