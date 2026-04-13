'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { subirFirmaAction, obtenerFirmaAction, eliminarFirmaAction } from '../dashboard/firma/upload-firma-action';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Props {
  userId: string;
  abierto: boolean;
  onClose: () => void;
}

export default function FirmaUploadModal({ userId, abierto, onClose }: Props) {
  const [firmaUrl, setFirmaUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar firma existente
  useEffect(() => {
    if (!abierto) return;
    setCargando(true);
    obtenerFirmaAction().then((res) => {
      setFirmaUrl(res.url);
      setCargando(false);
    });
  }, [abierto]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMensaje({ tipo: 'error', texto: 'Solo se aceptan imágenes PNG, JPG o WEBP.' });
      return;
    }
    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMensaje({ tipo: 'error', texto: 'La imagen no puede pesar más de 2 MB.' });
      return;
    }

    setMensaje(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const storagePath = `firmas/${userId}/firma-${Date.now()}.${ext}`;

    // Subir directamente a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setMensaje({ tipo: 'error', texto: `Error al subir: ${uploadError.message}` });
      return;
    }

    // Guardar referencia en perfil
    startTransition(async () => {
      const res = await subirFirmaAction(storagePath);
      if (res.exito) {
        // Obtener signed URL de la nueva firma
        const { url } = await obtenerFirmaAction();
        setFirmaUrl(url);
        setMensaje({ tipo: 'exito', texto: 'Firma guardada correctamente.' });
      } else {
        setMensaje({ tipo: 'error', texto: res.error || 'Error al guardar firma.' });
      }
    });
  };

  const handleEliminar = () => {
    startTransition(async () => {
      const res = await eliminarFirmaAction();
      if (res.exito) {
        setFirmaUrl(null);
        setMensaje({ tipo: 'exito', texto: 'Firma eliminada.' });
      } else {
        setMensaje({ tipo: 'error', texto: res.error || 'Error al eliminar.' });
      }
    });
  };

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-black text-slate-900">Mi Firma Digital</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Sube una imagen de tu firma (PNG o JPG, fondo transparente o blanco). Se incluirá en los dictámenes PDF que firmes.
        </p>

        {/* Preview de firma actual */}
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 mb-4 flex items-center justify-center min-h-[120px] bg-slate-50">
          {cargando ? (
            <p className="text-xs text-slate-400 animate-pulse">Cargando...</p>
          ) : firmaUrl ? (
            <img
              src={firmaUrl}
              alt="Tu firma"
              className="max-h-[100px] max-w-full object-contain"
            />
          ) : (
            <div className="text-center">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p className="text-xs text-slate-400">No hay firma cargada</p>
            </div>
          )}
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`rounded-lg px-3 py-2 text-xs font-semibold mb-4 ${
            mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition"
          >
            {pending ? 'GUARDANDO...' : firmaUrl ? 'CAMBIAR FIRMA' : 'SUBIR FIRMA'}
          </button>
          {firmaUrl && (
            <button
              type="button"
              onClick={handleEliminar}
              disabled={pending}
              className="py-3 px-4 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-xl text-xs font-bold transition"
            >
              ELIMINAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
