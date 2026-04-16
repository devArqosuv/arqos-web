import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getClientIp } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

const logger = createLogger('mapbox-geocode');

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
  const q = searchParams.get('q')?.trim() ?? '';
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam ?? '5', 10) || 5, 1), 10);

  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: 'Query "q" debe tener al menos 3 caracteres.' },
      { status: 400 },
    );
  }

  const encoded = encodeURIComponent(q);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=mx&types=address,poi,place&limit=${limit}&access_token=${token}`;

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
    logger.info('request_success', { ip, q_length: q.length });
    return NextResponse.json(data);
  } catch (err) {
    logger.error('unhandled_error', {
      ip,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
