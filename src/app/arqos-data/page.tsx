import type { Metadata } from "next";
import { DataHero } from "@/components/arqos-data/DataHero";
import { DataChat } from "@/components/arqos-data/DataChat";

export const metadata: Metadata = {
  title: "ARQOS Data (Preview)",
  description:
    "Interfaz en construcción del asistente de valuación ARQOS Data. Acceso interno, no destinado al público.",
  // Página no pública: ocultamos de buscadores y motores de IA.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": -1,
      "max-image-preview": "none",
      "max-video-preview": -1,
    },
  },
};

export default function ArqosDataPage() {
  return (
    <>
      <DataHero />
      <DataChat />
    </>
  );
}
