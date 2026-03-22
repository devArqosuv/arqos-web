"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type AgentStatus = "idle" | "running" | "done" | "warn";

interface AgentData {
  id: string;
  name: string;
  task: string;
  delay: number;
  duration: number;
  message: string;
  result: string;
  type: "done" | "warn";
}

const agents: AgentData[] = [
  {
    id: "01",
    name: "Agente 01",
    task: "Extracción de datos",
    delay: 0,
    duration: 2200,
    message:
      "Procesando expediente Juriquilla QRO-2024-0847... superficie 312 m², uso habitacional",
    result: "Datos extraídos",
    type: "done",
  },
  {
    id: "02",
    name: "Agente 02",
    task: "Comparables de mercado",
    delay: 1800,
    duration: 3100,
    message: "Buscando comparables en radio 800m · Juriquilla, Querétaro...",
    result: "18 comparables encontrados",
    type: "done",
  },
  {
    id: "03",
    name: "Agente 03",
    task: "Validación normativa",
    delay: 4200,
    duration: 2400,
    message: "Verificando artículos 12, 18 y 23 del reglamento SHF...",
    result: "Normativa cumplida",
    type: "done",
  },
  {
    id: "04",
    name: "Agente 04",
    task: "Control de calidad",
    delay: 6000,
    duration: 1900,
    message: "Analizando consistencia superficie vs precio por m²...",
    result: "1 alerta: precio/m² +14% sobre media",
    type: "warn",
  },
  {
    id: "05",
    name: "Agente 05",
    task: "Dictamen",
    delay: 7200,
    duration: 2600,
    message: "Generando dictamen preliminar con observaciones...",
    result: "Listo en 9.4 s",
    type: "done",
  },
];

interface AgentState {
  status: AgentStatus;
  visible: boolean;
  typedText: string;
  showResult: boolean;
}

