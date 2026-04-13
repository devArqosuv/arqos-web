import { Sparkles } from "lucide-react";

export function DataHero() {
  return (
    <section className="relative isolate overflow-hidden bg-arqos-white pt-32 pb-12 md:pt-40 md:pb-16">
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-arqos-black/15 bg-arqos-white/60 px-4 py-1.5 font-body text-[11px] uppercase tracking-[0.2em] text-arqos-gray-700 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Inteligencia Artificial
        </span>

        {/* Title */}
        <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] tracking-tight text-arqos-black md:text-7xl">
          Conoce el <span className="italic text-arqos-gray-600">valor</span>
          <br />de tu propiedad
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-arqos-gray-600 md:text-xl">
          Estimación de valor impulsada por inteligencia artificial.
          Ingresa los datos de tu inmueble y obtén un rango de valor en segundos,
          basado en datos de mercado actualizados.
        </p>

        {/* Divider */}
        <div className="mt-10 h-px w-16 bg-arqos-black/20" />

        {/* Flow steps */}
        <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Describe",
              body: "Ingresa la dirección, tipo de inmueble y superficie de tu propiedad.",
            },
            {
              step: "02",
              title: "Estima",
              body: "Nuestra IA analiza el mercado y genera un rango de valor al instante.",
            },
            {
              step: "03",
              title: "Refina",
              body: "Platica con la IA para afinar el estimado con detalles de acabados y zona.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex flex-col items-center text-center md:items-start md:text-left"
            >
              <span className="font-display text-xs tracking-[0.3em] text-arqos-gray-400">
                {item.step}
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-arqos-black">
                {item.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-arqos-gray-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
