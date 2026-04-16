'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home } from 'lucide-react';

interface Props {
  abierto: boolean;
  onClose: () => void;
  // Datos prellenados con los que se capturó el lead — así el cliente
  // no tiene que escribir dos veces lo mismo.
  defaults?: { nombre?: string; email?: string; telefono?: string };
  // El estimacion_id del portal (fila en `estimaciones_portal`).
  estimacionId: string | null;
}

// Modal "Solicitar avalúo formal": recibe los datos del cliente,
// crea su cuenta con rol 'cliente' y genera el expediente en `avaluos`.
// Al éxito redirige al /login con mensaje.
export function SolicitarInformeModal({ abierto, onClose, defaults, estimacionId }: Props) {
  const [nombre, setNombre] = useState(defaults?.nombre ?? '');
  const [email, setEmail] = useState(defaults?.email ?? '');
  const [telefono, setTelefono] = useState(defaults?.telefono ?? '');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar los defaults cuando se abra el modal con valores nuevos.
  useEffect(() => {
    if (abierto) {
      setNombre(defaults?.nombre ?? '');
      setEmail(defaults?.email ?? '');
      setTelefono(defaults?.telefono ?? '');
      setPassword('');
      setPassword2('');
      setError(null);
    }
  }, [abierto, defaults?.nombre, defaults?.email, defaults?.telefono]);

  const handleSubmit = async () => {
    if (!estimacionId) {
      setError('No hay una estimación base. Vuelve a calcular.');
      return;
    }
    if (!nombre.trim()) { setError('Ingresa tu nombre.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Ingresa un correo válido.'); return; }
    if (!telefono.trim() || telefono.replace(/\D/g, '').length < 10) {
      setError('Ingresa un número válido (10 dígitos).');
      return;
    }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return; }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/solicitar-informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimacion_id: estimacionId,
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`);
      }
      // Redirige al login con mensaje de éxito.
      window.location.href = '/login?registro=ok';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-3xl border border-arqos-gray-200 shadow-2xl overflow-hidden">
              <div className="bg-arqos-black px-8 py-6 text-center relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-arqos-gray-400 hover:text-white text-2xl leading-none"
                  aria-label="Cerrar"
                >
                  ×
                </button>
                <Home className="w-6 h-6 text-arqos-gray-400 mx-auto mb-3" />
                <h3 className="text-xl font-black text-white font-[family-name:var(--font-playfair)]">
                  Solicitar avalúo formal
                </h3>
                <p className="text-xs text-arqos-gray-400 mt-2">
                  Creamos tu cuenta y tu expediente en ARQOS
                </p>
              </div>

              <div className="px-8 py-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
                    Celular
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+\s()-]/g, ''))}
                    maxLength={15}
                    className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mín 6 caracteres"
                      className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-1.5">
                      Repetir
                    </label>
                    <input
                      type="password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      className="w-full px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
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
                      Creando tu cuenta...
                    </>
                  ) : (
                    'Crear cuenta y solicitar avalúo'
                  )}
                </button>

                <p className="text-[9px] text-arqos-gray-400 text-center leading-relaxed">
                  Al continuar aceptas que ARQOS cree un expediente con los datos del preavalúo.
                  Un valuador certificado será asignado para completar la evaluación formal.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
