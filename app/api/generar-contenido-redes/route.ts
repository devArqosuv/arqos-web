import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/util/supabase/server';
import { createRateLimiter } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-sonnet-4-5';

const logger = createLogger('generar-contenido-redes');

// 20 generaciones/hora por admin (no es caro pero evita bucle infinito)
const rateLimit = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
});

type Plataforma = 'linkedin' | 'instagram' | 'facebook' | 'x' | 'tiktok';
type Tono = 'profesional' | 'cercano' | 'educativo' | 'promocional';

interface GenerarRequest {
  plataforma: Plataforma;
  tema: string;
  tono: Tono;
  extras?: string;
}

interface GenerarResponse {
  titulo: string;
  contenido: string;
  hashtags: string[];
}

const PLATAFORMAS_VALIDAS: Plataforma[] = ['linkedin', 'instagram', 'facebook', 'x', 'tiktok'];
const TONOS_VALIDOS: Tono[] = ['profesional', 'cercano', 'educativo', 'promocional'];

const LIMITES_CHARS: Record<Plataforma, number> = {
  linkedin: 1500,
  instagram: 2200,
  facebook: 2000,
  x: 280,
  tiktok: 2200,
};

const NOTAS_PLATAFORMA: Record<Plataforma, string> = {
  linkedin:
    'LinkedIn: tono profesional, párrafos cortos, puedes incluir bullets con emojis sutiles. Máximo 1500 caracteres. El primer párrafo debe enganchar antes del "ver más". Sin hashtags dentro del texto — van separados.',
  instagram:
    'Instagram: narrativa visual, emojis moderados, puedes usar saltos de línea para dar ritmo. Máximo 2200 caracteres. Primera línea muy potente (lo que se ve sin "más"). Sin hashtags dentro del texto — van separados.',
  facebook:
    'Facebook: tono conversacional, puede ser más largo (hasta 2000 caracteres). Incluye una pregunta o llamado a interactuar. Sin hashtags dentro del texto.',
  x:
    'X (Twitter): máximo 280 caracteres ESTRICTOS. Directo, con gancho, sin relleno. Los hashtags van separados y deben ser pocos (2-3).',
  tiktok:
    'TikTok: copy para descripción de video, ganchos cortos, muy informal y con emojis. Máximo 2200 caracteres pero idealmente <150. Sin hashtags dentro del texto.',
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'API key no configurada.' }, { status: 500 });
    }

    // Autenticación: solo administradores
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();
    if (perfil?.rol !== 'administrador') {
      logger.warn('forbidden_role', { userId: user.id, rol: perfil?.rol });
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    // Rate limit por admin (previene abuso aún con auth)
    const rl = rateLimit(user.id);
    if (!rl.ok) {
      const resetSeconds = Math.ceil(rl.resetMs / 1000);
      logger.warn('rate_limit_exceeded', { userId: user.id, resetSeconds });
      return NextResponse.json(
        { error: 'rate_limit', resetInSeconds: resetSeconds, mensaje: `Límite alcanzado. Intenta en ${Math.ceil(resetSeconds / 60)} min.` },
        { status: 429, headers: { 'Retry-After': String(resetSeconds) } },
      );
    }

    const body = (await req.json()) as GenerarRequest;
    const { plataforma, tema, tono, extras } = body;

    if (!plataforma || !PLATAFORMAS_VALIDAS.includes(plataforma)) {
      return NextResponse.json({ error: 'Plataforma inválida.' }, { status: 400 });
    }
    if (!tono || !TONOS_VALIDOS.includes(tono)) {
      return NextResponse.json({ error: 'Tono inválido.' }, { status: 400 });
    }
    if (!tema || tema.trim().length < 3) {
      return NextResponse.json({ error: 'Tema es obligatorio.' }, { status: 400 });
    }

    const limite = LIMITES_CHARS[plataforma];
    const notasPlataforma = NOTAS_PLATAFORMA[plataforma];

    const prompt = `Eres experto en marketing digital del sector inmobiliario mexicano, específicamente para una unidad de valuación (ARQOS). Genera una publicación para ${plataforma} sobre: ${tema}. Tono: ${tono}. ${extras ?? ''}

Contexto de marca: ARQOS es una unidad de valuación en México que realiza avalúos inmobiliarios con IA, cumpliendo normatividad SHF y bancaria. Atiende particulares, bancos e inmobiliarias. Valores: precisión, transparencia, tecnología.

Reglas de la plataforma:
${notasPlataforma}
El contenido NO debe exceder ${limite} caracteres.

Devuelve SOLO JSON válido (sin markdown, sin backticks, sin explicaciones) con la siguiente forma:
{
  "titulo": "título interno corto para identificar la publicación en nuestra app (<60 caracteres), NO se publica",
  "contenido": "el texto del post, listo para publicarse en ${plataforma}, respetando el límite de ${limite} caracteres y SIN hashtags dentro del texto",
  "hashtags": ["array de 5-10 hashtags relevantes al sector inmobiliario/valuaciones en México, sin el símbolo #"]
}`;

    const openrouterRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqosuv.com',
        'X-Title': 'ARQOS - Generador de contenido redes',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!openrouterRes.ok) {
      const err = await openrouterRes.text();
      console.error('OpenRouter error:', openrouterRes.status, err);
      return NextResponse.json({ error: 'Error al consultar la IA.' }, { status: 502 });
    }

    const json = (await openrouterRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!raw) {
      return NextResponse.json({ error: 'La IA no respondió.' }, { status: 500 });
    }

    // Parse tolerante
    let parsed: Partial<GenerarResponse> | null = null;
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

    if (!parsed || typeof parsed.contenido !== 'string') {
      return NextResponse.json({ error: 'Respuesta inválida de la IA.' }, { status: 500 });
    }

    const resultado: GenerarResponse = {
      titulo:
        typeof parsed.titulo === 'string' && parsed.titulo.trim().length > 0
          ? parsed.titulo.trim().slice(0, 120)
          : tema.slice(0, 60),
      contenido: parsed.contenido.trim().slice(0, limite),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags
            .filter((h: unknown): h is string => typeof h === 'string')
            .map((h) => h.replace(/^#/, '').trim())
            .filter((h) => h.length > 0)
            .slice(0, 15)
        : [],
    };

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error en /api/generar-contenido-redes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno.' },
      { status: 500 },
    );
  }
}
