'use server';

import { revalidatePath } from 'next/cache';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { createClient } from '@/util/supabase/server';
import { AvaluoPdfDocument, type AvaluoPdfData } from '../controlador/expedientes/[id]/AvaluoPdfDocument';

type Resultado = { exito: boolean; mensaje: string; pdfPath?: string };

const ESTADOS_CONTROLADOR = ['firma'];

// ────────────────────────────────────────────────────────────
// FIRMAR COMO CONTROLADOR (UV)
// Solo cuando estado === 'firma' y firmado_uv === false
// El estado NO cambia (sigue en 'firma' esperando al valuador)
// ────────────────────────────────────────────────────────────
export async function firmarUVAction(avaluoId: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { exito: false, mensaje: 'No autenticado.' };

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol, nombre, apellidos')
      .eq('id', user.id)
      .single();

    if (perfil?.rol !== 'controlador' && perfil?.rol !== 'administrador') {
      return { exito: false, mensaje: 'Esta acción requiere rol controlador.' };
    }

    const { data: avaluo } = await supabase
      .from('avaluos')
      .select('id, estado, controlador_id, firmado_uv')
      .eq('id', avaluoId)
      .single();

    if (!avaluo) return { exito: false, mensaje: 'Avalúo no encontrado.' };
    if (!ESTADOS_CONTROLADOR.includes(avaluo.estado)) {
      return { exito: false, mensaje: `El avalúo está en estado "${avaluo.estado}". Solo se puede firmar desde "firma".` };
    }
    if (avaluo.controlador_id !== user.id) {
      return { exito: false, mensaje: 'Este avalúo no está asignado a ti como controlador.' };
    }
    if (avaluo.firmado_uv) {
      return { exito: false, mensaje: 'Ya firmaste este avalúo.' };
    }

    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({
        firmado_uv: true,
        fecha_firma_uv: new Date().toISOString(),
      })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al firmar: ${errUpdate.message}` };
    }

    // Registrar en historial
    await supabase.from('avaluo_historial').insert({
      avaluo_id: avaluoId,
      estado_anterior: 'firma',
      estado_nuevo: 'firma',
      usuario_id: user.id,
      comentario: `Firma del controlador: ${perfil.nombre} ${perfil.apellidos ?? ''}`.trim(),
    });

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/evaluador/expedientes/${avaluoId}`);

    return { exito: true, mensaje: 'Firmaste correctamente. Esperando firma del valuador.' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// FIRMAR COMO VALUADOR
// Solo cuando estado === 'firma' y firmado_uv === true (controlador ya firmó)
// Al firmar: genera el PDF, lo sube a Storage, y transiciona firma → aprobado
// ────────────────────────────────────────────────────────────
export async function firmarValuadorAction(avaluoId: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { exito: false, mensaje: 'No autenticado.' };

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol, nombre, apellidos')
      .eq('id', user.id)
      .single();

    if (perfil?.rol !== 'evaluador' && perfil?.rol !== 'administrador') {
      return { exito: false, mensaje: 'Esta acción requiere rol valuador.' };
    }

    // Cargar el avalúo con todo lo necesario para el PDF
    const { data: avaluo } = await supabase
      .from('avaluos')
      .select(`
        id, folio, estado, calle, colonia, numero_ext, numero_int, municipio, estado_inmueble,
        tipo_inmueble, superficie_terreno, superficie_construccion,
        valor_uv, valor_valuador, moneda, notas,
        uso_suelo, banco_id,
        fecha_solicitud, fecha_visita_realizada,
        firmado_uv, firmado_valuador, fecha_firma_uv,
        valuador_id, solicitante_id, controlador_id
      `)
      .eq('id', avaluoId)
      .single();

    if (!avaluo) return { exito: false, mensaje: 'Avalúo no encontrado.' };
    if (avaluo.estado !== 'firma') {
      return { exito: false, mensaje: `El avalúo está en estado "${avaluo.estado}". Solo se puede firmar desde "firma".` };
    }
    if (avaluo.valuador_id !== user.id && avaluo.solicitante_id !== user.id) {
      return { exito: false, mensaje: 'Este avalúo no está asignado a ti.' };
    }
    if (!avaluo.firmado_uv) {
      return { exito: false, mensaje: 'El controlador (UV) aún no ha firmado.' };
    }
    if (avaluo.firmado_valuador) {
      return { exito: false, mensaje: 'Ya firmaste este avalúo.' };
    }

    // Marcar firma del valuador
    const ahora = new Date().toISOString();
    const { error: errUpdate } = await supabase
      .from('avaluos')
      .update({
        firmado_valuador: true,
        fecha_firma_valuador: ahora,
      })
      .eq('id', avaluoId);

    if (errUpdate) {
      return { exito: false, mensaje: `Error al firmar: ${errUpdate.message}` };
    }

    // ── Cargar todo lo necesario para el PDF ──
    // Perfil del controlador
    let nombreControlador = '—';
    if (avaluo.controlador_id) {
      const { data: ctrl } = await supabase
        .from('perfiles')
        .select('nombre, apellidos')
        .eq('id', avaluo.controlador_id)
        .single();
      if (ctrl) nombreControlador = `${ctrl.nombre} ${ctrl.apellidos ?? ''}`.trim();
    }
    const nombreValuador = `${perfil.nombre} ${perfil.apellidos ?? ''}`.trim();

    // Banco (si aplica)
    let nombreBanco: string | null = null;
    if (avaluo.banco_id) {
      const { data: banco } = await supabase
        .from('bancos')
        .select('nombre')
        .eq('id', avaluo.banco_id)
        .single();
      if (banco) nombreBanco = banco.nombre;
    }

    // Comparables
    const { data: comparables } = await supabase
      .from('comparables')
      .select('municipio, estado_inmueble, superficie_construccion, precio, precio_m2, fuente')
      .eq('avaluo_id', avaluoId);

    // Documentos del expediente (categoria='documento')
    const { data: docsExpediente } = await supabase
      .from('documentos')
      .select('nombre, categoria, storage_path')
      .eq('avaluo_id', avaluoId);

    const documentos_expediente = (docsExpediente ?? [])
      .filter((d) => d.categoria === 'documento')
      .map((d) => d.nombre);

    // Fotos: necesitamos URLs firmadas para que @react-pdf/renderer las pueda incrustar
    const fachadaPath = (docsExpediente ?? []).find((d) => d.categoria === 'fachada')?.storage_path ?? null;
    const entornoPaths = (docsExpediente ?? []).filter((d) => d.categoria === 'entorno').map((d) => d.storage_path);
    const interiorPaths = (docsExpediente ?? []).filter((d) => d.categoria === 'interior').map((d) => d.storage_path);

    const firmarPath = async (path: string | null): Promise<string | null> => {
      if (!path) return null;
      const { data: signed } = await supabase.storage
        .from('documentos')
        .createSignedUrl(path, 60 * 10);  // 10 min, suficiente para que el render lo descargue
      return signed?.signedUrl ?? null;
    };

    const fachadaUrl = await firmarPath(fachadaPath);
    const entornoUrls = (await Promise.all(entornoPaths.map(firmarPath))).filter((u): u is string => !!u);
    const interiorUrls = (await Promise.all(interiorPaths.map(firmarPath))).filter((u): u is string => !!u);

    // Detectar tipo de avalúo desde notas (lo guardamos así en Fase 1)
    const tipoAvaluo = avaluo.notas?.includes('1.0') ? '1.0' : '2.0';

    // Detectar clave catastral en notas (formato "Clave catastral: XYZ")
    let claveCatastral: string | null = null;
    if (avaluo.notas) {
      const match = avaluo.notas.match(/Clave catastral:\s*(.+)/i);
      if (match) claveCatastral = match[1].split('\n')[0].trim();
    }

    const direccion = [
      avaluo.calle,
      avaluo.numero_ext,
      avaluo.numero_int ? `Int. ${avaluo.numero_int}` : null,
      avaluo.colonia,
    ]
      .filter(Boolean)
      .join(' ');

    const valorFinal = Number(avaluo.valor_valuador ?? avaluo.valor_uv ?? 0);

    // Construir data del PDF
    const pdfData: AvaluoPdfData = {
      folio: avaluo.folio,
      fechaEmision: ahora,
      direccion,
      municipio: avaluo.municipio,
      estado_inmueble: avaluo.estado_inmueble,
      tipo_inmueble: avaluo.tipo_inmueble,
      superficie_terreno: avaluo.superficie_terreno ? Number(avaluo.superficie_terreno) : null,
      superficie_construccion: avaluo.superficie_construccion ? Number(avaluo.superficie_construccion) : null,
      uso_suelo: avaluo.uso_suelo,
      clave_catastral: claveCatastral,
      fecha_solicitud: avaluo.fecha_solicitud,
      fecha_visita_realizada: avaluo.fecha_visita_realizada,
      banco: nombreBanco,
      tipo_avaluo: tipoAvaluo,
      valor_uv: avaluo.valor_uv ? Number(avaluo.valor_uv) : null,
      valor_valuador: avaluo.valor_valuador ? Number(avaluo.valor_valuador) : null,
      valor_final: valorFinal,
      moneda: avaluo.moneda ?? 'MXN',
      firma_uv: avaluo.fecha_firma_uv
        ? { nombre: nombreControlador, fecha: avaluo.fecha_firma_uv }
        : null,
      firma_valuador: { nombre: nombreValuador, fecha: ahora },
      comparables: (comparables ?? []).map((c) => ({
        municipio: c.municipio,
        estado_inmueble: c.estado_inmueble,
        superficie_construccion: c.superficie_construccion ? Number(c.superficie_construccion) : null,
        precio: Number(c.precio),
        precio_m2: c.precio_m2 ? Number(c.precio_m2) : null,
        fuente: c.fuente,
      })),
      documentos_expediente,
      fotos: {
        fachada: fachadaUrl,
        entorno: entornoUrls,
        interior: interiorUrls,
      },
    };

    // Generar PDF
    // El cast es necesario porque @react-pdf/renderer espera un ReactElement<DocumentProps>
    // y nuestro componente devuelve un Document — son equivalentes en runtime.
    let pdfBuffer: Buffer;
    try {
      const element = createElement(AvaluoPdfDocument, { data: pdfData }) as unknown as ReactElement<DocumentProps>;
      pdfBuffer = await renderToBuffer(element);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      return { exito: false, mensaje: `Error al generar PDF: ${msg}` };
    }

    // Subir a Storage
    const pdfPath = `avaluos/${avaluoId}/oficial-${Date.now()}.pdf`;
    const { error: errUpload } = await supabase.storage
      .from('documentos')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (errUpload) {
      return { exito: false, mensaje: `Error al subir PDF: ${errUpload.message}` };
    }

    // Registrar el PDF en la tabla documentos
    await supabase.from('documentos').insert({
      avaluo_id: avaluoId,
      nombre: 'Avalúo oficial firmado',
      descripcion: 'PDF oficial generado tras firmas de UV y Valuador',
      bucket: 'documentos',
      storage_path: pdfPath,
      tipo_mime: 'application/pdf',
      tamanio_bytes: pdfBuffer.length,
      categoria: 'otro',
      firmado: true,
      fecha_firma: ahora,
      firmado_por: user.id,
      created_by: user.id,
    });

    // Guardar la ruta en avaluos
    await supabase
      .from('avaluos')
      .update({
        pdf_oficial_path: pdfPath,
        pdf_oficial_generado_at: ahora,
      })
      .eq('id', avaluoId);

    // Transicionar firma → aprobado
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_cambiar_estado_avaluo', {
      p_avaluo_id: avaluoId,
      p_nuevo_estado: 'aprobado',
      p_usuario_id: user.id,
      p_comentario: `Firma final del valuador: ${nombreValuador}. PDF oficial generado.`,
    });

    if (rpcError || !rpcData?.exito) {
      return { exito: false, mensaje: rpcData?.mensaje || rpcError?.message || 'No se pudo aprobar el avalúo.' };
    }

    revalidatePath(`/dashboard/controlador/expedientes/${avaluoId}`);
    revalidatePath(`/dashboard/evaluador/expedientes/${avaluoId}`);

    return {
      exito: true,
      mensaje: 'Firmaste correctamente. Avalúo aprobado y PDF oficial generado.',
      pdfPath,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { exito: false, mensaje: msg };
  }
}

