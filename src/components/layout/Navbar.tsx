"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { label: "Servicios", href: "#servicios" },
  { label: "El estándar", href: "#estandar" },
  { label: "Tecnología", href: "#tecnologia" },
  { label: "Contacto", href: "#contacto" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isHome = window.location.pathname === "/";
    if (!isHome) {
      setVisible(true);
      return;
    }
    const threshold = () => window.innerHeight * 0.8;
    const onScroll = () => setVisible(window.scrollY > threshold());
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToContacto = () => {
    document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-arqos-gray-200 bg-arqos-white/80 backdrop-blur-md transition-all duration-500 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/images/logo-arqos-black.png"
            alt="ARQOS"
            width={1314}
            height={357}
            className="h-11 w-auto"
            priority
          />
        </Link>

        {/* Desktop Links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="font-body text-sm font-medium tracking-wide text-arqos-gray-600 transition-colors hover:text-arqos-black"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button variant="primary" onClick={scrollToContacto}>
            Solicitar información
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? (
            <X className="h-6 w-6 text-arqos-black" />
          ) : (
            <Menu className="h-6 w-6 text-arqos-black" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-arqos-gray-200 bg-arqos-white px-6 py-6 md:hidden">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="block font-body text-base font-medium text-arqos-gray-700 transition-colors hover:text-arqos-black"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Button variant="primary" className="w-full" onClick={scrollToContacto}>
              Solicitar información
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