export function AgentFeed() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [showMetrics, setShowMetrics] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [countUpValue, setCountUpValue] = useState(0);
  const [sequenceRunning, setSequenceRunning] = useState(false);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const typingIntervalsRef = useRef<NodeJS.Timeout[]>([]);
  const autoReplayRef = useRef<NodeJS.Timeout | null>(null);

  // Clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    typingIntervalsRef.current.forEach(clearInterval);
    typingIntervalsRef.current = [];
    if (autoReplayRef.current) {
      clearTimeout(autoReplayRef.current);
      autoReplayRef.current = null;
    }
  }, []);

  const resetStates = useCallback(() => {
    const initialStates: Record<string, AgentState> = {};
    agents.forEach((agent) => {
      initialStates[agent.id] = {
        status: "idle",
        visible: false,
        typedText: "",
        showResult: false,
      };
    });
    setAgentStates(initialStates);
    setShowMetrics(false);
    setShowReplay(false);
    setCountUpValue(0);
  }, []);

  const runSequence = useCallback(() => {
    clearAllTimeouts();
    resetStates();
    setSequenceRunning(true);

    agents.forEach((agent) => {
      // Fade in the row at delay
      const showTimeout = setTimeout(() => {
        setAgentStates((prev) => ({
          ...prev,
          [agent.id]: {
            ...prev[agent.id],
            visible: true,
            status: "running",
          },
        }));

        // Start typing effect
        let charIndex = 0;
        const typingInterval = setInterval(() => {
          charIndex++;
          if (charIndex <= agent.message.length) {
            setAgentStates((prev) => ({
              ...prev,
              [agent.id]: {
                ...prev[agent.id],
                typedText: agent.message.slice(0, charIndex),
              },
            }));
          } else {
            clearInterval(typingInterval);
          }
        }, 22);
        typingIntervalsRef.current.push(typingInterval);
      }, agent.delay);
      timeoutsRef.current.push(showTimeout);

      // Complete agent at delay + duration
      const completeTimeout = setTimeout(() => {
        setAgentStates((prev) => ({
          ...prev,
          [agent.id]: {
            ...prev[agent.id],
            status: agent.type,
            typedText: agent.message,
            showResult: true,
          },
        }));
      }, agent.delay + agent.duration);
      timeoutsRef.current.push(completeTimeout);
    });

    // Calculate when last agent finishes
    const lastAgent = agents[agents.length - 1];
    const sequenceEndTime = lastAgent.delay + lastAgent.duration + 600;

    // Show metrics after sequence ends
    const metricsTimeout = setTimeout(() => {
      setShowMetrics(true);

      // Count-up animation for "47"
      const countDuration = 800;
      const targetValue = 47;
      const steps = 20;
      const stepDuration = countDuration / steps;
      let currentStep = 0;

      const countInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setCountUpValue(Math.round(targetValue * easedProgress));
        if (currentStep >= steps) {
          clearInterval(countInterval);
          setCountUpValue(targetValue);
        }
      }, stepDuration);
      typingIntervalsRef.current.push(countInterval);

      // Show replay button after metrics
      const replayTimeout = setTimeout(() => {
        setShowReplay(true);
        setSequenceRunning(false);

        // Auto-replay after 6 seconds of pause
        autoReplayRef.current = setTimeout(() => {
          runSequence();
        }, 6000);
      }, 400);
      timeoutsRef.current.push(replayTimeout);
    }, sequenceEndTime);
    timeoutsRef.current.push(metricsTimeout);
  }, [clearAllTimeouts, resetStates]);

  // Start sequence on mount
  useEffect(() => {
    runSequence();
    return () => clearAllTimeouts();
  }, [runSequence, clearAllTimeouts]);

  const handleReplay = () => {
    if (!sequenceRunning) {
      runSequence();
    }
  };

  const getDotColor = (status: AgentStatus): string => {
    switch (status) {
      case "idle":
        return "bg-[#2b2b2b]";
      case "running":
        return "bg-white animate-pulse";
      case "done":
        return "bg-[#4a4a4a]";
      case "warn":
        return "bg-[#7a5c1e]";
      default:
        return "bg-[#2b2b2b]";
    }
  };

  const getStatusText = (
    status: AgentStatus,
    result: string
  ): { text: string; color: string } => {
    switch (status) {
      case "running":
        return { text: "procesando...", color: "text-[#5a5a5a]" };
      case "done":
        return { text: result, color: "text-[#4a4a4a]" };
      case "warn":
        return { text: result, color: "text-[#7a5c1e]" };
      default:
        return { text: "", color: "" };
    }
  };

  return (
    <section id="agentfeed" className="bg-[#000000] py-24 md:py-32 px-6 md:px-12">
      <div className="mx-auto max-w-4xl">
        {/* Label */}
        <p className="font-body text-[10px] uppercase tracking-[.2em] text-[#6E6E6E]">
          INTELIGENCIA EN TIEMPO REAL
        </p>

        {/* Title */}
        <h2 className="font-display text-3xl text-white mt-4">
          Procesos autónomos activos
        </h2>

        {/* Subtitle with clock */}
        <p className="font-body text-sm text-[#6E6E6E] mt-2">
          Sistema operando · {currentTime}
        </p>

        {/* Agent List */}
        <div className="mt-10">
          {agents.map((agent) => {
            const state = agentStates[agent.id] || {
              status: "idle",
              visible: false,
              typedText: "",
              showResult: false,
            };
            const statusInfo = getStatusText(state.status, agent.result);

            return (
              <AnimatePresence key={agent.id}>
                {state.visible && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-[6px_1fr_auto] gap-4 items-start py-4 border-b border-[#1a1a1a]"
                  >
                    {/* Dot */}
                    <div className="pt-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${getDotColor(
                          state.status
                        )}`}
                      />
                    </div>

                    {/* Content */}
                    <div className="min-w-0">
                      <p className="font-body text-[10px] uppercase tracking-[.08em] text-[#3a3a3a] mb-1">
                        {agent.name} · {agent.task}
                      </p>
                      <p className="font-body text-[13px] text-[#c0c0c0] break-words">
                        {state.typedText}
                        {state.status === "running" && (
                          <span className="animate-pulse">|</span>
                        )}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="text-right">
                      {state.showResult ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`font-body text-[11px] ${statusInfo.color}`}
                        >
                          {statusInfo.text}
                        </motion.p>
                      ) : state.status === "running" ? (
                        <p className="font-body text-[11px] text-[#5a5a5a]">
                          procesando...
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        {/* Metrics */}
        <AnimatePresence>
          {showMetrics && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-10 grid grid-cols-3"
            >
              <div className="pr-6">
                <p className="font-display text-2xl text-white">{countUpValue}</p>
                <p className="font-body text-[10px] uppercase tracking-[.1em] text-[#4a4a4a] mt-1">
                  AVALÚOS HOY
                </p>
              </div>
              <div className="px-6 border-l border-[#1a1a1a]">
                <p className="font-display text-2xl text-white">9.4 s</p>
                <p className="font-body text-[10px] uppercase tracking-[.1em] text-[#4a4a4a] mt-1">
                  TIEMPO PROMEDIO
                </p>
              </div>
              <div className="pl-6 border-l border-[#1a1a1a]">
                <p className="font-display text-2xl text-white">98.6%</p>
                <p className="font-body text-[10px] uppercase tracking-[.1em] text-[#4a4a4a] mt-1">
                  TASA DE APROBACIÓN
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replay Button */}
        <AnimatePresence>
          {showReplay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <button
                onClick={handleReplay}
                className="font-body text-[11px] uppercase tracking-[.12em] text-[#4a4a4a] border border-[#2a2a2a] bg-transparent px-5 py-2 rounded-none transition-colors hover:text-white hover:border-[#5a5a5a]"
              >
                REPETIR DEMOSTRACIÓN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
