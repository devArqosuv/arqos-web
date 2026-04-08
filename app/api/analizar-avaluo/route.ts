import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

// Formato de contenido OpenAI-compatible usado por OpenRouter
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'file'; file: { filename: string; file_data: string } };

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

    // Convertir cada PDF a base64 emparejado con su ID y nombre
    const documentos = await Promise.all(
      files.map(async (file, index) => {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        return {
          id: docIds[index],
          nombre: docNombres[index],
          fileName: file.name,
          base64,
        };
      })
    );

    // Construir el contenido multimodal: cada doc etiquetado + el PDF como data URL
    const contentBlocks: ContentPart[] = [];

    for (const doc of documentos) {
      contentBlocks.push({
        type: 'text',
        text: `\n===== DOCUMENTO ${doc.id}: ${doc.nombre} (archivo: ${doc.fileName}) =====`,
      });
      contentBlocks.push({
        type: 'file',
        file: {
          filename: doc.fileName,
          file_data: `data:application/pdf;base64,${doc.base64}`,
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: `
Eres un perito valuador experto en avalúos bancarios mexicanos. Recibirás ${documentos.length} documentos PDF de un expediente de avalúo tipo ${tipoAvaluo} y debes analizarlos con criterios profesionales estrictos.

CRITERIOS DE VALIDACIÓN Y REFERENCIA CRUZADA:

1. NOMBRE DEL PROPIETARIO:
   - Debe ser IDÉNTICO en el Título de Propiedad y la Boleta Predial/Cédula Catastral.
   - Acepta variaciones menores de formato (mayúsculas, orden de apellidos) pero el nombre debe corresponder a la misma persona.
   - Si no coincide → ERROR BLOQUEANTE.

2. DIRECCIÓN/UBICACIÓN DEL INMUEBLE:
   - IMPORTANTE: En avalúos de primera enajenación, la dirección frecuentemente NO aparece en el mismo orden o formato en el Título vs la Boleta Predial.
   - El Título puede mostrar: "Lote 5, Manzana 3, Fraccionamiento Las Palmas, Ejido El Mezquite, Municipio de Juárez".
   - La Boleta puede mostrar: "Ejido El Mezquite, Frac. Las Palmas, Mzna. 3, Lote 5".
   - DEBES comparar los elementos clave: nombre del ejido/fraccionamiento, número de lote, número de manzana, municipio, superficie.
   - Si los elementos clave coinciden aunque el orden sea diferente → VÁLIDO.
   - Si claramente son inmuebles diferentes → ERROR BLOQUEANTE.

3. SUPERFICIE DEL TERRENO:
   - Debe coincidir entre Título de Propiedad y Boleta Predial.
   - Acepta diferencia de hasta 0.5 m² por redondeo.
   - Si difiere significativamente → ADVERTENCIA (no bloqueante).

4. CLAVE CATASTRAL:
   - Extraer de la Boleta Predial.
   - Verificar que corresponda al municipio indicado en el Título.

5. VALIDACIÓN POR TIPO DE DOCUMENTO:

   Para TÍTULO DE PROPIEDAD (1.1 o equivalente):
   - Verificar: número de título, nombre propietario, superficie, medidas y colindancias, ubicación, fecha.
   - Debe ser un documento notarial legible.

   Para BOLETA PREDIAL / CÉDULA CATASTRAL (1.2 o equivalente):
   - Verificar: clave catastral, nombre propietario, ubicación del inmueble.
   - Cruzar nombre y ubicación con el Título.

   Para IDENTIFICACIÓN OFICIAL (1.3 o equivalente):
   - Verificar que sea una identificación vigente (INE, pasaporte, etc.).
   - Confirmar que el nombre corresponda al propietario del expediente.

   Para ESCRITURA COMPLETA (2.1):
   - Verificar datos notariales completos, número de escritura, nombre propietario.

   Para COMPROBANTE DE AGUA (2.3):
   - Verificar que la dirección corresponda al inmueble valuado.

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
      "valido": true | false,
      "datos_extraidos": {
        "numero_titulo": "valor o null",
        "propietario": "nombre completo o null",
        "ubicacion": "dirección completa o null",
        "superficie": "con unidad o null",
        "fecha": "DD/MM/AAAA o null"
      },
      "errores": ["descripción del error si valido=false, array vacío si valido=true"]
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
- "valido" en el objeto raíz es false SOLO si hay al menos un ERROR BLOQUEANTE (documento inválido, nombre distinto, o inmuebles claramente diferentes). Las ADVERTENCIAS no bloquean el expediente.
- "errores_bloqueantes" debe ser explícito: menciona los valores en conflicto para que el evaluador sepa qué corregir. Array vacío si no hay errores bloqueantes.
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
        'X-Title': 'ARQOS — Validador de expedientes',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
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

    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        {
          error: 'La IA no pudo generar una respuesta estructurada. Intenta de nuevo.',
          raw: rawText,
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
