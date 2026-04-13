"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const servicios = [
  {
    num: "01",
    title: "Avalúos hipotecarios",
    description:
      "INFONAVIT, FOVISSSTE y Banca comercial con metodología normativa y tiempos competitivos.",
  },
  {
    num: "02",
    title: "Avalúos comerciales e industriales",
    description:
      "Naves, oficinas, terrenos y propiedades comerciales con análisis riguroso de mercado.",
  },
  {
    num: "03",
    title: "Valuación de intangibles",
    description:
      "Marcas, patentes, negocios en marcha y activos intangibles con estándares internacionales.",
  },
  {
    num: "04",
    title: "Consultoría basada en datos",
    description:
      "Modelos de análisis que procesan variables de mercado de forma continua para generar reportes e insights bajo demanda.",
  },
];

export function Servicios() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="servicios" className="bg-white px-6 py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-2xl">
        <motion.p
          className="font-body text-xs font-medium uppercase tracking-[0.2em]"
          style={{ color: "#6E6E6E" }}
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
        >
          Qué hacemos
        </motion.p>

        <div className="mt-12">
          {servicios.map((s, i) => (
            <motion.div
              key={s.num}
              className={`${i < servicios.length - 1 ? "mb-8 border-b border-[#E6E6E6] pb-8" : ""}`}
              variants={fadeUp}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i + 1}
            >
              <span className="font-body text-sm font-light" style={{ color: "#6E6E6E" }}>
                {s.num}
              </span>
              <h3 className="mt-1 font-body text-xl font-semibold tracking-tight text-black">
                {s.title}
              </h3>
              <p className="mt-2 font-body text-base leading-relaxed" style={{ color: "#2B2B2B" }}>
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
