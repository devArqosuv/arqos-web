"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const items = [
  {
    headline: "Cero retrabajo.",
    description:
      "Cada dictamen pasa por validación automatizada contra normativa SHF antes del envío. Nuestro sistema detecta inconsistencias para que el valuador las corrija antes de que salgan.",
  },
  {
    headline: "IA que trabaja.",
    description:
      "Procesos autónomos analizan comparables, cruzan fuentes de mercado y señalan anomalías. El valuador recibe un expediente enriquecido, no una hoja en blanco.",
  },
  {
    headline: "Datos como infraestructura.",
    description:
      "Una base de datos viva que se alimenta con cada operación. Modelos que aprenden del mercado en tiempo real para generar inteligencia accionable.",
  },
  {
    headline: "Más allá del hipotecario.",
    description:
      "Valuamos intangibles, marcas, patentes y negocios en marcha con metodología internacional.",
  },
];

export function Estandar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="estandar" className="bg-[#000000] px-6 py-28 md:py-36">
      <div ref={ref} className="mx-auto max-w-3xl text-center">
        <motion.p
          className="font-body text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "#6E6E6E" }}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
        >
          Lo que nos define
        </motion.p>

        <div className="mt-16">
          {items.map((item, i) => (
            <motion.div
              key={item.headline}
              className={i < items.length - 1 ? "mb-16" : ""}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i + 1}
            >
              <h3 className="font-display text-2xl font-bold text-white md:text-4xl">
                {item.headline}
              </h3>
              <p
                className="mx-auto mt-3 max-w-lg font-body text-base leading-relaxed"
                style={{ color: "#E6E6E6" }}
              >
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
