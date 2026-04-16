import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/util/supabase/server';
import { callOpenRouter } from '@/util/openrouter';
import { createRateLimiter } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

// ─────────────────────────────────────────────────────────────
// POST /api/claude-vision/analizar-fotos
//
// Analiza las fotos de visita técnica de un avalúo usando Claude Sonnet 4.5
// vía OpenRouter (multimodal). Devuelve datos estructurados del inmueble
// observado (estado, conservación, materiales, entorno, etc.) en JSON.
//
// Auth: el usuario debe ser el valuador asignado O controlador/administrador.
// Rate limit: 10 req/hora por user.id.
//
// IMPORTANTE: este endpoint NO guarda los datos en la tabla `avaluos` — solo
// devuelve el análisis. El valuador debe confirmar en la UI antes de aplicar.
// ─────────────────────────────────────────────────────────────

const MODEL = 'anthropic/claude-sonnet-4-5';
const CATEGORIAS_FOTO = ['fachada', 'portada', 'entorno', 'interior'] as const;
type CategoriaFoto = (typeof CATEGORIAS_FOTO)[number];

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const logger = createLogger('claude-vision:analizar-fotos');

// Rate limit compartido en memoria por el módulo — 10 req/hora por user.
const checkRate = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface AnalisisFotos {
  tipo_inmueble_observado?: string | null;
  estado_conservacion?: string | null;
  edad_aparente_anos?: number | null;
  num_niveles_observados?: number | null;
  materiales_fachada?: string | null;
  materiales_cubiertas?: string | null;
  calidad_acabados?: string | null;
  instalaciones_visibles?: {
    electricas?: string | null;
    hidraulicas?: string | null;
    gas?: boolean | null;
    clima?: boolean | null;
  } | null;
  entorno_urbano?: {
    tipo_zona?: string | null;
    calidad_vialidad?: string | null;
    infraestructura_visible?: string | null;
    construccion_predominante?: string | null;
  } | null;
  factores_positivos?: string[] | null;
  factores_negativos?: string[] | null;
  observaciones_tecnicas?: string | null;
  fotos_con_problemas?: Array<{ indice: number; problema: string }> | null;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: 'OPENROUTER_API_KEY no está configurada en el servidor.' },
        { status: 500 },
      );
    }

    const body = (await req.json()) as { avaluo_id?: string };
    const avaluoId = body.avaluo_id;
    if (!avaluoId || typeof avaluoId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Parámetro avaluo_id inválido o ausente.' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // ── AUTH ────────────────────────────────────────────────
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
    }

    // ── RATE LIMIT ──────────────────────────────────────────
    const rate = checkRate(`vision:${user.id}`);
    if (!rate.ok) {
      const retryMin = Math.ceil(rate.resetMs / 60_000);
      return NextResponse.json(
        {
          ok: false,
          error: `Límite de análisis alcanzado (10/hora). Intenta de nuevo en ${retryMin} min.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) },
        },
      );
    }

    // ── CARGAR AVALÚO Y VALIDAR PERMISO ─────────────────────
    const { data: avaluo, error: errAvaluo } = await supabase
      .from('avaluos')
      .select('id, valuador_id, controlador_id, estado')
      .eq('id', avaluoId)
      .single();

    if (errAvaluo || !avaluo) {
      return NextResponse.json(
        { ok: false, error: 'Avalúo no encontrado.' },
        { status: 404 },
      );
    }

    // Buscar el rol del usuario
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol, activo')
      .eq('id', user.id)
      .single();

    if (!perfil || !perfil.activo) {
      return NextResponse.json(
        { ok: false, error: 'Perfil inactivo o no encontrado.' },
        { status: 403 },
      );
    }

    const esDueno = avaluo.valuador_id === user.id;
    const esControlador = perfil.rol === 'controlador' || perfil.rol === 'administrador';

    if (!esDueno && !esControlador) {
      return NextResponse.json(
        { ok: false, error: 'No tienes permiso para analizar este expediente.' },
        { status: 403 },
      );
    }

    // ── CARGAR FOTOS (categorías fachada|portada|entorno|interior) ──
    const { data: docs, error: errDocs } = await supabase
      .from('documentos')
      .select('id, nombre, categoria, storage_path, tipo_mime')
      .eq('avaluo_id', avaluoId)
      .in('categoria', CATEGORIAS_FOTO as unknown as string[])
      .order('created_at', { ascending: true });

    if (errDocs) {
      logger.error('No se pudieron cargar documentos', { avaluoId, error: errDocs.message });
      return NextResponse.json(
        { ok: false, error: `Error al cargar fotos: ${errDocs.message}` },
        { status: 500 },
      );
    }

    const fotos = (docs ?? []).filter(
      (d) => d.tipo_mime && MIME_PERMITIDOS.has(d.tipo_mime),
    );

    if (fotos.length < 4) {
      return NextResponse.json(
        {
          ok: false,
          error: `Se requieren al menos 4 fotos de visita. Encontradas: ${fotos.length}.`,
        },
        { status: 400 },
      );
    }

    // ── SIGNED URLS (1 hora) ────────────────────────────────
    const fotosConUrl = await Promise.all(
      fotos.map(async (f) => {
        const { data, error } = await supabase.storage
          .from('documentos')
          .createSignedUrl(f.storage_path, 3600);
        return {
          id: f.id,
          nombre: f.nombre,
          categoria: (f.categoria as CategoriaFoto | null) ?? 'interior',
          url: data?.signedUrl ?? null,
          error: error?.message ?? null,
        };
      }),
    );

    const fotosValidas = fotosConUrl.filter((f) => f.url);
    if (fotosValidas.length < 4) {
      return NextResponse.json(
        { ok: false, error: 'No se pudieron generar URLs firmadas para las fotos.' },
        { status: 500 },
      );
    }

    // Ordenar por categoría para que la IA vea las fotos en bloques coherentes.
    const ordenCategoria: Record<CategoriaFoto, number> = {
      fachada: 0,
      portada: 1,
      entorno: 2,
      interior: 3,
    };
    fotosValidas.sort(
      (a, b) => ordenCategoria[a.categoria] - ordenCategoria[b.categoria],
    );

    // ── CONSTRUIR MENSAJE MULTIMODAL ────────────────────────
    const contentBlocks: ContentPart[] = [
      {
        type: 'text',
        text: `Eres un perito valuador inmobiliario mexicano experto. Analizarás ${fotosValidas.length} fotos de visita técnica de un inmueble. Están agrupadas por categoría: fachada, portada, entorno (vistas urbanas) e interior.

A continuación recibes las fotos numeradas, cada una con su categoría asignada por el valuador. Analízalas con criterio técnico y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin backticks, sin texto extra) con la siguiente estructura exacta:

{
  "tipo_inmueble_observado": "casa" | "departamento" | "local_comercial" | "oficina" | "terreno" | "bodega" | "nave_industrial" | "otro",
  "estado_conservacion": "excelente" | "bueno" | "regular" | "malo" | "ruinoso",
  "edad_aparente_anos": number (estimación del perito según materiales, estilo, desgaste),
  "num_niveles_observados": number,
  "materiales_fachada": "descripción concisa (ej: 'aplanado pintado sobre block, ventanas de aluminio')",
  "materiales_cubiertas": "descripción concisa (ej: 'losa de concreto', 'lámina galvanizada')",
  "calidad_acabados": "lujo" | "residencial" | "medio" | "economico" | "austero",
  "instalaciones_visibles": {
    "electricas": "descripción (ej: 'instalación oculta en buen estado', 'aparente con cables sueltos')",
    "hidraulicas": "descripción (ej: 'tinaco visible, cisterna')",
    "gas": true | false,
    "clima": true | false
  },
  "entorno_urbano": {
    "tipo_zona": "habitacional" | "comercial" | "mixto" | "industrial",
    "calidad_vialidad": "excelente" | "buena" | "regular" | "mala",
    "infraestructura_visible": "descripción (ej: 'banquetas, alumbrado público, pavimento en buen estado')",
    "construccion_predominante": "descripción de lo que predomina en la zona (ej: 'vivienda unifamiliar de 1-2 niveles')"
  },
  "factores_positivos": ["lista", "de", "factores", "positivos"],
  "factores_negativos": ["lista", "de", "factores", "negativos"],
  "observaciones_tecnicas": "párrafo breve con observaciones técnicas relevantes para el avalúo",
  "fotos_con_problemas": [
    { "indice": number (1-based del orden en que aparecen), "problema": "descripción del problema: borrosa, oscura, no corresponde a categoría, etc." }
  ]
}

REGLAS:
- Si un campo no se puede determinar con claridad, usa null en lugar de inventar.
- edad_aparente_anos: entero. Si no lo puedes estimar, null.
- fotos_con_problemas: array vacío si todas están bien.
- No devuelvas texto fuera del JSON. Solo el objeto.`,
      },
    ];

    let indice = 0;
    for (const foto of fotosValidas) {
      indice += 1;
      contentBlocks.push({
        type: 'text',
        text: `\n===== FOTO ${indice} — categoría: ${foto.categoria} (${foto.nombre}) =====`,
      });
      contentBlocks.push({
        type: 'image_url',
        image_url: { url: foto.url! },
      });
    }

    // ── LLAMADA A CLAUDE ────────────────────────────────────
    let respuesta;
    try {
      respuesta = await callOpenRouter({
        model: MODEL,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: contentBlocks }],
        extraHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://arqos.local',
          'X-Title': 'ARQOS - Análisis de fotos con Claude Vision',
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('OpenRouter falló', { avaluoId, error: msg });
      return NextResponse.json(
        { ok: false, error: `Error de OpenRouter: ${msg}` },
        { status: 502 },
      );
    }

    const raw = respuesta.content?.trim() ?? '';
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: 'La IA devolvió una respuesta vacía.', raw: '' },
        { status: 500 },
      );
    }

    // ── PARSEO TOLERANTE ────────────────────────────────────
    const intentar = (texto: string): unknown | null => {
      try {
        return JSON.parse(texto);
      } catch {
        return null;
      }
    };

    const limpio = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown = intentar(limpio);

    if (parsed === null) {
      const primero = limpio.indexOf('{');
      const ultimo = limpio.lastIndexOf('}');
      if (primero !== -1 && ultimo > primero) {
        parsed = intentar(limpio.slice(primero, ultimo + 1));
      }
    }

    if (parsed === null || typeof parsed !== 'object') {
      logger.warn('La IA no devolvió JSON válido', {
        avaluoId,
        preview: raw.slice(0, 300),
      });
      return NextResponse.json(
        {
          ok: false,
          error: 'La IA no pudo generar una respuesta estructurada. Intenta de nuevo.',
          raw: raw.slice(0, 1000),
        },
        { status: 500 },
      );
    }

    const analisis = parsed as AnalisisFotos;

    logger.info('Análisis de fotos completado', {
      avaluoId,
      userId: user.id,
      totalFotos: fotosValidas.length,
      tipo: analisis.tipo_inmueble_observado,
      estado: analisis.estado_conservacion,
    });

    return NextResponse.json(
      {
        ok: true,
        analisis,
        meta: {
          total_fotos: fotosValidas.length,
          fotos: fotosValidas.map((f, i) => ({
            indice: i + 1,
            id: f.id,
            nombre: f.nombre,
            categoria: f.categoria,
          })),
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    logger.error('Error inesperado', { error: msg });
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor: ' + msg },
      { status: 500 },
    );
  }
}
