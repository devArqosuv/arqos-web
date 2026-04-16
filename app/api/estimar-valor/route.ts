import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/util/rate-limit';
import { callOpenRouter } from '@/util/openrouter';
import { createLogger } from '@/util/logger';

const MODEL = 'anthropic/claude-sonnet-4-5';

const logger = createLogger('estimar-valor');

const rateLimit = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1000, // 1h
});

interface EstimacionRequest {
  direccion: string;
  tipo: string;
  superficie: number;
  recamaras: number;
  ciudad?: string;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ip = getClientIp(req);
  const rl = rateLimit(ip);

  if (!rl.ok) {
    const resetSeconds = Math.ceil(rl.resetMs / 1000);
    logger.warn('rate_limit_exceeded', { ip, resetSeconds });
    return NextResponse.json(
      { error: 'rate_limit', resetInSeconds: resetSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(resetSeconds) },
      },
    );
  }

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      logger.error('missing_api_key');
      return NextResponse.json({ error: 'API key no configurada.' }, { status: 500 });
    }

    const body = (await req.json()) as EstimacionRequest;
    const { direccion, tipo, superficie, recamaras } = body;

    if (!direccion || !tipo || !superficie) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
    }

    logger.info('request_start', { ip, tipo, superficie, recamaras });

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

    let raw = '';
    try {
      const result = await callOpenRouter({
        model: MODEL,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
        extraHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqosuv.com',
          'X-Title': 'ARQOS Data - Estimador de valor',
        },
      });
      raw = result.content?.trim() ?? '';
    } catch (err) {
      logger.error('openrouter_failed', {
        ip,
        error: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: 'Error al consultar la IA.' }, { status: 502 });
    }

    if (!raw) {
      logger.error('empty_ia_response', { ip });
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
        try {
          parsed = JSON.parse(raw.slice(first, last + 1));
        } catch {
          /* fall through */
        }
      }
    }

    if (!parsed) {
      logger.error('invalid_ia_response', { ip });
      return NextResponse.json({ error: 'Respuesta inválida de la IA.' }, { status: 500 });
    }

    logger.info('request_success', {
      ip,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    logger.error('unhandled_error', {
      ip,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno.' },
      { status: 500 },
    );
  }
}
