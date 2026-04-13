'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { QuickEstimate } from '@/app/components/arqos-data/QuickEstimate';
import { ChatRefine } from '@/app/components/arqos-data/ChatRefine';

type Fase = 'formulario' | 'chat' | 'solicitar';

interface DatosEstimacion {
  direccion: string;
  tipo: string;
  superficie: number;
  recamaras: number;
  valorEstimado: number;
  ciudad: string;
}

export function ArqosDataClient() {
  const [fase, setFase] = useState<Fase>('formulario');
  const [datosEstimacion, setDatosEstimacion] = useState<DatosEstimacion | null>(null);

  return (
    <section className="bg-arqos-white py-12 md:py-20 px-6">
      <AnimatePresence mode="wait">
        {fase === 'formulario' && (
          <QuickEstimate
            key="form"
            onRefinar={(datos) => {
              setDatosEstimacion({
                direccion: datos.direccion,
                tipo: datos.tipo,
                superficie: datos.superficie,
                recamaras: datos.recamaras,
                valorEstimado: datos.resultado.valor_centro,
                ciudad: datos.resultado.ciudad_detectada || '',
              });
              setFase('chat');
            }}
            onSolicitar={(datos) => {
              // Por ahora, redirigir al contacto de la landing
              window.location.href = '/#contacto';
            }}
          />
        )}

        {fase === 'chat' && datosEstimacion && (
          <ChatRefine
            key="chat"
            contexto={datosEstimacion}
            onClose={() => setFase('formulario')}
            onValorActualizado={(valor) => {
              setDatosEstimacion((prev) =>
                prev ? { ...prev, valorEstimado: valor.valor_centro } : prev,
              );
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
