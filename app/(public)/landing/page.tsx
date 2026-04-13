import { Hero } from '@/app/components/sections/Hero';
import { Statement } from '@/app/components/sections/Statement';
import { Servicios } from '@/app/components/sections/Servicios';
import { AgentFeed } from '@/app/components/sections/AgentFeed';
import { Estandar } from '@/app/components/sections/Estandar';
import { Tecnologia } from '@/app/components/sections/Tecnologia';
import { Contacto } from '@/app/components/sections/Contacto';

export default function LandingPage() {
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
