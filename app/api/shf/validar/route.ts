// =============================================================
// POST /api/shf/validar
// =============================================================
//
// Body: { avaluo_id: string }
// Respuesta: ValidacionSHF  (ver util/shf/types.ts)
//
// Requiere rol admin o controlador. Rate limited a 30 req/h por usuario.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/util/logger';
import { createClient } from '@/util/supabase/server';
import { checkRateLimit, requireAdminOControlador } from '@/util/shf/auth';
import { cargarAvaluoConComparables } from '@/util/shf/fetcher';
import { validarAvaluoParaSHF } from '@/util/shf/validador';

const logger = createLogger('shf-validar');

export async function POST(req: NextRequest) {
  const auth = await requireAdminOControlador();
  if (!auth.ok) {
    logger.warn('auth_failed', { status: auth.status });
    return NextResponse.json({ error: auth.mensaje }, { status: auth.status });
  }

  const rl = checkRateLimit(auth.sesion.userId);
  if (!rl.ok) {
    const resetSeconds = Math.ceil(rl.resetMs / 1000);
    logger.warn('rate_limit_exceeded', { userId: auth.sesion.userId, resetSeconds });
    return NextResponse.json(
      { error: 'rate_limit', resetInSeconds: resetSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(resetSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const avaluoId = (body as { avaluo_id?: unknown })?.avaluo_id;
  if (typeof avaluoId !== 'string' || avaluoId.length === 0) {
    return NextResponse.json({ error: 'avaluo_id requerido.' }, { status: 400 });
  }

  const supabase = await createClient();
  const cargado = await cargarAvaluoConComparables(supabase, avaluoId);
  if (!cargado) {
    logger.info('avaluo_not_found', { avaluoId });
    return NextResponse.json({ error: 'Avalúo no encontrado.' }, { status: 404 });
  }

  const resultado = validarAvaluoParaSHF(cargado.avaluo, cargado.comparables);
  logger.info('validado', {
    avaluoId,
    valido: resultado.valido,
    errores: resultado.errores.length,
    camposCompletos: resultado.camposCompletos,
    camposTotal: resultado.camposTotal,
  });

  return NextResponse.json(resultado);
}
