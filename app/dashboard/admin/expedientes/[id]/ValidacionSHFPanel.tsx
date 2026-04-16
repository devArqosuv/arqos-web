'use client';

// =============================================================
// Panel "Validación SHF" — solo visible en el detalle admin para
// avalúos aprobados. Llama a los endpoints /api/shf/validar y
// /api/shf/xml y muestra los resultados.
// =============================================================

import { useState } from 'react';

interface ErrorValidacion {
  campo: string;
  mensaje: string;
  nivel: 'error' | 'warning';
}

interface ValidacionSHF {
  valido: boolean;
  errores: ErrorValidacion[];
  camposCompletos: number;
  camposTotal: number;
}

interface Props {
  avaluoId: string;
  estado: string;
}

export default function ValidacionSHFPanel({ avaluoId, estado }: Props) {
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<ValidacionSHF | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (estado !== 'aprobado') return null;

  async function onValidar() {
    setValidando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch('/api/shf/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaluo_id: avaluoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Error al validar.');
        return;
      }
      setResultado(data as ValidacionSHF);
    } catch {
      setError('Error de red al validar.');
    } finally {
      setValidando(false);
    }
  }

  function onDescargarXml() {
    window.open(`/api/shf/xml?id=${encodeURIComponent(avaluoId)}`, '_blank');
  }

  const errores = resultado?.errores.filter((e) => e.nivel === 'error') ?? [];
  const warnings = resultado?.errores.filter((e) => e.nivel === 'warning') ?? [];

  return (
    <section className="mx-6 my-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Validación SHF</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Valida el expediente contra las reglas SHF y descarga el XML regulatorio.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onValidar}
            disabled={validando}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {validando ? 'Validando…' : 'Validar para SHF'}
          </button>
          <button
            onClick={onDescargarXml}
            disabled={!!resultado && !resultado.valido}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            title={
              resultado && !resultado.valido
                ? 'Hay errores de validación que impiden la descarga'
                : 'Descargar XML SHF'
            }
          >
            Descargar XML SHF
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      {resultado && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <span
              className={
                'rounded-full px-2 py-0.5 font-semibold ' +
                (resultado.valido
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800')
              }
            >
              {resultado.valido ? 'VÁLIDO' : 'NO VÁLIDO'}
            </span>
            <span className="text-slate-600">
              Campos SHF cubiertos: {resultado.camposCompletos}/{resultado.camposTotal}
            </span>
          </div>

          {errores.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-bold text-red-800">
                Errores ({errores.length})
              </h3>
              <ul className="space-y-1 text-xs text-red-800">
                {errores.map((e, i) => (
                  <li key={`e-${i}`} className="rounded border border-red-200 bg-red-50 px-2 py-1">
                    <span className="font-mono text-[10px] opacity-70">{e.campo}</span>{' '}
                    — {e.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-bold text-amber-800">
                Advertencias ({warnings.length})
              </h3>
              <ul className="space-y-1 text-xs text-amber-800">
                {warnings.map((w, i) => (
                  <li
                    key={`w-${i}`}
                    className="rounded border border-amber-200 bg-amber-50 px-2 py-1"
                  >
                    <span className="font-mono text-[10px] opacity-70">{w.campo}</span>{' '}
                    — {w.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errores.length === 0 && warnings.length === 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              Sin errores ni advertencias — el XML SHF está listo para descarga.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
