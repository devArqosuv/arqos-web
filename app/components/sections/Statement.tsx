"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="statement" className="bg-white px-6 py-32 md:py-40">
      <div ref={ref} className="mx-auto max-w-4xl text-center">
        <motion.p
          className="font-display text-3xl font-bold leading-tight tracking-tight text-black md:text-5xl md:leading-tight"
          variants={fadeIn}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          El mercado de valuación no ha cambiado en 20 años.
          <br className="hidden md:block" />{" "}
          Nosotros llegamos para redefinirlo.
        </motion.p>

        <motion.div
          className="mx-auto mt-8 h-px w-[60px] bg-black"
          variants={fadeIn}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        />
      </div>
    </section>
  );
}
