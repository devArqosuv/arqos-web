'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Contexto {
  direccion: string;
  tipo: string;
  superficie: number;
  recamaras: number;
  valorEstimado: number;
  ciudad: string;
}

interface ValorActualizado {
  valor_bajo: number;
  valor_centro: number;
  valor_alto: number;
  confianza: string;
}

interface Props {
  contexto: Contexto;
  onClose: () => void;
  onValorActualizado?: (valor: ValorActualizado) => void;
}

function fmt(val: number): string {
  return `$${val.toLocaleString('es-MX')}`;
}

export function ChatRefine({ contexto, onClose, onValorActualizado }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [valorActual, setValorActual] = useState<ValorActualizado | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Initial greeting
  useEffect(() => {
    const greeting: ChatMessage = {
      role: 'assistant',
      content: `¡Hola! Ya tengo tu estimado de ${fmt(contexto.valorEstimado)} para tu ${contexto.tipo} en ${contexto.ciudad}. Voy a hacerte algunas preguntas para refinarlo. ¿En qué estado de conservación se encuentra el inmueble? (nuevo, remodelado, buen estado, necesita reparaciones)`,
    };
    setTimeout(() => setMessages([greeting]), 500);
  }, [contexto]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat-valuacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: updated,
          contexto: {
            direccion: contexto.direccion,
            tipo: contexto.tipo,
            superficie: contexto.superficie,
            recamaras: contexto.recamaras,
            valor_estimado: contexto.valorEstimado,
            ciudad: contexto.ciudad,
          },
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Error al conectar con la IA. Intenta de nuevo.' }]);
        setIsStreaming(false);
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: fullContent };
                return copy;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Check for embedded estimation
      const match = fullContent.match(/<<ESTIMADO:(.*?)>>/);
      if (match) {
        try {
          const valor = JSON.parse(match[1]) as ValorActualizado;
          setValorActual(valor);
          onValorActualizado?.(valor);
          // Clean the marker from displayed message
          const cleanContent = fullContent.replace(/<<ESTIMADO:.*?>>/, '').trim();
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: cleanContent };
            return copy;
          });
        } catch { /* ignore parse errors */ }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, messages, isStreaming, contexto, onValorActualizado]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="rounded-3xl overflow-hidden border border-arqos-gray-200 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-arqos-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-arqos-black rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold font-[family-name:var(--font-playfair)]">A</span>
            </div>
            <div>
              <p className="text-sm font-bold text-arqos-black">ARQOS Data</p>
              <p className="text-[10px] text-arqos-gray-400 font-semibold">Refinando tu estimado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {valorActual && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                <p className="text-[10px] font-bold text-emerald-700">
                  {fmt(valorActual.valor_centro)} · {valorActual.confianza}
                </p>
              </div>
            )}
            <button onClick={onClose} className="text-arqos-gray-400 hover:text-arqos-black transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-[400px] overflow-y-auto px-6 py-5 space-y-4 bg-arqos-gray-100/30">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-arqos-black rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                    <span className="text-white text-[8px] font-bold">A</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-arqos-black text-arqos-white rounded-2xl rounded-br-sm'
                      : 'bg-white text-arqos-black rounded-2xl rounded-bl-sm shadow-sm border border-arqos-gray-100'
                  }`}
                >
                  {msg.content || (
                    <span className="flex gap-1">
                      {[0, 1, 2].map((j) => (
                        <motion.span
                          key={j}
                          className="w-1.5 h-1.5 bg-arqos-gray-400 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="w-6 h-6 bg-arqos-black rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                <span className="text-white text-[8px] font-bold">A</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-arqos-gray-100">
                <span className="flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <motion.span
                      key={j}
                      className="w-1.5 h-1.5 bg-arqos-gray-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-arqos-gray-100 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe tu respuesta..."
            disabled={isStreaming}
            className="flex-1 px-4 py-3 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black placeholder:text-arqos-gray-400 focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none disabled:opacity-50 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="w-10 h-10 bg-arqos-black text-arqos-white rounded-xl flex items-center justify-center hover:bg-arqos-gray-800 disabled:bg-arqos-gray-300 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
