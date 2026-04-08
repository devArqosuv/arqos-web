"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCcw, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

/* -------------------------------------------------------------------------- */
/*  Tipos y configuración del flujo                                            */
/* -------------------------------------------------------------------------- */

type Option = {
  label: string;
  value: string;
  /** Multiplicador ficticio que alimenta el cálculo de mockup. */
  weight: number;
};

type Question = {
  id: string;
  prompt: string;
  options: Option[];
};

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  text: string;
};

/**
 * Guion base del asistente.
 *
 * NOTA (para cuando llegue el bot real):
 *   Esta lista es solo un placeholder para levantar la UI. Cuando el modelo de
 *   IA esté listo, lo más probable es que esta estructura cambie por un flujo
 *   conversacional dinámico (streaming). Todos los puntos de integración están
 *   marcados con `// TODO: integrar IA`.
 */
const questions: Question[] = [
  {
    id: "city",
    prompt:
      "Para empezar, ¿en qué ciudad se encuentra la propiedad que quieres valuar?",
    options: [
      { label: "Querétaro", value: "queretaro", weight: 1.0 },
      { label: "CDMX", value: "cdmx", weight: 1.35 },
      { label: "Monterrey", value: "monterrey", weight: 1.15 },
      { label: "Guadalajara", value: "guadalajara", weight: 1.1 },
      { label: "Otra ciudad", value: "otra", weight: 0.9 },
    ],
  },
  {
    id: "type",
    prompt: "¿Qué tipo de inmueble es?",
    options: [
      { label: "Casa", value: "casa", weight: 1.0 },
      { label: "Departamento", value: "depto", weight: 0.95 },
      { label: "Terreno", value: "terreno", weight: 0.6 },
      { label: "Local comercial", value: "local", weight: 1.2 },
    ],
  },
  {
    id: "area",
    prompt: "¿Aproximadamente cuántos m² de construcción tiene?",
    options: [
      { label: "Hasta 100 m²", value: "xs", weight: 0.7 },
      { label: "100 a 200 m²", value: "s", weight: 1.0 },
      { label: "200 a 400 m²", value: "m", weight: 1.5 },
      { label: "Más de 400 m²", value: "l", weight: 2.1 },
    ],
  },
  {
    id: "bedrooms",
    prompt: "¿Cuántas recámaras tiene?",
    options: [
      { label: "1", value: "1", weight: 0.85 },
      { label: "2", value: "2", weight: 1.0 },
      { label: "3", value: "3", weight: 1.15 },
      { label: "4 o más", value: "4", weight: 1.3 },
    ],
  },
  {
    id: "year",
    prompt: "¿En qué año aproximado fue construida?",
    options: [
      { label: "Antes de 2000", value: "old", weight: 0.85 },
      { label: "2000 – 2010", value: "mid", weight: 0.95 },
      { label: "2010 – 2020", value: "new", weight: 1.05 },
      { label: "Después de 2020", value: "recent", weight: 1.15 },
    ],
  },
  {
    id: "amenities",
    prompt: "Por último, ¿cuenta con amenidades o está dentro de un privada?",
    options: [
      { label: "Privada con amenidades", value: "premium", weight: 1.2 },
      { label: "Condominio", value: "condo", weight: 1.1 },
      { label: "Sin amenidades", value: "none", weight: 1.0 },
    ],
  },
];

const BASE_VALUE = 2_400_000; // MXN, base ficticia para el mockup.

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const formatMXN = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

const computeValuation = (selections: Record<string, Option>) => {
  const multiplier = Object.values(selections).reduce(
    (acc, opt) => acc * opt.weight,
    1
  );
  const center = Math.round((BASE_VALUE * multiplier) / 10_000) * 10_000;
  return {
    low: Math.round((center * 0.9) / 10_000) * 10_000,
    center,
    high: Math.round((center * 1.1) / 10_000) * 10_000,
  };
};

/* -------------------------------------------------------------------------- */
/*  Componente principal                                                       */
/* -------------------------------------------------------------------------- */

