import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-5xl font-bold tracking-widest text-arqos-black">
        ARQOS
      </h1>
      <p className="font-body text-lg text-arqos-gray-500">
        Página no encontrada
      </p>
      <Link
        href="/"
        className="font-body text-sm font-medium uppercase tracking-wide text-arqos-black underline underline-offset-4 transition-colors hover:text-arqos-gray-600"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
