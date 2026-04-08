import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Reglas de validación cruzada por tipo ──
const REGLAS_CRUCE: Record<string, string> = {
  '1.0': `
REGLAS DE CRUCE DE DATOS — Tipo 1.0 (Primera Enajenación):
- El NOMBRE DEL PROPIETARIO en el Título de Propiedad (1.1) DEBE coincidir con el nombre en la Boleta Predial (1.2).
- La UBICACIÓN DEL INMUEBLE en el Título (1.1) DEBE corresponder al mismo inmueble en la Boleta Predial (1.2). 
  IMPORTANTE: La dirección puede estar en diferente orden o formato (ej. "Calle Roble 123, Col. Jardines" vs "Col. Jardines, Calle Roble No. 123"), 
  pero debe referirse al MISMO inmueble. Si claramente son inmuebles diferentes, es un error bloqueante.
- La Identificación Oficial (1.3) debe contener datos del propietario y/o solicitante para corroborar identidad.
`,
  '2.0': `
REGLAS DE CRUCE DE DATOS — Tipo 2.0 (Crédito):
- El NOMBRE DEL PROPIETARIO en la Escritura (2.1) DEBE coincidir con el nombre en la Boleta Predial (2.2).
- La UBICACIÓN DEL INMUEBLE en la Escritura (2.1) DEBE corresponder al mismo inmueble en la Boleta Predial (2.2).
  IMPORTANTE: La dirección puede estar en diferente orden o formato, pero debe referirse al MISMO inmueble.
- El Comprobante de Agua (2.3) debe corresponder al mismo inmueble (aunque la dirección puede variar en formato).
- La Identificación Oficial (2.4) debe contener datos del propietario y/o solicitante para corroborar identidad.
`,
};

export async function POST(req: NextRequest) {
  try {
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

    // Construir el contenido para Claude: cada doc etiquetado claramente
    const contentBlocks: Anthropic.MessageParam['content'] = [];

    for (const doc of documentos) {
      contentBlocks.push({
        type: 'text',
        text: `\n===== DOCUMENTO ${doc.id}: ${doc.nombre} (archivo: ${doc.fileName}) =====`,
      });
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: doc.base64,
        },
      } as any);
    }

    const reglasDeEste = REGLAS_CRUCE[tipoAvaluo];

    contentBlocks.push({
      type: 'text',
      text: `
Eres un validador experto de expedientes para avalúos bancarios en México. 
Analiza los ${documentos.length} documentos del expediente tipo ${tipoAvaluo} que te acabo de enviar.

${reglasDeEste}

TU TAREA:
1. Analiza cada documento individualmente: verifica que no esté en blanco, sea legible y corresponda al tipo indicado.
2. Extrae los datos clave de cada documento.
3. Verifica la consistencia entre documentos según las REGLAS DE CRUCE.
4. Si hay alguna inconsistencia o documento inválido, el expediente queda BLOQUEADO.

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin backticks, sin texto extra:

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
    "observaciones": "resumen de validación: documentos revisados, datos confirmados, cualquier observación relevante"
  }
}

REGLAS CRÍTICAS:
- "valido" en el objeto raíz es false si AL MENOS UN documento es inválido O si hay inconsistencias entre documentos.
- "errores_bloqueantes" debe ser explícito: menciona los valores en conflicto para que el evaluador sepa qué corregir.
- Si un documento está en blanco, corrupto o no corresponde al tipo indicado, es un error bloqueante.
- "datos_consolidados" solo se llena con datos confirmados y consistentes. Si hay conflicto, pon null en ese campo.
- El array "documentos" debe tener exactamente ${documentos.length} elementos, uno por cada documento recibido, en el mismo orden.
- Responde SOLO con el JSON.
      `,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

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
  } catch (error: any) {
    console.error('Error en /api/analizar-avaluo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + error.message },
      { status: 500 }
    );
  }
}