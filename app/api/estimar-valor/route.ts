import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

interface EstimacionRequest {
  direccion: string;
  tipo: string;
  superficie: number;
  recamaras: number;
  ciudad?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'API key no configurada.' }, { status: 500 });
    }

    const body = (await req.json()) as EstimacionRequest;
    const { direccion, tipo, superficie, recamaras } = body;

    if (!direccion || !tipo || !superficie) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
    }

    const prompt = `Eres un valuador inmobiliario experto en México con acceso a datos de mercado actualizados a 2026.

Se te pide estimar el valor de mercado de un inmueble con estas características:
- Dirección / Zona: ${direccion}
- Tipo de inmueble: ${tipo}
- Superficie de construcción: ${superficie} m²
- Recámaras: ${recamaras}

INSTRUCCIONES:
1. Identifica la ciudad y zona a partir de la dirección
2. Basándote en precios promedio de mercado para esa zona en 2026, calcula un rango de valor
3. Considera: ubicación, tipo de inmueble, superficie, número de recámaras
4. Da un rango conservador pero realista en pesos mexicanos (MXN)

REGLAS DE ESTIMACIÓN:
- Para ciudades principales (CDMX, Monterrey, Guadalajara, Querétaro): usa precios de mercado 2025-2026
- Para zonas premium: multiplica por 1.2-1.5
- Para zonas populares: usa precio base
- Casas: $15,000-$35,000/m² según zona
- Departamentos: $18,000-$45,000/m² según zona
- Terrenos: $5,000-$20,000/m² según zona
- Locales comerciales: $20,000-$50,000/m² según zona

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):
{
  "valor_bajo": number (pesos mexicanos, sin centavos),
  "valor_centro": number,
  "valor_alto": number,
  "precio_m2": number (precio por m² estimado),
  "ciudad_detectada": "nombre de la ciudad identificada",
  "zona_detectada": "descripción breve de la zona (ej: 'Zona residencial media-alta')",
  "justificacion": "1-2 oraciones explicando el rango de valor",
  "factores": ["factor positivo 1", "factor positivo 2"],
  "riesgos": ["riesgo o factor negativo 1"]
}`;

    const openrouterRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqosuv.com',
        'X-Title': 'ARQOS Data - Estimador de valor',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!openrouterRes.ok) {
      const err = await openrouterRes.text();
      console.error('OpenRouter error:', openrouterRes.status, err);
      return NextResponse.json({ error: 'Error al consultar la IA.' }, { status: 502 });
    }

    const json = await openrouterRes.json();
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!raw) {
      return NextResponse.json({ error: 'La IA no respondió.' }, { status: 500 });
    }

    // Parse tolerante
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      const first = raw.indexOf('{');
      const last = raw.lastIndexOf('}');
      if (first !== -1 && last > first) {
        try { parsed = JSON.parse(raw.slice(first, last + 1)); } catch { /* fall through */ }
      }
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Respuesta inválida de la IA.' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error en /api/estimar-valor:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno.' },
      { status: 500 },
    );
  }
}
