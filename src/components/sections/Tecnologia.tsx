"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const phases = [
  {
    num: "01",
    label: "Fase 1",
    title: "Fundamentos de datos",
    description:
      "Base de datos estructurada de comparables. Dashboards analíticos. Automatización con RPA.",
  },
  {
    num: "02",
    label: "Fase 2",
    title: "Modelos automatizados",
    description:
      "Machine learning que estima valores preliminares en segundos. Piloto con valuadores en campo.",
  },
  {
    num: "03",
    label: "Fase 3",
    title: "IA en producción",
    description:
      "Integración plena en el flujo de valuación. Analítica predictiva para decisiones de negocio.",
  },
];

export function Tecnologia() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="tecnologia" className="bg-white px-6 py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-3xl">
        <motion.p
          className="text-center font-body text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "#6E6E6E" }}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
        >
          Cómo lo hacemos
        </motion.p>

        <div className="mt-12">
          {phases.map((phase, i) => (
            <motion.div
              key={phase.num}
              className={`relative py-16 ${i < phases.length - 1 ? "border-b border-[#E6E6E6]" : ""}`}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i + 1}
            >
              {/* Watermark number */}
              <span
                className={`pointer-events-none absolute top-6 select-none font-display text-8xl font-bold ${i % 2 === 0 ? "left-0" : "right-0"}`}
                style={{ color: "#E6E6E6", zIndex: 0 }}
              >
                {phase.num}
              </span>

              {/* Content */}
              <div className="relative z-10">
                <p
                  className="font-body text-xs font-medium uppercase tracking-widest"
                  style={{ color: "#6E6E6E" }}
                >
                  {phase.label}
                </p>
                <h3 className="mt-1 font-body text-xl font-semibold tracking-tight text-black">
                  {phase.title}
                </h3>
                <p
                  className="mt-2 font-body text-base leading-relaxed"
                  style={{ color: "#2B2B2B" }}
                >
                  {phase.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mt-16 text-center font-body text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "#6E6E6E" }}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={4}
        >
          Machine Learning &middot; Business Intelligence &middot; Ciberseguridad
        </motion.p>
      </div>
    </section>
  );
}
