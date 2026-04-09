'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  agendarVisitaAction,
  subirFotosVisitaAction,
  ajustarYEnviarRevisionAction,
} from '../actions';
import { firmarValuadorAction, obtenerUrlPdfOficialAction } from '../../../firma/actions';

interface Props {
  avaluo: {
    id: string;
    folio: string | null;
    estado: string;
    calle: string;
    colonia: string | null;
    municipio: string;
    estado_inmueble: string;
    valor_estimado: number | null;
    valor_uv: number | null;
    valor_valuador: number | null;
    moneda: string;
    notas: string | null;
    uso_suelo: string | null;
    uso_suelo_auto: boolean;
    fecha_solicitud: string;
    fecha_visita_agendada: string | null;
    fecha_visita_realizada: string | null;
    firmado_uv: boolean;
    firmado_valuador: boolean;
    fecha_firma_uv: string | null;
    fecha_firma_valuador: string | null;
    pdf_oficial_path: string | null;
    valuador: { nombre: string; apellidos: string | null } | null;
  };
  contadoresFotos: {
    fachada: number;
    entorno: number;
    interior: number;
  };
}

const ESTADO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  solicitud:        { label: 'Solicitud',        bg: 'bg-blue-50 border-blue-200',     color: 'text-blue-700' },
  captura:          { label: 'Captura',          bg: 'bg-amber-50 border-amber-200',   color: 'text-amber-700' },
  agenda_visita:    { label: 'Agenda Visita',    bg: 'bg-orange-50 border-orange-200', color: 'text-orange-700' },
  visita_realizada: { label: 'Visita Realizada', bg: 'bg-purple-50 border-purple-200', color: 'text-purple-700' },
  preavaluo:        { label: 'Preavalúo',        bg: 'bg-cyan-50 border-cyan-200',     color: 'text-cyan-700' },
  revision:         { label: 'Revisión',         bg: 'bg-violet-50 border-violet-200', color: 'text-violet-700' },
  firma:            { label: 'Firma',            bg: 'bg-sky-50 border-sky-200',       color: 'text-sky-700' },
  aprobado:         { label: 'Aprobado',         bg: 'bg-emerald-50 border-emerald-200', color: 'text-emerald-700' },
  rechazado:        { label: 'Rechazado',        bg: 'bg-red-50 border-red-200',       color: 'text-red-700' },
};

