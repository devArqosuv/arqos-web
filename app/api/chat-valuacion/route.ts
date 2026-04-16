import { NextRequest } from 'next/server';
import { createRateLimiter, getClientIp } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

const logger = createLogger('chat-valuacion');

const rateLimit = createRateLimiter({
  limit: 30,
  windowMs: 60 * 60 * 1000, // 1h
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ip = getClientIp(req);
  const rl = rateLimit(ip);

  if (!rl.ok) {
    const resetSeconds = Math.ceil(rl.resetMs / 1000);
    logger.warn('rate_limit_exceeded', { ip, resetSeconds });
    return new Response(
      JSON.stringify({ error: 'rate_limit', resetInSeconds: resetSeconds }),
      {
        status: 429,
        headers: {
          'Retry-After': String(resetSeconds),
          'Content-Type': 'application/json',
        },
      },
    );
  }

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      logger.error('missing_api_key');
      return new Response(JSON.stringify({ error: 'API key no configurada.' }), { status: 500 });
    }

    const body = await req.json() as {
      mensajes: ChatMessage[];
      contexto: {
        direccion: string;
        tipo: string;
        superficie: number;
        recamaras: number;
        valor_estimado: number;
        ciudad: string;
      };
    };

    logger.info('request_start', {
      ip,
      mensajes: body.mensajes?.length ?? 0,
      tipo: body.contexto?.tipo,
    });

    const systemPrompt = `Eres ARQOS Data, el asistente de valuación inmobiliaria de ARQOS Unidad de Valuación. Hablas en español mexicano, eres profesional pero accesible.

CONTEXTO DEL INMUEBLE (ya estimado previamente):
- Dirección: ${body.contexto.direccion}
- Tipo: ${body.contexto.tipo}
- Superficie: ${body.contexto.superficie} m²
- Recámaras: ${body.contexto.recamaras}
- Estimado previo: $${body.contexto.valor_estimado.toLocaleString('es-MX')} MXN
- Ciudad: ${body.contexto.ciudad}

TU OBJETIVO: Refinar el estimado de valor haciendo preguntas inteligentes sobre:
1. Estado de conservación (nuevo, remodelado, regular, necesita reparaciones)
2. Acabados (premium, estándar, económicos)
3. Amenidades de la zona (privada con seguridad, alberca, gimnasio, parques)
4. Antigüedad del inmueble
5. Estacionamientos
6. Extras (roof garden, jardín, bodega, cuarto de servicio)

REGLAS:
- Haz UNA pregunta a la vez, máximo 2 oraciones
- Después de cada respuesta, ajusta mentalmente el valor pero NO lo muestres hasta que el usuario pregunte o después de 3-4 intercambios
- Cuando tengas suficiente información (3-4 respuestas), da tu estimado refinado
- El estimado refinado debe ser un JSON al final de tu mensaje con este formato exacto:
  <<ESTIMADO:{"valor_bajo":N,"valor_centro":N,"valor_alto":N,"confianza":"alta|media|baja"}>>
- Si el usuario no quiere seguir, respeta y da el estimado con lo que tienes
- Sé conciso, no uses más de 3 oraciones por mensaje
- NUNCA inventes datos que el usuario no te dio`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...body.mensajes.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const openrouterRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqosuv.com',
        'X-Title': 'ARQOS Data - Chat valuación',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        stream: true,
        messages,
      }),
    });

    if (!openrouterRes.ok) {
      const err = await openrouterRes.text();
      logger.error('openrouter_stream_error', {
        ip,
        status: openrouterRes.status,
        body: err.slice(0, 200),
        latencyMs: Date.now() - startedAt,
      });
      return new Response(JSON.stringify({ error: 'Error al consultar la IA.' }), { status: 502 });
    }

    logger.info('stream_opened', {
      ip,
      latencyMs: Date.now() - startedAt,
    });

    // Forward the stream directly
    return new Response(openrouterRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logger.error('unhandled_error', {
      ip,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error interno.' }),
      { status: 500 },
    );
  }
}
