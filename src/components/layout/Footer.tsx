import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#000000] px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Logo */}
        <Image
          src="/images/logo-arqos-white.png"
          alt="ARQOS"
          width={1346}
          height={366}
          className="h-9 w-auto"
        />

        {/* Copyright */}
        <p
          className="mt-8 font-body text-sm"
          style={{ color: "#6E6E6E" }}
        >
          &copy; 2026 ARQOS. Todos los derechos reservados.
        </p>

        {/* SHF notice */}
        <p
          className="mt-2 font-body text-xs"
          style={{ color: "#6E6E6E" }}
        >
          Registro SHF en trámite.
        </p>

        {/* Privacy link */}
        <a
          href="/aviso-de-privacidad"
          className="mt-4 font-body text-xs transition-colors hover:text-white"
          style={{ color: "#6E6E6E" }}
        >
          Aviso de privacidad
        </a>
      </div>
    </footer>
  );
}
