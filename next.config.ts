import type { NextConfig } from 'next';

// ─────────────────────────────────────────────────────────────
// Content Security Policy
//
// Política conservadora pero compatible con lo que Next.js necesita:
//  - 'unsafe-inline' en style-src: Next inyecta estilos inline por SSR
//  - 'unsafe-eval' / 'unsafe-inline' en script-src: requerido por React
//    refresh en dev y por RSC payload inlining en prod
//  - Supabase: connect para la API + storage + realtime (wss)
//  - OpenRouter: connect para llamadas de IA
//  - blob:/data: en img-src: previews de archivos subidos en cliente
//
// frame-ancestors 'none' = no se puede embeber ARQOS en iframes
// (refuerzo de X-Frame-Options: DENY)
// ─────────────────────────────────────────────────────────────
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://openrouter.ai;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  {
    // Fuerza HTTPS en el navegador por 2 años.
    // Sólo tiene efecto cuando el sitio se sirve por HTTPS (en dev local por
    // HTTP el navegador lo ignora).
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // Previene clickjacking: nadie puede embeber ARQOS en un iframe.
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Evita que el navegador "adivine" el MIME type y ejecute cosas raras.
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Controla qué info del Referer se envía a dominios externos.
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Deshabilita APIs del navegador que no usamos — si un atacante logra
    // inyectar JS, no puede acceder a cámara/micrófono/geo/etc.
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
