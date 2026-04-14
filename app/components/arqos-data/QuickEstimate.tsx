'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ResultCard } from './ResultCard';
import { LeadCaptureModal } from './LeadCaptureModal';

const TIPOS = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'local_comercial', label: 'Local comercial' },
];

const RECAMARAS = [1, 2, 3, '4+'];

interface EstimacionResult {
  valor_bajo: number;
  valor_centro: number;
  valor_alto: number;
  precio_m2?: number;
  ciudad_detectada?: string;
  zona_detectada?: string;
  justificacion: string;
  factores?: string[];
  riesgos?: string[];
}

interface Props {
  onRefinar: (datos: { direccion: string; tipo: string; superficie: number; recamaras: number; resultado: EstimacionResult }) => void;
  onSolicitar: (datos: { direccion: string; tipo: string; superficie: number; recamaras: number; valorEstimado: number }) => void;
}

export function QuickEstimate({ onRefinar, onSolicitar }: Props) {
  const [direccion, setDireccion] = useState('');
  const [tipo, setTipo] = useState('casa');
  const [superficie, setSuperficie] = useState(120);
  const [recamaras, setRecamaras] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EstimacionResult | null>(null);
  const [leadCapturado, setLeadCapturado] = useState(false);

  const handleLeadSubmit = async (lead: { nombre: string; email: string; telefono: string }) => {
    if (!resultado) return;
    setSavingLead(true);
    try {
      await fetch('/api/guardar-estimacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          direccion,
          tipo_inmueble: tipo,
          superficie,
          recamaras,
          valor_bajo: resultado.valor_bajo,
          valor_centro: resultado.valor_centro,
          valor_alto: resultado.valor_alto,
          precio_m2: resultado.precio_m2,
          ciudad_detectada: resultado.ciudad_detectada,
          zona_detectada: resultado.zona_detectada,
          justificacion: resultado.justificacion,
          factores: resultado.factores,
        }),
      });
    } catch { /* silently continue — don't block the user */ }
    setSavingLead(false);
    setLeadCapturado(true);
  };

  const handleEstimar = async () => {
    if (!direccion.trim()) {
      setError('Ingresa una dirección o zona.');
      return;
    }
    setError(null);
    setLoading(true);
    setResultado(null);

    try {
      const res = await fetch('/api/estimar-valor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direccion, tipo, superficie, recamaras }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }

      const data = await res.json() as EstimacionResult;
      setResultado(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al estimar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="estimador" className="w-full">
      <AnimatePresence mode="wait">
        {!resultado ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl border border-arqos-gray-200 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Header del formulario */}
              <div className="px-8 pt-8 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-arqos-gray-400" />
                  <p className="text-[10px] font-bold text-arqos-gray-400 uppercase tracking-[0.2em]">
                    Estimación con IA
                  </p>
                </div>
                <h2 className="text-2xl font-black text-arqos-black tracking-tight font-[family-name:var(--font-playfair)]">
                  Describe tu propiedad
                </h2>
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Dirección */}
                <div>
                  <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-2">
                    Dirección o zona
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Colonia del Valle, CDMX o Juriquilla, Querétaro"
                    className="w-full px-4 py-3.5 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black placeholder:text-arqos-gray-400 focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleEstimar()}
                  />
                </div>

                {/* Tipo de inmueble */}
                <div>
                  <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-2">
                    Tipo de inmueble
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTipo(t.value)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                          tipo === t.value
                            ? 'bg-arqos-black text-arqos-white border-arqos-black'
                            : 'bg-white text-arqos-gray-600 border-arqos-gray-200 hover:border-arqos-black'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Superficie + Recámaras en grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Superficie */}
                  <div>
                    <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-2">
                      Superficie m²
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={superficie}
                        onChange={(e) => setSuperficie(Number(e.target.value) || 0)}
                        min={20}
                        max={5000}
                        className="w-full px-4 py-3.5 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-arqos-gray-400 font-bold">m²</span>
                    </div>
                  </div>

                  {/* Recámaras */}
                  <div>
                    <label className="text-[10px] font-bold text-arqos-gray-500 uppercase tracking-wider block mb-2">
                      Recámaras
                    </label>
                    <div className="flex gap-2">
                      {RECAMARAS.map((r) => {
                        const val = typeof r === 'string' ? 4 : r;
                        return (
                          <button
                            key={String(r)}
                            onClick={() => setRecamaras(val)}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all duration-200 ${
                              recamaras === val
                                ? 'bg-arqos-black text-arqos-white border-arqos-black'
                                : 'bg-white text-arqos-gray-600 border-arqos-gray-200 hover:border-arqos-black'
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 px-4 py-2 rounded-lg">
                    {error}
                  </p>
                )}
              </div>

              {/* Botón estimar */}
              <div className="px-8 pb-8">
                <button
                  onClick={handleEstimar}
                  disabled={loading}
                  className="w-full py-4 bg-arqos-black text-arqos-white text-sm font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-arqos-gray-800 disabled:bg-arqos-gray-300 disabled:text-arqos-gray-500 transition-all duration-200 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-arqos-gray-400 border-t-white rounded-full animate-spin" />
                      Analizando mercado...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Estimar valor
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : !leadCapturado ? (
          <LeadCaptureModal
            key="lead"
            onSubmit={handleLeadSubmit}
            loading={savingLead}
          />
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ResultCard
              valorBajo={resultado.valor_bajo}
              valorCentro={resultado.valor_centro}
              valorAlto={resultado.valor_alto}
              precioM2={resultado.precio_m2}
              justificacion={resultado.justificacion}
              ciudad={resultado.ciudad_detectada}
              zona={resultado.zona_detectada}
              factores={resultado.factores}
              datos={{ direccion, tipo, superficie, recamaras }}
              onRefinar={() => onRefinar({ direccion, tipo, superficie, recamaras, resultado })}
              onSolicitar={() => onSolicitar({ direccion, tipo, superficie, recamaras, valorEstimado: resultado.valor_centro })}
            />

            {/* Botón volver */}
            <div className="text-center mt-6">
              <button
                onClick={() => { setResultado(null); setLeadCapturado(false); }}
                className="text-xs text-arqos-gray-400 hover:text-arqos-black font-bold uppercase tracking-wider transition-colors"
              >
                ← Nueva estimación
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
