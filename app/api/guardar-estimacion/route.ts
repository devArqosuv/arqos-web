import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRateLimiter, getClientIp } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

// Usa el service role para insertar sin auth (el portal es público)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const logger = createLogger('guardar-estimacion');

const rateLimit = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000, // 1h
});

interface GuardarRequest {
  // Lead
  nombre: string;
  email: string;
  telefono: string;
  // Inmueble
  direccion: string;
  tipo_inmueble: string;
  superficie: number;
  recamaras: number;
  // Resultado IA
  valor_bajo: number;
  valor_centro: number;
  valor_alto: number;
  precio_m2?: number;
  ciudad_detectada?: string;
  zona_detectada?: string;
  justificacion?: string;
  factores?: string[];
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
    const body = (await req.json()) as GuardarRequest;

    if (!body.nombre || !body.email || !body.direccion) {
      logger.warn('incomplete_data', { ip });
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    logger.info('request_start', { ip, email: body.email, tipo: body.tipo_inmueble });

    const { data, error } = await supabase
      .from('estimaciones_portal')
      .insert({
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono || null,
        direccion: body.direccion,
        tipo_inmueble: body.tipo_inmueble,
        superficie: body.superficie || null,
        recamaras: body.recamaras || null,
        valor_bajo: body.valor_bajo || null,
        valor_centro: body.valor_centro || null,
        valor_alto: body.valor_alto || null,
        precio_m2: body.precio_m2 || null,
        ciudad_detectada: body.ciudad_detectada || null,
        zona_detectada: body.zona_detectada || null,
        justificacion: body.justificacion || null,
        factores: body.factores ? JSON.stringify(body.factores) : null,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('db_insert_failed', {
        ip,
        error: error.message,
        latencyMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: 'Error al guardar.' }, { status: 500 });
    }

    logger.info('request_success', {
      ip,
      id: data.id,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({ exito: true, id: data.id });
  } catch (error) {
    logger.error('unhandled_error', {
      ip,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
