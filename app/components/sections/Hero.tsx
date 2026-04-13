"use client";

import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999 });
  const containerRef = useRef<HTMLElement>(null);

  const initParticles = useCallback((W: number, H: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.8 + 0.6,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = container.offsetWidth;
    let H = container.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    particlesRef.current = initParticles(W, H);

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce on edges
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80 && dist > 0) {
          p.x += (dx / dist) * dist * 0.015;
          p.y += (dy / dist) * dist * 0.015;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fill();

        // Connect particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ddx = p.x - p2.x;
          const ddy = p.y - p2.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 100) {
            const alpha = (1 - d / 100) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -999, y: -999 };
    };

    const handleResize = () => {
      W = container.offsetWidth;
      H = container.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      particlesRef.current = initParticles(W, H);
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, [initParticles]);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6 overflow-hidden isolate"
    >
      {/* Particle canvas background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ zIndex: 0, willChange: 'transform', isolation: 'isolate' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div
          className="animate-fadeIn relative mx-auto h-[60px] w-[240px]"
          style={{ opacity: 0, animationDelay: "0ms" }}
        >
          <Image
            src="/images/logo-arqos-black.png"
            alt="ARQOS"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Headline */}
        <h1
          className="animate-fadeIn mt-8 max-w-4xl font-display text-5xl font-bold leading-tight tracking-tight text-black md:text-7xl"
          style={{ opacity: 0, animationDelay: "150ms" }}
        >
          Precisión que impulsa decisiones.
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fadeIn mx-auto mt-6 max-w-xl font-body text-lg leading-relaxed"
          style={{ opacity: 0, animationDelay: "300ms", color: "#6E6E6E" }}
        >
          Unidad de Valuación con infraestructura de datos e inteligencia artificial
        </p>

        {/* Pill / Badge */}
        <span
          className="animate-fadeIn mt-4 inline-block rounded-full border border-black px-4 py-1 font-body text-xs uppercase tracking-widest text-black"
          style={{ opacity: 0, animationDelay: "450ms" }}
        >
          Registro SHF en trámite
        </span>

        {/* CTA Button */}
        <button
          className="animate-fadeIn mt-10 inline-flex items-center gap-2 font-body text-sm font-medium uppercase tracking-wide text-black transition-colors hover:bg-arqos-gray-100 px-6 py-3"
          style={{ opacity: 0, animationDelay: "600ms" }}
          onClick={() =>
            document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Conocer más
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
