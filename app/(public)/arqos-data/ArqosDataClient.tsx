'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { QuickEstimate } from '@/app/components/arqos-data/QuickEstimate';
import { ChatRefine } from '@/app/components/arqos-data/ChatRefine';
import { SolicitarInformeModal } from '@/app/components/arqos-data/SolicitarInformeModal';

type Fase = 'formulario' | 'chat' | 'solicitar';

interface DatosEstimacion {
  direccion: string;
  tipo: string;
  superficie: number;
  recamaras: number;
  valorEstimado: number;
  ciudad: string;
}

interface LeadInfo { nombre: string; email: string; telefono: string }

export function ArqosDataClient() {
  const [fase, setFase] = useState<Fase>('formulario');
  const [datosEstimacion, setDatosEstimacion] = useState<DatosEstimacion | null>(null);

  // Datos necesarios para el modal de "Solicitar avalúo formal".
  // - estimacionId es la fila en `estimaciones_portal` creada al capturar el lead.
  // - lead son los campos ya tipeados por el cliente, los prellenamos al abrir el modal.
  const [estimacionId, setEstimacionId] = useState<string | null>(null);
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null);
  const [modalSolicitarAbierto, setModalSolicitarAbierto] = useState(false);

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
              // El usuario pidió el avalúo formal: abrimos el modal de
              // registro. Si no hay estimacion_id (p.ej. guardar falló),
              // mostramos el modal igual pero el POST devolverá 404 y
              // el modal mostrará el error.
              setEstimacionId(datos.estimacionId);
              setLeadInfo(datos.lead);
              setModalSolicitarAbierto(true);
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

      <SolicitarInformeModal
        abierto={modalSolicitarAbierto}
        onClose={() => setModalSolicitarAbierto(false)}
        estimacionId={estimacionId}
        defaults={leadInfo ?? undefined}
      />
    </section>
  );
}
