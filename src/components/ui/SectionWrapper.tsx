import { ReactNode } from "react";

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function SectionWrapper({
  children,
  className = "",
  id,
}: SectionWrapperProps) {
  return (
    <section id={id} className={`mx-auto max-w-7xl px-6 py-20 md:px-12 lg:py-28 ${className}`}>
      {children}
    </section>
  );
}
