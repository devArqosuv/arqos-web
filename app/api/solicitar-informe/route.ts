import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRateLimiter, getClientIp } from '@/util/rate-limit';
import { createLogger } from '@/util/logger';

// Lazy init para evitar que el build collect-page-data falle si
// faltan env vars. NO crear cliente a nivel módulo.
function getAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const logger = createLogger('solicitar-informe');

// Rate-limit por IP: protege el endpoint de creación masiva de cuentas.
const rateLimit = createRateLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1h
});

interface SolicitarRequest {
  estimacion_id: string;
  nombre: string;
  email: string;
  telefono: string;
  password: string;
}

// Mapeo del tipo del portal → enum tipo_inmueble de la tabla avaluos.
function mapearTipoInmueble(tipo: string | null | undefined): string {
  const valido = new Set([
    'casa', 'departamento', 'local_comercial', 'oficina',
    'terreno', 'bodega', 'nave_industrial', 'otro',
  ]);
  const valor = (tipo ?? '').toLowerCase();
  return valido.has(valor) ? valor : 'otro';
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
      { status: 429, headers: { 'Retry-After': String(resetSeconds) } },
    );
  }

  let body: SolicitarRequest;
  try {
    body = (await req.json()) as SolicitarRequest;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  // Validación básica
  const { estimacion_id, nombre, email, telefono, password } = body;
  if (!estimacion_id || !nombre?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 6 caracteres.' },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  try {
    const supabase = getAdminSupabase();

    // 1. Traer la estimación base del portal
    const { data: estimacion, error: errEst } = await supabase
      .from('estimaciones_portal')
      .select('*')
      .eq('id', estimacion_id)
      .single();

    if (errEst || !estimacion) {
      logger.warn('estimacion_no_encontrada', { ip, estimacion_id });
      return NextResponse.json({ error: 'Estimación no encontrada.' }, { status: 404 });
    }

    // 2. Crear usuario via auth admin (service role).
    //    email_confirm: true para evitar el flujo de verificación —
    //    ya confirmamos el lead al capturarlo.
    const { data: auth, error: errAuth } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre.trim(), rol: 'cliente' },
    });

    if (errAuth || !auth.user) {
      const msg = errAuth?.message || '';
      const yaExiste = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist');
      logger.warn('auth_create_failed', { ip, email, error: msg });
      return NextResponse.json(
        { error: yaExiste ? 'Ese email ya está registrado. Inicia sesión.' : msg || 'No se pudo crear la cuenta.' },
        { status: yaExiste ? 409 : 500 },
      );
    }

    const clienteId = auth.user.id;

    // 3. Insertar/actualizar perfil con rol 'cliente'.
    //    Es upsert porque puede existir un trigger on_auth_user_created
    //    que cree el perfil vacío — respetamos lo que haya y sólo reforzamos
    //    los datos finales.
    const { error: errPerfil } = await supabase
      .from('perfiles')
      .upsert({
        id: clienteId,
        email: email.trim(),
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null,
        rol: 'cliente',
        activo: true,
      }, { onConflict: 'id' });

    if (errPerfil) {
      logger.error('perfil_upsert_failed', { ip, clienteId, error: errPerfil.message });
      // Intentar limpiar el usuario creado para evitar estado inconsistente.
      await supabase.auth.admin.deleteUser(clienteId).catch(() => undefined);
      return NextResponse.json({ error: 'Error al crear perfil.' }, { status: 500 });
    }

    // 4. Construir payload mínimo para el expediente en `avaluos`.
    //    Usamos los datos del preavaluo como punto de partida; los campos
    //    NOT NULL deben llevar valor, así que tomamos defaults seguros.
    const direccionBruta: string = estimacion.direccion || 'Dirección pendiente';
    const superficie = estimacion.superficie ? Number(estimacion.superficie) : null;
    const recamaras = estimacion.recamaras ? Number(estimacion.recamaras) : null;
    const valorEstimado = estimacion.valor_centro ? Number(estimacion.valor_centro) : null;

    const avaluoInsert: Record<string, unknown> = {
      calle: direccionBruta,
      municipio: estimacion.ciudad_detectada || 'Por definir',
      estado_inmueble: 'Por definir',
      colonia: estimacion.zona_detectada || null,
      tipo_inmueble: mapearTipoInmueble(estimacion.tipo_inmueble),
      superficie_construccion: superficie,
      num_recamaras: recamaras,
      valor_estimado: valorEstimado,
      estado: 'solicitud',
      origen: 'cliente_portal',
      cliente_id: clienteId,
      solicitante_id: clienteId,
      notas: `Expediente generado desde ARQOS Data (estimación ${estimacion_id}).`,
    };

    const { data: avaluo, error: errAv } = await supabase
      .from('avaluos')
      .insert(avaluoInsert)
      .select('id, folio')
      .single();

    if (errAv || !avaluo) {
      logger.error('avaluo_insert_failed', { ip, clienteId, error: errAv?.message });
      return NextResponse.json({ error: 'Error al crear expediente.' }, { status: 500 });
    }

    // 5. Actualizar la estimación: la marcamos como "solicitó avalúo" y no atendida todavía.
    const { error: errUpd } = await supabase
      .from('estimaciones_portal')
      .update({
        solicito_avaluo: true,
        atendida: false,
        cliente_id: clienteId,
        avaluo_id: avaluo.id,
      })
      .eq('id', estimacion_id);

    if (errUpd) {
      // No es fatal: el expediente y la cuenta ya existen. Sólo lo anotamos.
      logger.warn('estimacion_update_failed', { ip, estimacion_id, error: errUpd.message });
    }

    logger.info('request_success', {
      ip,
      clienteId,
      avaluoId: avaluo.id,
      estimacion_id,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      cliente_id: clienteId,
      avaluo_id: avaluo.id,
      folio: avaluo.folio ?? null,
    });
  } catch (error) {
    logger.error('unhandled_error', {
      ip,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