export default function AvaluoDetailClient({ avaluo, contadoresFotos }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [fechaVisita, setFechaVisita] = useState('');

  // Estado de las fotos (solo se usa en estado agenda_visita)
  const [fachada, setFachada] = useState<File | null>(null);
  const [entornos, setEntornos] = useState<(File | null)[]>([null, null]);
  const [interiores, setInteriores] = useState<(File | null)[]>([null, null, null, null, null, null, null, null]);
  const fachadaRef = useRef<HTMLInputElement>(null);
  const entornoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const interiorRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Estado del ajuste de valor (preavaluo)
  // Inicializamos con el valor UV para que el valuador acepte por defecto
  const [valorAjustado, setValorAjustado] = useState<string>('');
  useEffect(() => {
    if (avaluo.estado === 'preavaluo' && avaluo.valor_uv && !valorAjustado) {
      setValorAjustado(String(avaluo.valor_uv));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaluo.estado, avaluo.valor_uv]);

  const mostrarToast = (tipo: 'exito' | 'error', texto: string) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 5000);
  };

  const totalFotos = (fachada ? 1 : 0) + entornos.filter(Boolean).length + interiores.filter(Boolean).length;
  const fotosCompletas = !!fachada && entornos.every(Boolean) && interiores.every(Boolean);

  const estadoCfg = ESTADO_LABELS[avaluo.estado] || ESTADO_LABELS.solicitud;
  const direccionCompleta = `${avaluo.calle}${avaluo.colonia ? ', ' + avaluo.colonia : ''}, ${avaluo.municipio}, ${avaluo.estado_inmueble}`;

  const handleAgendar = () => {
    if (!fechaVisita) {
      mostrarToast('error', 'Selecciona fecha y hora antes de agendar.');
      return;
    }
    startTransition(async () => {
      const res = await agendarVisitaAction(avaluo.id, new Date(fechaVisita).toISOString());
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleSubirFotos = () => {
    if (!fotosCompletas) {
      mostrarToast('error', 'Faltan fotos: necesitas 1 fachada, 2 entorno y 8 interior.');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append('avaluoId', avaluo.id);
      if (fachada) fd.append('fachada', fachada);
      entornos.forEach((f) => f && fd.append('entorno', f));
      interiores.forEach((f) => f && fd.append('interior', f));

      const res = await subirFotosVisitaAction(fd);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleAjustarValor = () => {
    const valor = parseFloat(valorAjustado);
    if (!Number.isFinite(valor) || valor <= 0) {
      mostrarToast('error', 'Ingresa un valor válido mayor a cero.');
      return;
    }
    startTransition(async () => {
      const res = await ajustarYEnviarRevisionAction(avaluo.id, valor);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleFirmarValuador = () => {
    startTransition(async () => {
      const res = await firmarValuadorAction(avaluo.id);
      mostrarToast(res.exito ? 'exito' : 'error', res.mensaje);
      if (res.exito) router.refresh();
    });
  };

  const handleDescargarPdf = () => {
    startTransition(async () => {
      const res = await obtenerUrlPdfOficialAction(avaluo.id);
      if (res.error || !res.url) {
        mostrarToast('error', res.error || 'No se pudo obtener el PDF.');
        return;
      }
      window.open(res.url, '_blank');
    });
  };

  const updateEntorno = (idx: number, file: File | null) => {
    setEntornos((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
  };

  const updateInterior = (idx: number, file: File | null) => {
    setInteriores((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            EXPEDIENTE {avaluo.folio || '—'}
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{direccionCompleta}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Solicitado el {new Date(avaluo.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-[10px] font-bold border px-3 py-1.5 rounded-full ${estadoCfg.bg} ${estadoCfg.color}`}>
          {estadoCfg.label}
        </span>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs font-semibold ${
            toast.tipo === 'exito'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.texto.split('\n').map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}

      {/* Resumen del avalúo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Valor estimado</p>
          <p className="text-xl font-black text-slate-900">
            {avaluo.valor_estimado
              ? `${avaluo.moneda} $${Number(avaluo.valor_estimado).toLocaleString('es-MX')}`
              : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Uso de suelo</p>
          <p className="text-xs font-bold text-slate-800">{avaluo.uso_suelo || '—'}</p>
          {avaluo.uso_suelo_auto && (
            <p className="text-[9px] text-emerald-600 font-bold mt-1">AUTO • CATÁLOGO QRO</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Visita</p>
          {avaluo.fecha_visita_realizada ? (
            <p className="text-xs font-bold text-emerald-700">
              ✓ Realizada{' '}
              {new Date(avaluo.fecha_visita_realizada).toLocaleDateString('es-MX')}
            </p>
          ) : avaluo.fecha_visita_agendada ? (
            <p className="text-xs font-bold text-orange-700">
              📅 Agendada{' '}
              {new Date(avaluo.fecha_visita_agendada).toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          ) : (
            <p className="text-xs font-semibold text-slate-400">Sin agendar</p>
          )}
        </div>
      </div>

      {/* Acción según estado */}
      {avaluo.estado === 'captura' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">
              SIGUIENTE PASO
            </p>
            <h2 className="text-lg font-black text-slate-900">Agendar visita al inmueble</h2>
            <p className="text-xs text-slate-500 mt-1">
              Documentación validada. Programa la visita física al inmueble para tomar las 11 fotografías requeridas.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Fecha y hora de la visita
            </label>
            <input
              type="datetime-local"
              value={fechaVisita}
              onChange={(e) => setFechaVisita(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:border-[#0F172A] focus:bg-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleAgendar}
            disabled={pending || !fechaVisita}
            className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            {pending ? 'AGENDANDO…' : 'AGENDAR VISITA'}
          </button>
        </section>
      )}

      {avaluo.estado === 'agenda_visita' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">
              SIGUIENTE PASO
            </p>
            <h2 className="text-lg font-black text-slate-900">Subir las 11 fotografías de la visita</h2>
            <p className="text-xs text-slate-500 mt-1">
              Se requiere exactamente: <strong>1 fachada</strong>, <strong>2 entorno</strong> y <strong>8 interior</strong>.
              Total: 11 fotos.
            </p>
          </div>

          {/* Fachada */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Fachada (1) — {fachada ? '✓' : 'pendiente'}
            </p>
            <input
              ref={fachadaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setFachada(e.target.files?.[0] || null)}
            />
            <SlotFoto
              file={fachada}
              onClick={() => fachadaRef.current?.click()}
              etiqueta="Fachada principal"
            />
          </div>

          {/* Entorno */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Entorno (2) — {entornos.filter(Boolean).length}/2
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div key={i}>
                  <input
                    ref={(el) => { entornoRefs.current[i] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => updateEntorno(i, e.target.files?.[0] || null)}
                  />
                  <SlotFoto
                    file={entornos[i]}
                    onClick={() => entornoRefs.current[i]?.click()}
                    etiqueta={`Entorno ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Interior */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Interior (8) — {interiores.filter(Boolean).length}/8
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i}>
                  <input
                    ref={(el) => { interiorRefs.current[i] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => updateInterior(i, e.target.files?.[0] || null)}
                  />
                  <SlotFoto
                    file={interiores[i]}
                    onClick={() => interiorRefs.current[i]?.click()}
                    etiqueta={`Interior ${i + 1}`}
                    pequeño
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Progreso + botón */}
          <div className="pt-2 space-y-3">
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F172A] rounded-full transition-all duration-500"
                style={{ width: `${(totalFotos / 11) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleSubirFotos}
              disabled={pending || !fotosCompletas}
              className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
            >
              {pending
                ? 'SUBIENDO…'
                : fotosCompletas
                ? 'MARCAR VISITA REALIZADA Y SUBIR FOTOS'
                : `FALTAN ${11 - totalFotos} FOTO(S)`}
            </button>
          </div>
        </section>
      )}

      {avaluo.estado === 'visita_realizada' && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Visita realizada</h2>
              <p className="text-xs text-slate-500 mt-1">
                Se subieron correctamente las {contadoresFotos.fachada + contadoresFotos.entorno + contadoresFotos.interior} fotografías.
                {' '}Esperando que el controlador (UV) capture comparables y genere el preavalúo.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <DotCount label="Fachada" count={contadoresFotos.fachada} esperado={1} />
            <DotCount label="Entorno" count={contadoresFotos.entorno} esperado={2} />
            <DotCount label="Interior" count={contadoresFotos.interior} esperado={8} />
          </div>
        </section>
      )}

      {avaluo.estado === 'preavaluo' && (
        <section className="bg-white rounded-2xl border-2 border-cyan-300 shadow-md p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest mb-1">
              SIGUIENTE PASO
            </p>
            <h2 className="text-lg font-black text-slate-900">Revisar preavalúo y ajustar valor</h2>
            <p className="text-xs text-slate-500 mt-1">
              El controlador (UV) generó un preavalúo con base en los comparables del mercado.
              Revisa el valor y ajústalo si lo consideras necesario antes de enviarlo a revisión final.
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-5">
            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-2">Valor UV (Controlador)</p>
            <p className="text-3xl font-black text-slate-900">
              {avaluo.valor_uv
                ? `${avaluo.moneda} $${Number(avaluo.valor_uv).toLocaleString('es-MX')}`
                : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Calculado por homologación de comparables</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Tu valor (puedes aceptar el UV o ajustarlo)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorAjustado}
                onChange={(e) => setValorAjustado(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-base font-black text-slate-900 focus:border-[#0F172A] focus:bg-white outline-none"
              />
            </div>
            {avaluo.valor_uv && parseFloat(valorAjustado) > 0 && (
              <p className="text-[10px] text-slate-500 font-semibold">
                {(() => {
                  const v = parseFloat(valorAjustado);
                  const diff = v - avaluo.valor_uv!;
                  const pct = (diff / avaluo.valor_uv!) * 100;
                  if (Math.abs(pct) < 0.01) return 'Aceptas el valor UV sin cambios.';
                  return (
                    <>
                      Diferencia vs UV:{' '}
                      <span className={`font-black ${diff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {diff >= 0 ? '+' : ''}${diff.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                        {' '}({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                      </span>
                    </>
                  );
                })()}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAjustarValor}
            disabled={pending || !valorAjustado || parseFloat(valorAjustado) <= 0}
            className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            {pending ? 'ENVIANDO…' : 'CONFIRMAR Y ENVIAR A REVISIÓN'}
          </button>
        </section>
      )}

      {(avaluo.estado === 'revision' || avaluo.estado === 'firma' || avaluo.estado === 'aprobado') && avaluo.valor_uv && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-lg">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            {avaluo.estado === 'revision'
              ? 'En revisión final con el controlador'
              : avaluo.estado === 'firma'
              ? 'Pendiente de firma'
              : 'Avalúo aprobado'}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-1">Valor UV</p>
              <p className="text-2xl font-black">{avaluo.moneda} ${Number(avaluo.valor_uv).toLocaleString('es-MX')}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Tu valor</p>
              <p className="text-2xl font-black">
                {avaluo.valor_valuador ? `${avaluo.moneda} $${Number(avaluo.valor_valuador).toLocaleString('es-MX')}` : '—'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Bloque de firma del valuador — solo en estado firma */}
      {avaluo.estado === 'firma' && (
        <section className="bg-white rounded-2xl border-2 border-sky-300 shadow-md p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">FIRMA ELECTRÓNICA</p>
            <h2 className="text-lg font-black text-slate-900">Firmas pendientes</h2>
            <p className="text-xs text-slate-500 mt-1">
              Para liberar el avalúo y generar el documento oficial, ambas partes deben firmar.
              El controlador (UV) firma primero, después tú firmas y se genera el PDF automáticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Firma UV */}
            <div className={`rounded-xl border-2 p-4 ${avaluo.firmado_uv ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">UV (Controlador)</p>
              {avaluo.firmado_uv ? (
                <>
                  <p className="text-sm font-black text-emerald-700">✓ Firmado</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {avaluo.fecha_firma_uv && new Date(avaluo.fecha_firma_uv).toLocaleString('es-MX')}
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-slate-400">Pendiente</p>
              )}
            </div>

            {/* Firma Valuador */}
            <div className={`rounded-xl border-2 p-4 ${avaluo.firmado_valuador ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tú (Valuador)</p>
              {avaluo.firmado_valuador ? (
                <>
                  <p className="text-sm font-black text-emerald-700">✓ Firmado</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {avaluo.fecha_firma_valuador && new Date(avaluo.fecha_firma_valuador).toLocaleString('es-MX')}
                  </p>
                </>
              ) : avaluo.firmado_uv ? (
                <p className="text-sm font-bold text-sky-600">Listo para firmar</p>
              ) : (
                <p className="text-sm font-bold text-slate-400">Esperando al controlador…</p>
              )}
            </div>
          </div>

          {/* Botón de firma del valuador */}
          {avaluo.firmado_uv && !avaluo.firmado_valuador && (
            <button
              type="button"
              onClick={handleFirmarValuador}
              disabled={pending}
              className="w-full bg-[#0F172A] hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
            >
              {pending ? 'FIRMANDO Y GENERANDO PDF…' : '✍ FIRMAR Y GENERAR DOCUMENTO OFICIAL'}
            </button>
          )}

          {!avaluo.firmado_uv && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-amber-700">
                ⏳ Esperando que el controlador (UV) firme primero.
              </p>
              <p className="text-[10px] text-amber-600 mt-1">
                Te avisaremos cuando puedas firmar.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Bloque de descarga del PDF — solo cuando está aprobado */}
      {avaluo.estado === 'aprobado' && avaluo.pdf_oficial_path && (
        <section className="bg-white rounded-2xl border-2 border-emerald-300 shadow-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✓</span>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">EXPEDIENTE COMPLETADO</p>
              <h2 className="text-lg font-black text-slate-900">Avalúo aprobado y firmado</h2>
              <p className="text-xs text-slate-500 mt-1">
                Ambas partes firmaron el documento. El PDF oficial está listo para descargar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDescargarPdf}
            disabled={pending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {pending ? 'OBTENIENDO…' : 'DESCARGAR PDF OFICIAL'}
          </button>
        </section>
      )}

      {/* Notas */}
      {avaluo.notas && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notas del expediente</p>
          <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">{avaluo.notas}</p>
        </section>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────
function SlotFoto({
  file,
  onClick,
  etiqueta,
  pequeño,
}: {
  file: File | null;
  onClick: () => void;
  etiqueta: string;
  pequeño?: boolean;
}) {
  const altura = pequeño ? 'h-20' : 'h-28';
  if (file) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full ${altura} rounded-lg overflow-hidden border-2 border-emerald-300 bg-emerald-50`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={URL.createObjectURL(file)}
          alt={etiqueta}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] font-bold py-1 text-center">
          ✓ {pequeño ? '' : etiqueta}
        </div>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full ${altura} rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition flex flex-col items-center justify-center gap-1 text-slate-400`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      <span className="text-[9px] font-bold uppercase tracking-wider">{etiqueta}</span>
    </button>
  );
}

function DotCount({ label, count, esperado }: { label: string; count: number; esperado: number }) {
  const ok = count >= esperado;
  return (
    <div className={`rounded-lg border px-3 py-2 ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-black ${ok ? 'text-emerald-700' : 'text-slate-700'}`}>
        {count}/{esperado}
      </p>
    </div>
  );
}
