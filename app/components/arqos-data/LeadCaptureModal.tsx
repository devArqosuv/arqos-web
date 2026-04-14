'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Props {
  onSubmit: (datos: { nombre: string; email: string; telefono: string }) => void;
  loading?: boolean;
}

export function LeadCaptureModal({ onSubmit, loading }: Props) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!nombre.trim()) { setError('Ingresa tu nombre.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Ingresa un correo válido.'); return; }
    if (!telefono.trim() || telefono.length < 10) { setError('Ingresa un número de celular válido (10 dígitos).'); return; }
    setError(null);
    onSubmit({ nombre: nombre.trim(), email: email.trim().toLowerCase(), telefono: telefono.trim() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-white rounded-3xl border border-arqos-gray-200 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.12)] overflow-hidden">
        {/* Header */}
        <div className="bg-arqos-black px-8 py-6 text-center">
          <Sparkles className="w-6 h-6 text-arqos-gray-400 mx-auto mb-3" />
          <h3 className="text-xl font-black text-white font-[family-name:var(--font-playfair)]">
            Tu estimación está lista
          </h3>
          <p className="text-xs text-arqos-gray-400 mt-2">
            Ingresa tus datos para ver el resultado
          </p>
        </div>

        <div className="px-8 py-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black placeholder:text-arqos-gray-400 focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black placeholder:text-arqos-gray-400 focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
              Celular
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+\s()-]/g, ''))}
              placeholder="442 123 4567"
              maxLength={15}
              className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black placeholder:text-arqos-gray-400 focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-arqos-black text-arqos-white text-sm font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-arqos-gray-800 disabled:bg-arqos-gray-300 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-arqos-gray-400 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              'Ver mi estimación'
            )}
          </button>

          <p className="text-[9px] text-arqos-gray-400 text-center leading-relaxed">
            Al continuar, aceptas que ARQOS almacene tus datos para contactarte sobre servicios de valuación.
            No compartimos tu información con terceros.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