export function DataChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, Option>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensaje inicial de bienvenida + primera pregunta.
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    setIsTyping(true);

    timeouts.push(
      setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            role: "ai",
            text: "¡Hola! Soy ARQOS Data. Voy a hacerte algunas preguntas rápidas sobre tu propiedad para estimar su valor de mercado. Esta valuación es orientativa y no sustituye un avalúo oficial.",
          },
        ]);
        setIsTyping(false);
      }, 600)
    );

    timeouts.push(
      setTimeout(() => {
        setIsTyping(true);
      }, 1_500)
    );

    timeouts.push(
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `q-${questions[0].id}`,
            role: "ai",
            text: questions[0].prompt,
          },
        ]);
        setIsTyping(false);
      }, 2_400)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // Auto-scroll al último mensaje.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, isComplete]);

  const handleSelect = (option: Option) => {
    if (isTyping || isComplete) return;

    const question = questions[currentIndex];

    // Eco del usuario.
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${question.id}-${Date.now()}`,
        role: "user",
        text: option.label,
      },
    ]);

    const nextSelections = { ...selections, [question.id]: option };
    setSelections(nextSelections);

    const nextIndex = currentIndex + 1;
    const isLast = nextIndex >= questions.length;

    setIsTyping(true);

    setTimeout(() => {
      if (!isLast) {
        setMessages((prev) => [
          ...prev,
          {
            id: `q-${questions[nextIndex].id}`,
            role: "ai",
            text: questions[nextIndex].prompt,
          },
        ]);
        setCurrentIndex(nextIndex);
        setIsTyping(false);
      } else {
        // Mensaje puente antes del resultado.
        setMessages((prev) => [
          ...prev,
          {
            id: "analyzing",
            role: "ai",
            text: "Perfecto. Estoy cruzando tus respuestas con datos de mercado…",
          },
        ]);
        setTimeout(() => {
          setIsTyping(false);
          setIsComplete(true);
        }, 1_800);
      }
    }, 900);
  };

  const handleRestart = () => {
    setMessages([]);
    setCurrentIndex(0);
    setSelections({});
    setIsComplete(false);
    setIsTyping(true);
    setTimeout(() => {
      setMessages([
        {
          id: "welcome-restart",
          role: "ai",
          text: "Empecemos de nuevo. ¿En qué ciudad se encuentra la propiedad?",
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  const currentQuestion = questions[currentIndex];
  const progress = Math.min(
    (Object.keys(selections).length / questions.length) * 100,
    100
  );

  const valuation = isComplete ? computeValuation(selections) : null;

  return (
    <section className="relative bg-arqos-white px-6 pb-24 md:pb-32">
      <div className="mx-auto w-full max-w-3xl">
        {/* ----- Chat Window ----- */}
        <div className="overflow-hidden rounded-2xl border border-arqos-black/10 bg-arqos-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-arqos-black/10 bg-arqos-white px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-arqos-black">
                <Image
                  src="/images/logo-arqos-white.png"
                  alt="ARQOS"
                  width={1346}
                  height={366}
                  className="h-3 w-auto"
                />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-arqos-black">
                  ARQOS Data
                </p>
                <p className="font-body text-[11px] uppercase tracking-[0.18em] text-arqos-gray-500">
                  Asistente de valuación · IA
                </p>
              </div>
            </div>

            {isComplete && (
              <button
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-wide text-arqos-gray-600 transition-colors hover:text-arqos-black"
                aria-label="Reiniciar conversación"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="h-[2px] w-full bg-arqos-gray-100">
            <motion.div
              className="h-full bg-arqos-black"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex h-[460px] flex-col gap-4 overflow-y-auto bg-arqos-gray-100/40 px-5 py-6 md:px-7"
          >
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {isTyping && <TypingIndicator />}

            {isComplete && valuation && (
              <ValuationCard
                valuation={valuation}
                selections={selections}
              />
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-arqos-black/10 bg-arqos-white px-5 py-4 md:px-6">
            {!isComplete ? (
              <div className="flex flex-col gap-3">
                <p className="font-body text-[11px] uppercase tracking-[0.18em] text-arqos-gray-500">
                  Elige una opción
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentQuestion?.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option)}
                      disabled={isTyping}
                      className="inline-flex items-center rounded-full border border-arqos-black/15 bg-arqos-white px-4 py-2 font-body text-sm text-arqos-black transition-all duration-200 hover:border-arqos-black hover:bg-arqos-black hover:text-arqos-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Input placeholder (disabled hasta que conectemos la IA real) */}
                <div className="mt-2 flex items-center gap-2 rounded-full border border-arqos-black/10 bg-arqos-gray-100/60 px-4 py-2.5">
                  <input
                    type="text"
                    disabled
                    placeholder="La escritura libre estará disponible al conectar la IA…"
                    className="flex-1 bg-transparent font-body text-sm text-arqos-gray-500 placeholder:text-arqos-gray-400 focus:outline-none disabled:cursor-not-allowed"
                  />
                  <button
                    disabled
                    aria-label="Enviar mensaje"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-arqos-gray-300 text-arqos-white disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <p className="font-body text-sm text-arqos-gray-600">
                  ¿Necesitas un avalúo oficial con valor legal?
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    // Los anchors viven en la home: navegamos y hacemos scroll.
                    window.location.href = "/#contacto";
                  }}
                >
                  Contactar un valuador
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer debajo del chat */}
        <p className="mt-6 flex items-start gap-2 font-body text-xs leading-relaxed text-arqos-gray-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            El resultado de ARQOS Data es una estimación orientativa basada en
            inteligencia artificial y datos públicos. No sustituye un avalúo
            oficial emitido por un perito valuador registrado ante la Sociedad
            Hipotecaria Federal. Para efectos legales, hipotecarios o fiscales
            solicita un avalúo certificado con ARQOS UV.
          </span>
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponentes                                                             */
/* -------------------------------------------------------------------------- */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex items-end gap-2 ${isAI ? "justify-start" : "justify-end"}`}
    >
      {isAI && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-arqos-black">
          <span className="font-display text-[10px] font-bold text-arqos-white">
            A
          </span>
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed ${
          isAI
            ? "rounded-bl-sm bg-arqos-white text-arqos-black shadow-sm"
            : "rounded-br-sm bg-arqos-black text-arqos-white"
        }`}
      >
        {message.text}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-arqos-black">
        <span className="font-display text-[10px] font-bold text-arqos-white">
          A
        </span>
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-arqos-white px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-arqos-gray-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function ValuationCard({
  valuation,
  selections,
}: {
  valuation: { low: number; center: number; high: number };
  selections: Record<string, Option>;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animación tipo "contador" sobre el valor central.
  useEffect(() => {
    const duration = 1_200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(valuation.center * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valuation.center]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className="mt-4 overflow-hidden rounded-2xl border border-arqos-black/10 bg-arqos-white"
    >
      {/* Header de la tarjeta */}
      <div className="bg-arqos-black px-6 py-5 text-center">
        <p className="font-body text-[11px] uppercase tracking-[0.25em] text-arqos-gray-400">
          Valuación estimada
        </p>
        <p className="mt-3 font-display text-4xl font-bold text-arqos-white md:text-5xl">
          {formatMXN(displayValue)}
        </p>
        <p className="mt-2 font-body text-xs text-arqos-gray-400">
          Rango de mercado: {formatMXN(valuation.low)} –{" "}
          {formatMXN(valuation.high)}
        </p>
      </div>

      {/* Resumen de respuestas */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-5 md:grid-cols-3">
        {Object.entries(selections).map(([key, option]) => (
          <div key={key}>
            <p className="font-body text-[10px] uppercase tracking-[0.18em] text-arqos-gray-400">
              {labelForKey(key)}
            </p>
            <p className="mt-0.5 font-body text-sm text-arqos-black">
              {option.label}
            </p>
          </div>
        ))}
      </div>

      {/* CTA interno */}
      <div className="flex items-center justify-between gap-4 border-t border-arqos-black/10 px-6 py-4">
        <div>
          <p className="font-display text-sm font-bold text-arqos-black">
            ¿Quieres un avalúo oficial?
          </p>
          <p className="mt-0.5 font-body text-xs text-arqos-gray-500">
            Registrado ante SHF · Válido para bancos, INFONAVIT y FOVISSSTE
          </p>
        </div>
        <a
          href="/#contacto"
          className="inline-flex shrink-0 items-center gap-1.5 font-body text-xs font-medium uppercase tracking-wide text-arqos-black transition-colors hover:text-arqos-gray-600"
        >
          Cotizar
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

const labelForKey = (key: string) => {
  const map: Record<string, string> = {
    city: "Ciudad",
    type: "Tipo",
    area: "Superficie",
    bedrooms: "Recámaras",
    year: "Antigüedad",
    amenities: "Amenidades",
  };
  return map[key] ?? key;
};
