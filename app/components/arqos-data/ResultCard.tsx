'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface Props {
  valorBajo: number;
  valorCentro: number;
  valorAlto: number;
  precioM2?: number;
  justificacion: string;
  ciudad?: string;
  zona?: string;
  factores?: string[];
  datos: {
    direccion: string;
    tipo: string;
    superficie: number;
    recamaras: number;
  };
  onRefinar: () => void;
  onSolicitar: () => void;
}

function AnimatedCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = ref.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = target;
    };

    requestAnimationFrame(tick);
  }, [target]);

  return <>{`$${display.toLocaleString('es-MX')}`}</>;
}

function fmt(val: number): string {
  return `$${val.toLocaleString('es-MX')}`;
}

export function ResultCard({
  valorBajo,
  valorCentro,
  valorAlto,
  precioM2,
  justificacion,
  ciudad,
  zona,
  factores,
  datos,
  onRefinar,
  onSolicitar,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="rounded-3xl overflow-hidden border border-arqos-gray-200 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)]">
        {/* Valor principal */}
        <div className="bg-arqos-black text-arqos-white px-8 py-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-arqos-gray-400 mb-3">
            Valuación estimada
          </p>
          <p className="text-5xl md:text-6xl font-black tracking-tight font-[family-name:var(--font-playfair)]">
            <AnimatedCounter target={valorCentro} />
          </p>
          <p className="text-xs text-arqos-gray-400 mt-3 font-semibold">
            MXN · Rango: {fmt(valorBajo)} — {fmt(valorAlto)}
          </p>
          {precioM2 && (
            <p className="text-[10px] text-arqos-gray-500 mt-1">
              ~{fmt(precioM2)}/m² · {ciudad && zona ? `${zona}, ${ciudad}` : ciudad || ''}
            </p>
          )}
        </div>

        {/* Justificación */}
        <div className="px-8 py-5 bg-arqos-gray-100/50 border-b border-arqos-gray-200">
          <p className="text-xs text-arqos-gray-600 leading-relaxed font-medium">
            {justificacion}
          </p>
          {factores && factores.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {factores.map((f, i) => (
                <span key={i} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                  ✓ {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Resumen datos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-arqos-gray-200">
          {[
            { label: 'Dirección', value: datos.direccion.split(',')[0] || datos.direccion },
            { label: 'Tipo', value: datos.tipo },
            { label: 'Superficie', value: `${datos.superficie} m²` },
            { label: 'Recámaras', value: String(datos.recamaras) },
          ].map((item) => (
            <div key={item.label} className="bg-white px-4 py-3">
              <p className="text-[9px] font-bold text-arqos-gray-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-bold text-arqos-black mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="px-8 py-6 bg-white flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRefinar}
            className="flex-1 py-3.5 border-2 border-arqos-black text-arqos-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-arqos-black hover:text-arqos-white transition-all duration-200"
          >
            Refinar con IA
          </button>
          <button
            onClick={onSolicitar}
            className="flex-1 py-3.5 bg-arqos-black text-arqos-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-arqos-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Solicitar avalúo formal
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-arqos-gray-400 text-center mt-4 max-w-md mx-auto leading-relaxed">
        Esta estimación es referencial y no sustituye un avalúo formal. Para trámites bancarios, hipotecarios o legales se requiere un avalúo certificado por una Unidad de Valuación registrada ante la SHF.
      </p>
    </motion.div>
  );
}
