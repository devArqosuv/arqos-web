import type { Metadata } from "next";
import { DataHero } from "@/app/components/arqos-data/DataHero";
import { ArqosDataClient } from "./ArqosDataClient";

export const metadata: Metadata = {
  title: "ARQOS Data — Estimación de Valor con IA",
  description:
    "Conoce el valor estimado de tu propiedad en segundos. Inteligencia artificial aplicada a la valuación inmobiliaria en México.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ArqosDataPage() {
  return (
    <>
      <DataHero />
      <ArqosDataClient />
    </>
  );
}