// ────────────────────────────────────────────────────────────
// OBTENER URL FIRMADA DEL PDF OFICIAL
// (Para descarga desde el navegador)
// ────────────────────────────────────────────────────────────
export async function obtenerUrlPdfOficialAction(avaluoId: string): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { url: null, error: 'No autenticado.' };

    const { data: avaluo } = await supabase
      .from('avaluos')
      .select('pdf_oficial_path, valuador_id, solicitante_id, controlador_id')
      .eq('id', avaluoId)
      .single();

    if (!avaluo) return { url: null, error: 'Avalúo no encontrado.' };
    if (!avaluo.pdf_oficial_path) return { url: null, error: 'El PDF oficial aún no ha sido generado.' };

    // Verificar permiso
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single();
    const esAdmin = perfil?.rol === 'administrador';
    const esRelacionado =
      avaluo.valuador_id === user.id ||
      avaluo.solicitante_id === user.id ||
      avaluo.controlador_id === user.id;

    if (!esAdmin && !esRelacionado) {
      return { url: null, error: 'No tienes permiso para descargar este documento.' };
    }

    const { data: signed, error: errSigned } = await supabase.storage
      .from('documentos')
      .createSignedUrl(avaluo.pdf_oficial_path, 60 * 5); // 5 min

    if (errSigned || !signed) {
      return { url: null, error: errSigned?.message || 'No se pudo generar el enlace de descarga.' };
    }

    return { url: signed.signedUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return { url: null, error: msg };
  }
}
