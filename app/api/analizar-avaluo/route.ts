import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/util/supabase/server';
import * as XLSX from 'xlsx';
import { createRateLimiter } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

const logger = createLogger('analizar-avaluo');

// 15 análisis/hora por usuario — cada análisis es costoso (multimodal + multi-doc)
const rateLimit = createRateLimiter({
  limit: 15,
  windowMs: 60 * 60 * 1000,
});

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

interface DocInput {
  id: string;
  nombre: string;
  storagePath: string;
  contentType: string;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY no está configurada en el servidor.' },
        { status: 500 }
      );
    }

    // Autenticación: solo usuarios logueados con rol interno
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      logger.warn('unauthenticated');
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const { data: perfil } = await supabaseAuth
      .from('perfiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single();
    if (!perfil?.activo || !['evaluador', 'controlador', 'administrador'].includes(perfil.rol)) {
      logger.warn('forbidden_role', { userId: user.id, rol: perfil?.rol });
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    // Rate limit por usuario (análisis multimodal es costoso)
    const rl = rateLimit(user.id);
    if (!rl.ok) {
      const resetSeconds = Math.ceil(rl.resetMs / 1000);
      logger.warn('rate_limit_exceeded', { userId: user.id, resetSeconds });
      return NextResponse.json(
        { error: 'rate_limit', resetInSeconds: resetSeconds, mensaje: `Límite de análisis alcanzado. Intenta de nuevo en ${Math.ceil(resetSeconds / 60)} minutos.` },
        { status: 429, headers: { 'Retry-After': String(resetSeconds) } },
      );
    }

    // Ahora recibimos JSON ligero (<1KB) con rutas de Storage, no archivos pesados
    const body = await req.json() as {
      tipoAvaluo: string;
      banco?: string;
      documentos: DocInput[];
    };

    const { tipoAvaluo, documentos } = body;

    logger.info('request_start', { userId: user.id, tipoAvaluo, numDocs: documentos?.length ?? 0 });

    if (!documentos || documentos.length === 0) {
      return NextResponse.json({ error: 'No se recibieron documentos.' }, { status: 400 });
    }
    if (!tipoAvaluo || !['1.0', '2.0'].includes(tipoAvaluo)) {
      return NextResponse.json({ error: 'Tipo de avalúo inválido.' }, { status: 400 });
    }

    // Reutilizamos el cliente autenticado del bloque de auth
    const supabase = supabaseAuth;

    const docsDescargados = await Promise.all(
      documentos.map(async (doc) => {
        const { data, error } = await supabase.storage
          .from('documentos')
          .download(doc.storagePath);

        if (error || !data) {
          throw new Error(`No se pudo descargar ${doc.nombre}: ${error?.message || 'archivo no encontrado'}`);
        }

        const bytes = await data.arrayBuffer();
        const ext = (doc.storagePath.split('.').pop() || '').toLowerCase();
        const mime = MIME_PERMITIDOS[ext] ?? doc.contentType ?? 'application/octet-stream';
        const esExcel =
          mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          mime === 'application/vnd.ms-excel';

        return {
          id: doc.id,
          nombre: doc.nombre,
          fileName: doc.storagePath.split('/').pop() || doc.nombre,
          mime,
          base64: esExcel ? null : Buffer.from(bytes).toString('base64'),
          markdown: esExcel ? xlsxBufferToMarkdown(bytes) : null,
        };
      })
    );

    // Validar formatos
    const formatoInvalido = docsDescargados.find(
      (d) => !Object.values(MIME_PERMITIDOS).includes(d.mime)
    );
    if (formatoInvalido) {
      return NextResponse.json(
        { error: `Formato no soportado en ${formatoInvalido.fileName}. Solo se aceptan PDF, JPG, PNG o XLSX.` },
        { status: 400 }
      );
    }

    // Construir contenido multimodal
    const contentBlocks: ContentPart[] = [];

    for (const doc of docsDescargados) {
      contentBlocks.push({
        type: 'text',
        text: `\n===== DOCUMENTO ${doc.id}: ${doc.nombre} (archivo: ${doc.fileName}) =====`,
      });

      if (doc.markdown !== null) {
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
        contentBlocks.push({
          type: 'image_url',
          image_url: { url: dataUrl },
        });
      }
    }

    contentBlocks.push({
      type: 'text',
      text: `
Eres un perito valuador experto en avalúos bancarios mexicanos. Recibirás ${docsDescargados.length} documentos (PDF o imágenes JPG/PNG) de un expediente de avalúo tipo ${tipoAvaluo} y debes analizarlos con criterios profesionales ESTRICTOS. Tu trabajo es proteger al banco y al cliente de fraudes y errores: PREFIERE BLOQUEAR un expediente válido que dejar pasar uno inválido.

═══════════════════════════════════════════════════════════════
REGLA NÚMERO UNO — INDISPENSABLE — IDENTIFICACIÓN DE TIPO
═══════════════════════════════════════════════════════════════

Antes de extraer ningún dato, para CADA documento debes ejecutar estos pasos en orden:

PASO A — IDENTIFICAR EL TIPO REAL DEL ARCHIVO:
IGNORA POR COMPLETO el nombre del archivo (ej: "TITULO.pdf", "BOLETA.jpg", "ACREDITACION.pdf").
Los nombres son inventados por el valuador y NO son evidencia válida — pueden mentir.
Tu identificación debe basarse 100% en el CONTENIDO VISIBLE del documento.

NO asumas que el archivo es lo que dice el slot del sistema. Examina el contenido visual:
  • Header / título / membrete (gobierno, notaría, banco, utility company, dependencia)
  • Logos y sellos oficiales
  • Estructura visual (tarjeta plástica, recibo, hoja notarial, mapa, foto, hoja de cálculo)
  • Etiquetas de los campos y la palabra clave del documento
  • Texto del cuerpo del documento

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

    VALIDACIÓN GRANULAR OBLIGATORIA del Título — verifica si el documento contiene:
      a) Comprobante de inscripción en el Registro Público de la Propiedad (RPP)
      b) Sellos del Registro Público de la Propiedad
      c) Sellos de notaría
      d) Firma del notario
      e) Croquis del inmueble (plano o descripción de colindancias y medidas)
      f) Cuadro de construcción (superficies de terreno y/o construcción)
    Si FALTA alguno de (a)-(f), NO marques el documento como inválido pero SÍ reporta
    en el campo "errores" del documento cuáles faltan, por ejemplo:
      "El Título no presenta sellos visibles del RPP ni croquis del inmueble."
    Esto es ADVERTENCIA, no bloqueante — el valuador decide si procede o corrige.
    Sin embargo, si falta la FIRMA del notario (d) → sí es ERROR BLOQUEANTE porque
    un título sin firma no tiene validez legal.

  ▸ BOLETA PREDIAL / CÉDULA CATASTRAL / RECIBO DE PAGO PREDIAL:
    Tres variantes igualmente VÁLIDAS para este slot. Acepta CUALQUIERA:

    Variante 1 — BOLETA / CÉDULA CATASTRAL:
      - Constancia oficial del MUNICIPIO o catastro estatal
      - Header de la Tesorería Municipal o dependencia de Catastro
      - Palabras clave: "CÉDULA CATASTRAL", "BOLETA PREDIAL", "CONSTANCIA CATASTRAL"
      - Datos del predio: clave catastral, propietario, ubicación, superficie

    Variante 2 — RECIBO DE PAGO DEL IMPUESTO PREDIAL:
      - Comprobante de pago emitido por la Tesorería Municipal
      - Header del municipio o sistema de pagos municipal
      - Palabras clave: "IMPUESTO PREDIAL", "PAGO PREDIAL", "RECIBO PREDIAL", "PAGO DE PREDIAL"
      - Muestra: periodo pagado (bimestre/anual), monto, fecha de pago, sello o folio de pago
      - Tiene CLAVE CATASTRAL y nombre del contribuyente
      - ESTE TIPO ES VÁLIDO COMO BOLETA PREDIAL — el recibo demuestra que el predial está pagado y contiene los mismos datos clave

    Variante 3 — ESTADO DE CUENTA PREDIAL:
      - Documento de la Tesorería Municipal con saldo pendiente o adeudo
      - Tiene clave catastral, propietario, periodos
      - También VÁLIDO

    Para CUALQUIERA de las 3 variantes:
      - DEBE contener CLAVE CATASTRAL (formato típico 14 dígitos: 14-001-001-178-7017)
      - DEBE mencionar al propietario o contribuyente
      - DEBE referirse al impuesto predial / catastro

    VALIDACIÓN DE ANTIGÜEDAD OBLIGATORIA:
      - Hoy es ${new Date().toISOString().slice(0, 10)}.
      - Extrae el periodo o fecha del documento (ej: "Ejercicio 2025", "Enero-Junio 2026", "Pagado 03/2025").
      - Si el documento tiene MÁS DE 1 AÑO de antigüedad respecto a la fecha actual → ADVERTENCIA:
        "La Boleta Predial corresponde al periodo [X], con más de 1 año de antigüedad. Se recomienda presentar un recibo del ejercicio fiscal actual o inmediato anterior."
      - Si NO se puede determinar la fecha/periodo → ADVERTENCIA pidiendo verificación manual.
      - Un documento del año fiscal actual o del inmediato anterior es VÁLIDO.

    VALIDACIÓN GRANULAR — verifica que el documento contenga:
      a) Clave catastral / Cuenta predial
      b) Superficie de terreno
      c) Valor terreno catastral
      d) Ubicación del terreno
      e) Datos del propietario (nombre completo)
    Si falta alguno, reporta en "errores" cuáles faltan (ADVERTENCIA, no bloqueante).

    NO confundir con: mapa de macrolocalización, plano arquitectónico, recibo de agua (CEA/JAPAC), recibo de luz (CFE), foto del terreno, escritura notarial.

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
   - Debe coincidir entre el Título de Propiedad y la Boleta Predial/Cédula Catastral.
   - REGLA CRÍTICA DE NOMBRES MEXICANOS: En documentos oficiales mexicanos, el orden del nombre varía CONSTANTEMENTE entre documentos. Un documento puede decir "MARIA ELENA FRAUSTO ROMERO" (nombre + apellidos) y otro "FRAUSTO ROMERO MARIA ELENA" (apellidos + nombre). ESTO ES LA MISMA PERSONA — NO es un error.
   - Para comparar nombres: extrae TODAS las palabras del nombre, ignora el orden, ignora mayúsculas/minúsculas, ignora acentos. Si las mismas palabras aparecen en ambos documentos → ES LA MISMA PERSONA → VÁLIDO.
   - Solo marca ERROR BLOQUEANTE si los nombres son de personas claramente DIFERENTES (palabras completamente distintas, no solo reordenadas).
   - SOBRE LA IDENTIFICACIÓN OFICIAL DEL SOLICITANTE: En avalúos bancarios para crédito, el SOLICITANTE del crédito (comprador) y el PROPIETARIO actual del inmueble (vendedor) son personas DIFERENTES. La INE del solicitante NO tiene que coincidir con el nombre del Título de Propiedad. Son dos personas distintas en la operación de compraventa. NUNCA marques error por esta diferencia — es completamente normal y esperado.
   - La INE del PROPIETARIO (si se incluye) SÍ debe coincidir con el nombre del Título.

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
        "propietario": "nombre completo o null",
        "ubicacion": "dirección completa o null",
        "superficie_terreno": "en m² solo número o null",
        "superficie_construccion": "en m² solo número o null",
        "fecha": "DD/MM/AAAA o null",
        "numero_escritura": "número de escritura o null (solo Título)",
        "notario": "nombre y número de notaría o null (solo Título)",
        "rpp_folio": "folio RPP o null (solo Título)",
        "regimen_propiedad": "tipo de régimen o null (solo Título)",
        "medidas_colindancias": "medidas y colindancias del predio o null (solo Título)",
        "restricciones": "gravámenes o restricciones o null (solo Título)",
        "clave_catastral": "clave catastral o null (solo Boleta)",
        "valor_catastral": "valor catastral en pesos o null (solo Boleta)",
        "cuenta_predial": "cuenta predial o null (solo Boleta)",
        "uso_suelo": "uso de suelo si aparece o null",
        "vigencia": "fecha de vigencia o vencimiento o null (solo INE)"
      },
      "errores": ["descripción del error si valido=false, array vacío si valido=true. Si tipo_coincide=false, el primer error DEBE explicar el mismatch de tipo"]
    }
  ],
  "datos_consolidados": {
    // === IDENTIFICACIÓN Y PROPIETARIO ===
    "propietario": "nombre completo del propietario confirmado o null",
    "solicitante": "nombre del solicitante del crédito si aparece en INE u otro documento, o null",

    // === DIRECCIÓN DESGLOSADA ===
    "ubicacion": "dirección completa del inmueble confirmada o null",
    "calle": "solo la calle con número (ej: 'Luis I. Rodriguez 311') o null",
    "colonia": "nombre de colonia o fraccionamiento o null",
    "municipio": "nombre del municipio o null",
    "estado": "nombre del estado (ej: 'Querétaro', 'CDMX') o null",
    "cp": "código postal si aparece o null",

    // === DATOS CATASTRALES (de Boleta Predial) ===
    "clave_catastral": "clave catastral completa o null",
    "cuenta_predial": "número de cuenta predial si es diferente a clave catastral, o null",
    "valor_catastral": "valor catastral del predio en pesos (solo número) o null",

    // === SUPERFICIES ===
    "superficie_terreno": "superficie del terreno en m² (solo número, ej: '105.00') o null",
    "superficie_construccion": "superficie de construcción en m² (solo número) o null",

    // === DATOS LEGALES (del Título de Propiedad / Escritura) ===
    "regimen_propiedad": "tipo de régimen (ej: 'Propiedad privada', 'Condominio', 'Ejidal', 'Copropiedad') o null",
    "numero_escritura": "número de escritura pública del Título o null",
    "notario": "nombre del notario y número de notaría o null",
    "fecha_escritura": "fecha de la escritura DD/MM/AAAA o null",
    "rpp_folio": "folio del Registro Público de la Propiedad o null",
    "situacion_legal": "descripción de la situación legal del inmueble extraída de la escritura (ej: 'Libre de gravámenes', 'Hipoteca vigente', 'Prescripción positiva') o null",
    "restricciones_servidumbres": "restricciones, servidumbres o gravámenes mencionados en el título o null",
    "medidas_colindancias": "medidas y colindancias del predio si aparecen en el título (ej: 'Norte 10m con lote 5, Sur 10m con calle, Este 15m con lote 3, Oeste 15m con lote 7') o null",

    // === DESCRIPCIÓN DEL INMUEBLE (inferir de cualquier documento) ===
    "tipo_inmueble_detectado": "tipo de inmueble inferido (ej: 'casa', 'departamento', 'terreno', 'local_comercial', 'oficina', 'bodega') o null",
    "edad_inmueble": "antigüedad en años calculada desde fecha de escritura o mención en documentos (solo número) o null",
    "uso_suelo_detectado": "uso de suelo si aparece (ej: 'Habitacional H1', 'Comercial', 'Mixto') o null",
    "descripcion_fisica": "descripción física del inmueble si se menciona en la escritura o documentos (materiales, niveles, distribución) o null",
    "construcciones": "descripción de las construcciones mencionadas en documentos (ej: '2 niveles, 3 recámaras, 2 baños, sala-comedor, cocina, patio') o null",
    "instalaciones": "instalaciones especiales mencionadas (ej: 'Cisterna, tinaco, calentador solar, gas estacionario') o null",
    "estado_conservacion": "estado de conservación si se menciona o infiere de documentos (ej: 'Bueno', 'Regular', 'Nuevo') o null",
    "topografia_forma": "topografía y forma del terreno si aparece en escritura o plano (ej: 'Plano, forma regular rectangular') o null",
    "num_recamaras": "número de recámaras si se menciona (solo número) o null",
    "num_banos": "número de baños si se menciona (solo número) o null",
    "num_estacionamientos": "número de estacionamientos si se menciona (solo número) o null",

    // === CARACTERÍSTICAS URBANAS (inferir del contexto y documentos) ===
    "clasificacion_zona": "clasificación de la zona si se puede inferir de la ubicación (ej: 'Residencial media', 'Comercial', 'Industrial') o null",
    "uso_predominante": "uso predominante de la zona si se puede inferir (ej: 'Habitacional', 'Comercial', 'Mixto') o null",
    "tipo_zona": "tipo de zona urbana si se menciona o infiere (ej: 'Urbana', 'Suburbana', 'Rural') o null",
    "cuenta_agua": "cuenta o número de servicio de agua si aparece en documentos o null",

    // === FOLIOS E IDENTIFICADORES ===
    "folio_infonavit": "folio de Infonavit si aparece en algún documento o null",
    "clave_unica_vivienda": "clave única de vivienda (CUV) si aparece o null",

    // === DOCUMENTACIÓN ANALIZADA (resumen automático) ===
    "documentacion_analizada": "lista de documentos analizados y su tipo detectado, separados por punto y coma",

    // === OBSERVACIONES GENERALES ===
    "valor_estimado": "null (no aplica para validación documental)",
    "observaciones": "resumen de validación: documentos revisados, datos confirmados, advertencias no bloqueantes y cualquier observación relevante para el expediente"
  },
  "confianza": {
    // Nivel de certeza por campo — número entre 0 y 1.
    // 1.0 = extraído literal de un documento oficial, sin ambigüedad.
    // 0.8 = extraído con claridad pero con algún detalle menor.
    // 0.6 = inferido del contexto o con menor certeza.
    // 0.3 = extracción muy débil, el humano debe revisar obligatoriamente.
    // Incluye UN entry por cada campo NO-null en datos_consolidados.
    // Ejemplo: { "propietario": 0.95, "superficie_terreno": 0.7, "tipo_zona": 0.5 }
  }

INSTRUCCIÓN FINAL IMPORTANTE — EXTRAE ABSOLUTAMENTE TODO:
Revisa cada documento con lupa y extrae TODOS los datos posibles para los campos anteriores.
Si un campo puede llenarse con información de CUALQUIER documento del expediente, llénalo.
No dejes null un campo si la información está en alguno de los documentos.
Prefiere extraer datos parciales a dejar vacío — es mejor "2 niveles" que null.
La escritura notarial suele contener: medidas, colindancias, superficie, descripción del inmueble, régimen, restricciones.
La boleta predial suele contener: clave catastral, valor catastral, superficie, uso de suelo, cuenta de agua a veces.
La INE contiene: nombre del titular, vigencia.
}

REGLAS CRÍTICAS DE SALIDA:
- Si CUALQUIER documento tiene "tipo_coincide": false → "valido" RAÍZ = false y debe haber al menos un mensaje en "errores_bloqueantes" explicando el mismatch.
- Nunca marques "tipo_coincide": true sin estar 100% seguro. Ante la duda → false.
- "valido" en el objeto raíz es false SOLO si hay al menos un ERROR BLOQUEANTE (mismatch de tipo, documento inválido, nombre distinto, inmueble diferente, identificación vencida, ilegible). Las ADVERTENCIAS no bloquean el expediente.
- "errores_bloqueantes" debe ser explícito: menciona los valores en conflicto para que el valuador sepa qué corregir. Array vacío si no hay errores bloqueantes.
- Las advertencias (ej. diferencia de superficie menor) van en "datos_consolidados.observaciones", NO en errores_bloqueantes.
- Si un documento está en blanco, corrupto o no corresponde al tipo indicado, es un error bloqueante.
- "datos_consolidados" solo se llena con datos confirmados y consistentes. Si hay conflicto, pon null en ese campo.
- El array "documentos" debe tener exactamente ${docsDescargados.length} elementos, uno por cada documento recibido, en el mismo orden.
- Responde SOLO con el JSON.
      `,
    });

    // Llamada a OpenRouter con retry manual (max 2 intentos)
    const maxAttempts = 2;
    let openrouterRes: Response | null = null;
    let lastErrText = '';
    let lastStatus = 0;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      openrouterRes = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqos.local',
          'X-Title': 'ARQOS - Validador de expedientes',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: contentBlocks }],
        }),
      });

      if (openrouterRes.ok) break;

      lastStatus = openrouterRes.status;
      lastErrText = await openrouterRes.text();

      // Retry only on 429 / 5xx
      const retriable = openrouterRes.status === 429 || openrouterRes.status >= 500;
      if (!retriable || attempt === maxAttempts - 1) break;

      const retryAfter = Number(openrouterRes.headers.get('retry-after')) || 0;
      const wait =
        retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, wait));
    }

    if (!openrouterRes || !openrouterRes.ok) {
      console.error('Error OpenRouter:', lastStatus, lastErrText);
      return NextResponse.json(
        { error: `Error de OpenRouter (${lastStatus}): ${lastErrText}` },
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

    // Parseo tolerante (3 capas)
    let parsed: unknown;
    const intentoParseo = (texto: string): unknown | null => {
      try { return JSON.parse(texto); } catch { return null; }
    };

    const sinFences = rawText.replace(/```json|```/g, '').trim();
    parsed = intentoParseo(sinFences);

    if (parsed === null) {
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
          raw: rawText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    // Post-proceso: asegurar que `confianza` exista y tenga entry por cada campo no-null.
    // Si la IA no la devolvió (prompts antiguos), asignamos 0.75 por defecto como señal
    // neutral — el humano debe revisar de todos modos. Campos null quedan sin entry.
    const parsedObj = parsed as Record<string, unknown> | null;
    if (parsedObj && typeof parsedObj === 'object') {
      const datos = (parsedObj.datos_consolidados ?? {}) as Record<string, unknown>;
      const confianzaRaw = (parsedObj.confianza ?? {}) as Record<string, unknown>;
      const confianza: Record<string, number> = {};
      for (const [campo, valor] of Object.entries(datos)) {
        if (valor === null || valor === undefined || valor === '') continue;
        const raw = confianzaRaw[campo];
        const n = typeof raw === 'number' ? raw : Number(raw);
        confianza[campo] = Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.75;
      }
      parsedObj.confianza = confianza;
    }

    logger.info('request_success', { userId: user.id, latencyMs: Date.now() - startedAt });
    return NextResponse.json(parsed, { status: 200 });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('unhandled_error', { error: mensaje, latencyMs: Date.now() - startedAt });
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + mensaje },
      { status: 500 }
    );
  }
}
