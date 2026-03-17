"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const contactData = [
  { icon: MapPin, text: "Querétaro, Querétaro, México" },
  { icon: Mail, text: "contacto@arqos.mx", href: "mailto:contacto@arqos.mx" },
  { icon: Phone, text: "+52 442 000 0000", href: "tel:+524420000000" },
];

const inputClasses =
  "w-full border-b border-[#E6E6E6] bg-transparent py-3 font-body text-base text-black placeholder:text-[#6E6E6E] transition-colors focus:border-b-2 focus:border-black focus:outline-none";

export function Contacto() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="contacto" className="bg-white px-6 py-24 md:py-32">
      <div
        ref={ref}
        className="mx-auto grid max-w-5xl grid-cols-1 gap-16 md:grid-cols-12 md:gap-0"
      >
        {/* Left — Info */}
        <motion.div
          className="md:col-span-5"
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
        >
          <p
            className="font-body text-xs font-medium uppercase tracking-[0.2em]"
            style={{ color: "#6E6E6E" }}
          >
            Contacto
          </p>

          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-black md:text-4xl">
            Hablemos.
          </h2>

          <p
            className="mt-4 max-w-sm font-body text-base leading-relaxed"
            style={{ color: "#6E6E6E" }}
          >
            Hablemos sobre cómo ARQOS puede fortalecer sus operaciones de valuación.
          </p>

          <div className="mt-10 flex flex-col gap-5">
            {contactData.map((item) => {
              const Icon = item.icon;
              const content = (
                <span className="inline-flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-black" strokeWidth={1.5} />
                  <span className="font-body text-base" style={{ color: "#2B2B2B" }}>
                    {item.text}
                  </span>
                </span>
              );

              return item.href ? (
                <a
                  key={item.text}
                  href={item.href}
                  className="transition-colors hover:opacity-70"
                >
                  {content}
                </a>
              ) : (
                <div key={item.text}>{content}</div>
              );
            })}
          </div>

          <p
            className="mt-10 font-body text-sm italic"
            style={{ color: "#6E6E6E" }}
          >
            Respuesta en menos de 24 horas hábiles.
          </p>
        </motion.div>

        {/* Right — Form */}
        <motion.div
          className="md:col-span-6 md:col-start-7"
          variants={fadeUp}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={1}
        >
          <form
            action="mailto:contacto@arqos.mx"
            method="POST"
            encType="text/plain"
            className="flex flex-col gap-6"
          >
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              required
              className={inputClasses}
            />
            <input
              type="text"
              name="empresa"
              placeholder="Empresa"
              className={inputClasses}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className={inputClasses}
            />
            <input
              type="tel"
              name="telefono"
              placeholder="Teléfono"
              className={inputClasses}
            />
            <textarea
              name="mensaje"
              placeholder="Mensaje"
              rows={4}
              className={`${inputClasses} resize-none`}
            />

            <div className="mt-2">
              <Button type="submit" variant="primary" className="w-full md:w-auto">
                Enviar solicitud
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
