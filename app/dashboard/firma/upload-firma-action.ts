'use server';

import { createClient } from '@/util/supabase/server';
import { revalidatePath } from 'next/cache';

export async function subirFirmaAction(storagePath: string): Promise<{ exito: boolean; error?: string; url?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { exito: false, error: 'No autenticado.' };

  // Guardar la URL del storage path en el perfil
  const { error: updateError } = await supabase
    .from('perfiles')
    .update({ firma_imagen_url: storagePath })
    .eq('id', user.id);

  if (updateError) {
    return { exito: false, error: `Error al guardar firma: ${updateError.message}` };
  }

  revalidatePath('/dashboard');
  return { exito: true, url: storagePath };
}

export async function obtenerFirmaAction(): Promise<{ url: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null };

  const { data } = await supabase
    .from('perfiles')
    .select('firma_imagen_url')
    .eq('id', user.id)
    .single();

  if (!data?.firma_imagen_url) return { url: null };

  // Generar signed URL para la imagen
  const { data: signedData } = await supabase.storage
    .from('documentos')
    .createSignedUrl(data.firma_imagen_url, 3600);

  return { url: signedData?.signedUrl ?? null };
}

export async function eliminarFirmaAction(): Promise<{ exito: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { exito: false, error: 'No autenticado.' };

  // Obtener path actual para eliminar del storage
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('firma_imagen_url')
    .eq('id', user.id)
    .single();

  if (perfil?.firma_imagen_url) {
    await supabase.storage.from('documentos').remove([perfil.firma_imagen_url]);
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ firma_imagen_url: null })
    .eq('id', user.id);

  if (error) return { exito: false, error: error.message };

  revalidatePath('/dashboard');
  return { exito: true };
}
