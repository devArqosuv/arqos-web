import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

const logger = createLogger('mapbox-reverse');

const rateLimit = createRateLimiter({
  limit: 60,
  windowMs: 60 * 60 * 1000, // 1h
});

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip);

  if (!rl.ok) {
    const resetSeconds = Math.ceil(rl.resetMs / 1000);
    logger.warn('rate_limit_exceeded', { ip, resetSeconds });
    return NextResponse.json(
      { error: 'rate_limit', resetInSeconds: resetSeconds },
      { status: 429, headers: { 'Retry-After': String(resetSeconds) } },
    );
  }

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    logger.error('missing_mapbox_secret_token');
    return NextResponse.json(
      { error: 'MAPBOX_SECRET_TOKEN no configurado en el servidor.' },
      { status: 500 },
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const lat = latStr ? Number(latStr) : NaN;
  const lng = lngStr ? Number(lngStr) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: 'Parámetros "lat" y "lng" requeridos y numéricos.' },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: 'Coordenadas fuera de rango.' },
      { status: 400 },
    );
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      logger.error('mapbox_failed', { ip, status: res.status, body: body.slice(0, 200) });
      return NextResponse.json(
        { error: `Mapbox respondió ${res.status}.` },
        { status: 502 },
      );
    }
    const data: unknown = await res.json();
    logger.info('request_success', { ip });
    return NextResponse.json(data);
  } catch (err) {
    logger.error('unhandled_error', {
      ip,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
