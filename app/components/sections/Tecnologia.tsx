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
    title: "Fundamentos de datos",
    description:
      "Base de datos estructurada de comparables inmobiliarios. Dashboards analíticos y automatización de procesos operativos.",
  },
  {
    num: "02",
    title: "Modelos automatizados",
    description:
      "Algoritmos de machine learning que estiman valores preliminares en segundos. Validación cruzada con valuadores en campo.",
  },
  {
    num: "03",
    title: "IA en producción",
    description:
      "Integración plena en el flujo de valuación. Analítica predictiva y procesos autónomos de inteligencia de mercado.",
  },
];

export function Tecnologia() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="tecnologia" className="bg-white px-6 py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-4xl">
        {/* Label */}
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

        {/* Title */}
        <motion.h2
          className="mt-6 text-center font-display text-3xl font-bold tracking-tight text-black md:text-4xl"
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1}
        >
          Roadmap tecnológico
        </motion.h2>

        {/* Desktop timeline — horizontal */}
        <motion.div
          className="mt-16 hidden md:grid md:grid-cols-3"
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={2}
        >
          {phases.map((phase, i) => (
            <div key={phase.num} className="relative border-t border-black px-6 first:pl-0 last:pr-0">
              {/* Dot */}
              <div className="absolute -top-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black" />

              {/* Content */}
              <div className="mt-8">
                <span className="font-body text-sm font-light" style={{ color: "#6E6E6E" }}>
                  {phase.num}
                </span>
                <h3 className="mt-2 font-body text-lg font-semibold tracking-tight text-black">
                  {phase.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed" style={{ color: "#2B2B2B" }}>
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Mobile timeline — vertical */}
        <div className="mt-16 md:hidden">
          {phases.map((phase, i) => (
            <motion.div
              key={phase.num}
              className="relative border-l border-black pl-8"
              style={{ paddingBottom: i < phases.length - 1 ? "2.5rem" : 0 }}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i + 2}
            >
              {/* Dot */}
              <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-black" />

              <span className="font-body text-sm font-light" style={{ color: "#6E6E6E" }}>
                {phase.num}
              </span>
              <h3 className="mt-2 font-body text-lg font-semibold tracking-tight text-black">
                {phase.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed" style={{ color: "#2B2B2B" }}>
                {phase.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Tech keywords */}
        <motion.p
          className="mt-16 text-center font-body text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "#6E6E6E" }}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={5}
        >
          Machine Learning &middot; Business Intelligence &middot; Ciberseguridad
        </motion.p>
      </div>
    </section>
  );
}
