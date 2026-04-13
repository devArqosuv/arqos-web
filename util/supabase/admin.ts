import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente admin de Supabase con la service_role key.
 * SOLO puede ser importado desde server components, server actions o route handlers.
 * NUNCA debe usarse desde código del navegador.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'SUPABASE_SECRET_KEY no está configurada en .env.local. Es necesaria para operaciones admin.'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
