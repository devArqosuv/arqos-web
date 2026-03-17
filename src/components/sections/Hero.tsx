"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6">
      {/* Background grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #999 1px, transparent 1px), linear-gradient(to bottom, #999 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.04,
        }}
      />

      <div className="relative flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div
          className="relative mx-auto h-[60px] w-[240px]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Image
            src="/images/logo-arqos-black.png"
            alt="ARQOS"
            fill
            className="object-contain"
            priority
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mt-8 max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight text-black md:text-7xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Precisión que impulsa decisiones.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mx-auto mt-6 max-w-xl font-body text-lg leading-relaxed"
          style={{ color: "#6E6E6E" }}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          Unidad de Valuación con infraestructura de datos e inteligencia artificial
        </motion.p>

        {/* Pill / Badge */}
        <motion.span
          className="mt-4 inline-block rounded-full border border-black px-4 py-1 font-body text-xs uppercase tracking-widest text-black"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          Registro SHF en trámite
        </motion.span>

        {/* CTA Button */}
        <motion.button
          className="mt-10 inline-flex items-center gap-2 font-body text-sm font-medium uppercase tracking-wide text-black transition-colors hover:bg-arqos-gray-100 px-6 py-3"
          onClick={() =>
            document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" })
          }
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
        >
          Conocer más
          <ChevronDown className="h-5 w-5" />
        </motion.button>
      </div>
    </section>
  );
}
