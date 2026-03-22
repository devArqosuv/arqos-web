import { Hero } from "@/components/sections/Hero";
import { Statement } from "@/components/sections/Statement";
import { Servicios } from "@/components/sections/Servicios";
import { AgentFeed } from "@/components/sections/AgentFeed";
import { Estandar } from "@/components/sections/Estandar";
import { Tecnologia } from "@/components/sections/Tecnologia";
import { Contacto } from "@/components/sections/Contacto";

export default function Home() {
  return (
    <>
      <Hero />
      <Statement />
      <Servicios />
      <AgentFeed />
      <Estandar />
      <Tecnologia />
      <Contacto />
    </>
  );
}
