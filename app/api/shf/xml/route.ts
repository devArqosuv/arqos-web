// =============================================================
// GET /api/shf/xml?id={avaluoId}
// =============================================================
//
// Valida primero con el motor regulatorio; si hay errores duros
// devuelve 400 + JSON con los errores. Si pasa, devuelve el XML con
// Content-Disposition: attachment para descarga.
//
// Requiere rol admin o controlador. Rate limited a 30 req/h por usuario.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/util/logger';
import { createClient } from '@/util/supabase/server';
import { checkRateLimit, requireAdminOControlador } from '@/util/shf/auth';
import { cargarAvaluoConComparables } from '@/util/shf/fetcher';
import { validarAvaluoParaSHF } from '@/util/shf/validador';
import { generarXmlSHF } from '@/util/shf/xml';

const logger = createLogger('shf-xml');

export async function GET(req: NextRequest) {
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

  const avaluoId = req.nextUrl.searchParams.get('id');
  if (!avaluoId) {
    return NextResponse.json({ error: 'Parámetro ?id requerido.' }, { status: 400 });
  }

  const supabase = await createClient();
  const cargado = await cargarAvaluoConComparables(supabase, avaluoId);
  if (!cargado) {
    logger.info('avaluo_not_found', { avaluoId });
    return NextResponse.json({ error: 'Avalúo no encontrado.' }, { status: 404 });
  }

  const validacion = validarAvaluoParaSHF(cargado.avaluo, cargado.comparables);
  if (!validacion.valido) {
    logger.info('validacion_fallo', {
      avaluoId,
      errores: validacion.errores.length,
    });
    return NextResponse.json(
      {
        error: 'validacion_fallo',
        mensaje: 'El avalúo no cumple los requisitos SHF.',
        validacion,
      },
      { status: 400 },
    );
  }

  const xml = generarXmlSHF(cargado.avaluo, cargado.comparables);
  const folioLimpio = (cargado.avaluo.folio ?? avaluoId).replace(/[^a-zA-Z0-9_-]/g, '_');

  logger.info('xml_generado', {
    avaluoId,
    folio: cargado.avaluo.folio,
    bytes: xml.length,
    comparables: cargado.comparables.length,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="avaluo-${folioLimpio}.xml"`,
      'Cache-Control': 'no-store',
    },
  });
}
