'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  aprobarPublicacion,
  archivarPublicacion,
  eliminarPublicacion,
  guardarPublicacion,
  marcarComoPublicada,
  programarPublicacion,
  type EstadoPublicacion,
  type PlataformaRed,
  type PublicacionRedRow,
} from './actions';

type Tab = 'generador' | 'lista' | 'calendario';
type Tono = 'profesional' | 'cercano' | 'educativo' | 'promocional';

interface GeneracionIA {
  titulo: string;
  contenido: string;
  hashtags: string[];
}

const PLATAFORMAS: { value: PlataformaRed; label: string; color: string; bg: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', color: 'text-[#0A66C2]', bg: 'bg-[#E8F0FE]' },
  { value: 'instagram', label: 'Instagram', color: 'text-[#C1358B]', bg: 'bg-[#FDEEF7]' },
  { value: 'facebook', label: 'Facebook', color: 'text-[#1877F2]', bg: 'bg-[#E7F1FE]' },
  { value: 'x', label: 'X', color: 'text-slate-900', bg: 'bg-slate-100' },
  { value: 'tiktok', label: 'TikTok', color: 'text-slate-900', bg: 'bg-[#F1F5F9]' },
];

const ESTADOS: { value: EstadoPublicacion; label: string; bg: string; fg: string }[] = [
  { value: 'borrador', label: 'Borrador', bg: 'bg-slate-100', fg: 'text-slate-700' },
  { value: 'en_revision', label: 'En revisión', bg: 'bg-amber-100', fg: 'text-amber-800' },
  { value: 'aprobada', label: 'Aprobada', bg: 'bg-emerald-100', fg: 'text-emerald-800' },
  { value: 'programada', label: 'Programada', bg: 'bg-sky-100', fg: 'text-sky-800' },
  { value: 'publicada', label: 'Publicada', bg: 'bg-indigo-100', fg: 'text-indigo-800' },
  { value: 'archivada', label: 'Archivada', bg: 'bg-slate-200', fg: 'text-slate-500' },
];

const TONOS: { value: Tono; label: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'cercano', label: 'Cercano' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'promocional', label: 'Promocional' },
];

function platMeta(p: PlataformaRed) {
  return PLATAFORMAS.find((x) => x.value === p) ?? PLATAFORMAS[0];
}

function estadoMeta(e: EstadoPublicacion) {
  return ESTADOS.find((x) => x.value === e) ?? ESTADOS[0];
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mesYAnio(d: Date): string {
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

// -------------------- MAIN --------------------
export default function RedesClient({ publicaciones }: { publicaciones: PublicacionRedRow[] }) {
  const [tab, setTab] = useState<Tab>('generador');
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; msg: string } | null>(null);

  function mostrarToast(tipo: 'ok' | 'error', msg: string) {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Marketing y contenido
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Redes Sociales con IA
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Genera, revisa, programa y publica contenido de ARQOS con apoyo de IA.
          </p>
        </header>

        <div className="flex gap-1 border-b border-slate-200 mb-6">
          <TabBtn active={tab === 'generador'} onClick={() => setTab('generador')}>
            Generador
          </TabBtn>
          <TabBtn active={tab === 'lista'} onClick={() => setTab('lista')}>
            Lista ({publicaciones.length})
          </TabBtn>
          <TabBtn active={tab === 'calendario'} onClick={() => setTab('calendario')}>
            Calendario editorial
          </TabBtn>
        </div>

        {tab === 'generador' && <GeneradorTab onToast={mostrarToast} />}
        {tab === 'lista' && <ListaTab publicaciones={publicaciones} onToast={mostrarToast} />}
        {tab === 'calendario' && (
          <CalendarioTab publicaciones={publicaciones} onToast={mostrarToast} />
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg z-50 ${
            toast.tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-sm font-bold border-b-2 transition ${
        active
          ? 'border-slate-900 text-slate-900'
          : 'border-transparent text-slate-400 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

// -------------------- TAB 1: GENERADOR --------------------
function GeneradorTab({ onToast }: { onToast: (tipo: 'ok' | 'error', msg: string) => void }) {
  const [plataforma, setPlataforma] = useState<PlataformaRed>('linkedin');
  const [tema, setTema] = useState('');
  const [tono, setTono] = useState<Tono>('profesional');
  const [extras, setExtras] = useState('');
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<GeneracionIA | null>(null);
  const [editHashtags, setEditHashtags] = useState('');
  const [pending, startTransition] = useTransition();

  async function generar() {
    if (tema.trim().length < 3) {
      onToast('error', 'Describe un tema para la publicación.');
      return;
    }
    setGenerando(true);
    setResultado(null);
    try {
      const res = await fetch('/api/generar-contenido-redes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plataforma, tema, tono, extras }),
      });
      const data = (await res.json()) as Partial<GeneracionIA> & { error?: string };
      if (!res.ok || typeof data.contenido !== 'string') {
        onToast('error', data.error ?? 'No se pudo generar.');
        return;
      }
      const r: GeneracionIA = {
        titulo: data.titulo ?? tema.slice(0, 60),
        contenido: data.contenido,
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
      };
      setResultado(r);
      setEditHashtags(r.hashtags.join(' '));
    } catch (e) {
      onToast('error', e instanceof Error ? e.message : 'Error de red.');
    } finally {
      setGenerando(false);
    }
  }

  function guardarBorrador() {
    if (!resultado) return;
    const hashtagsFinales = editHashtags
      .split(/[\s,]+/)
      .map((h) => h.replace(/^#/, '').trim())
      .filter((h) => h.length > 0);
    startTransition(async () => {
      const promptOriginal = `Plataforma: ${plataforma} | Tono: ${tono} | Tema: ${tema}${
        extras ? ` | Extras: ${extras}` : ''
      }`;
      const r = await guardarPublicacion({
        plataforma,
        titulo: resultado.titulo,
        contenido: resultado.contenido,
        hashtags: hashtagsFinales,
        estado: 'borrador',
        generada_con_ia: true,
        prompt_original: promptOriginal,
      });
      if (r.exito) {
        onToast('ok', 'Borrador guardado.');
        setResultado(null);
        setTema('');
        setExtras('');
      } else {
        onToast('error', r.mensaje);
      }
    });
  }

  const meta = platMeta(plataforma);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
          Configura la generación
        </h2>

        <label className="block mb-4">
          <span className="text-xs font-bold text-slate-700 block mb-2">Plataforma</span>
          <div className="grid grid-cols-5 gap-2">
            {PLATAFORMAS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlataforma(p.value)}
                className={`py-2 px-1 text-xs font-bold rounded-lg border-2 transition ${
                  plataforma === p.value
                    ? `${p.bg} ${p.color} border-current`
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-4">
          <span className="text-xs font-bold text-slate-700 block mb-2">Tema</span>
          <textarea
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            rows={2}
            placeholder="Ej: Explicar qué es un avalúo SHF y cuándo se necesita"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:bg-white"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-bold text-slate-700 block mb-2">Tono</span>
          <div className="grid grid-cols-4 gap-2">
            {TONOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTono(t.value)}
                className={`py-2 text-xs font-bold rounded-lg border-2 transition ${
                  tono === t.value
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-5">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            Extras <span className="font-normal text-slate-400">(opcional)</span>
          </span>
          <textarea
            value={extras}
            onChange={(e) => setExtras(e.target.value)}
            rows={2}
            placeholder="Contexto adicional, campañas, producto específico a mencionar…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:bg-white"
          />
        </label>

        <button
          type="button"
          onClick={generar}
          disabled={generando}
          className="w-full bg-[#0F172A] text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-700 transition disabled:opacity-60"
        >
          {generando ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generando…
            </span>
          ) : (
            <>Generar con IA</>
          )}
        </button>
      </section>

      {/* Resultado */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
          Preview
        </h2>

        {!resultado && !generando && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-300 text-center">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">Aquí verás la publicación generada.</p>
          </div>
        )}

        {generando && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">La IA está redactando…</p>
          </div>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${meta.bg} ${meta.color}`}>
              {meta.label}
            </div>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                Título interno
              </span>
              <input
                value={resultado.titulo}
                onChange={(e) => setResultado({ ...resultado, titulo: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                Contenido ({resultado.contenido.length} chars)
              </span>
              <textarea
                value={resultado.contenido}
                onChange={(e) => setResultado({ ...resultado, contenido: e.target.value })}
                rows={10}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                Hashtags (separados por espacio)
              </span>
              <input
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={guardarBorrador}
                disabled={pending}
                className="flex-1 bg-[#0F172A] text-white font-bold text-sm py-2.5 rounded-xl hover:bg-slate-700 transition disabled:opacity-60"
              >
                {pending ? 'Guardando…' : 'Guardar borrador'}
              </button>
              <button
                type="button"
                onClick={() => setResultado(null)}
                className="px-4 bg-slate-100 text-slate-700 font-bold text-sm py-2.5 rounded-xl hover:bg-slate-200 transition"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// -------------------- TAB 2: LISTA --------------------
function ListaTab({
  publicaciones,
  onToast,
}: {
  publicaciones: PublicacionRedRow[];
  onToast: (tipo: 'ok' | 'error', msg: string) => void;
}) {
  const [filtroPlat, setFiltroPlat] = useState<PlataformaRed | 'todas'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPublicacion | 'todos'>('todos');
  const [editando, setEditando] = useState<PublicacionRedRow | null>(null);
  const [programando, setProgramando] = useState<PublicacionRedRow | null>(null);

  const filtradas = useMemo(() => {
    return publicaciones.filter((p) => {
      if (filtroPlat !== 'todas' && p.plataforma !== filtroPlat) return false;
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
      return true;
    });
  }, [publicaciones, filtroPlat, filtroEstado]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <select
          value={filtroPlat}
          onChange={(e) => setFiltroPlat(e.target.value as PlataformaRed | 'todas')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
        >
          <option value="todas">Todas las plataformas</option>
          {PLATAFORMAS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoPublicacion | 'todos')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">
          Mostrando {filtradas.length} de {publicaciones.length}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <th className="text-left px-4 py-3">Plataforma</th>
            <th className="text-left px-4 py-3">Título</th>
            <th className="text-left px-4 py-3">Estado</th>
            <th className="text-left px-4 py-3">Programada</th>
            <th className="text-right px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtradas.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                Sin publicaciones que coincidan.
              </td>
            </tr>
          )}
          {filtradas.map((p) => {
            const pm = platMeta(p.plataforma);
            const em = estadoMeta(p.estado);
            return (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${pm.bg} ${pm.color}`}
                  >
                    {pm.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 max-w-md truncate">
                  {p.titulo}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${em.bg} ${em.fg}`}
                  >
                    {em.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {formatFecha(p.programada_para)}
                </td>
                <td className="px-4 py-3">
                  <AccionesMenu
                    pub={p}
                    onEditar={() => setEditando(p)}
                    onProgramar={() => setProgramando(p)}
                    onToast={onToast}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editando && (
        <ModalEditar
          pub={editando}
          onClose={() => setEditando(null)}
          onToast={onToast}
        />
      )}
      {programando && (
        <ModalProgramar
          pub={programando}
          onClose={() => setProgramando(null)}
          onToast={onToast}
        />
      )}
    </section>
  );
}

function AccionesMenu({
  pub,
  onEditar,
  onProgramar,
  onToast,
}: {
  pub: PublicacionRedRow;
  onEditar: () => void;
  onProgramar: () => void;
  onToast: (tipo: 'ok' | 'error', msg: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function ejecutar(fn: () => Promise<{ exito: boolean; mensaje: string }>) {
    startTransition(async () => {
      const r = await fn();
      onToast(r.exito ? 'ok' : 'error', r.mensaje);
    });
  }

  const puedeAprobar = pub.estado === 'borrador' || pub.estado === 'en_revision';
  const puedeMarcarPublicada = pub.estado === 'aprobada' || pub.estado === 'programada';
  const puedeArchivar = pub.estado !== 'archivada';
  const puedeEliminar = pub.estado === 'borrador';

  return (
    <div className="flex justify-end gap-2 text-xs font-semibold">
      <button
        type="button"
        onClick={onEditar}
        className="text-slate-600 hover:text-slate-900"
        disabled={pending}
      >
        Ver/Editar
      </button>
      {puedeAprobar && (
        <button
          type="button"
          onClick={() => ejecutar(() => aprobarPublicacion(pub.id))}
          className="text-emerald-600 hover:text-emerald-800"
          disabled={pending}
        >
          Aprobar
        </button>
      )}
      <button
        type="button"
        onClick={onProgramar}
        className="text-sky-600 hover:text-sky-800"
        disabled={pending}
      >
        Programar
      </button>
      {puedeMarcarPublicada && (
        <button
          type="button"
          onClick={() => ejecutar(() => marcarComoPublicada(pub.id))}
          className="text-indigo-600 hover:text-indigo-800"
          disabled={pending}
        >
          Marcar publicada
        </button>
      )}
      {puedeArchivar && (
        <button
          type="button"
          onClick={() => ejecutar(() => archivarPublicacion(pub.id))}
          className="text-slate-500 hover:text-slate-700"
          disabled={pending}
        >
          Archivar
        </button>
      )}
      {puedeEliminar && (
        <button
          type="button"
          onClick={() => {
            if (confirm('¿Eliminar este borrador? No se puede deshacer.')) {
              ejecutar(() => eliminarPublicacion(pub.id));
            }
          }}
          className="text-red-600 hover:text-red-800"
          disabled={pending}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}

function ModalEditar({
  pub,
  onClose,
  onToast,
}: {
  pub: PublicacionRedRow;
  onClose: () => void;
  onToast: (tipo: 'ok' | 'error', msg: string) => void;
}) {
  const [titulo, setTitulo] = useState(pub.titulo);
  const [contenido, setContenido] = useState(pub.contenido);
  const [hashtagsText, setHashtagsText] = useState((pub.hashtags ?? []).join(' '));
  const [notas, setNotas] = useState(pub.notas ?? '');
  const [pending, startTransition] = useTransition();

  function guardar() {
    const hashtagsFinales = hashtagsText
      .split(/[\s,]+/)
      .map((h) => h.replace(/^#/, '').trim())
      .filter((h) => h.length > 0);
    startTransition(async () => {
      const r = await guardarPublicacion({
        id: pub.id,
        plataforma: pub.plataforma,
        titulo,
        contenido,
        hashtags: hashtagsFinales,
        imagen_url: pub.imagen_url,
        estado: pub.estado,
        programada_para: pub.programada_para,
        generada_con_ia: pub.generada_con_ia ?? true,
        prompt_original: pub.prompt_original,
        notas,
      });
      onToast(r.exito ? 'ok' : 'error', r.mensaje);
      if (r.exito) onClose();
    });
  }

  const pm = platMeta(pub.plataforma);
  const em = estadoMeta(pub.estado);

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${pm.bg} ${pm.color}`}>
              {pm.label}
            </span>
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${em.bg} ${em.fg}`}>
              {em.label}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-2xl">
            &times;
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Título
            </span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Contenido ({contenido.length} chars)
            </span>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Hashtags
            </span>
            <input
              value={hashtagsText}
              onChange={(e) => setHashtagsText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Notas internas
            </span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </label>
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Creada: {formatFecha(pub.created_at)} · Última edición:{' '}
            {formatFecha(pub.updated_at)}
            {pub.publicada_at && <> · Publicada: {formatFecha(pub.publicada_at)}</>}
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={pending}
            className="px-4 py-2 text-sm font-bold bg-[#0F172A] text-white rounded-lg hover:bg-slate-700 disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalProgramar({
  pub,
  onClose,
  onToast,
}: {
  pub: PublicacionRedRow;
  onClose: () => void;
  onToast: (tipo: 'ok' | 'error', msg: string) => void;
}) {
  const [fecha, setFecha] = useState(() => {
    if (pub.programada_para) {
      const d = new Date(pub.programada_para);
      if (!Number.isNaN(d.getTime())) {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      }
    }
    return '';
  });
  const [pending, startTransition] = useTransition();

  function programar() {
    if (!fecha) {
      onToast('error', 'Selecciona fecha y hora.');
      return;
    }
    startTransition(async () => {
      const r = await programarPublicacion(pub.id, fecha);
      onToast(r.exito ? 'ok' : 'error', r.mensaje);
      if (r.exito) onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-lg tracking-tight">Programar publicación</h3>
          <p className="text-xs text-slate-500 mt-1 truncate">{pub.titulo}</p>
        </div>
        <div className="p-6">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
              Fecha y hora
            </span>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={programar}
            disabled={pending}
            className="px-4 py-2 text-sm font-bold bg-[#0F172A] text-white rounded-lg hover:bg-slate-700 disabled:opacity-60"
          >
            {pending ? 'Programando…' : 'Programar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------- TAB 3: CALENDARIO --------------------
function CalendarioTab({
  publicaciones,
  onToast,
}: {
  publicaciones: PublicacionRedRow[];
  onToast: (tipo: 'ok' | 'error', msg: string) => void;
}) {
  const [cursor, setCursor] = useState<Date>(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [detalle, setDetalle] = useState<PublicacionRedRow | null>(null);

  const celdas = useMemo(() => {
    const primerDia = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const ultimoDia = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const diasMes = ultimoDia.getDate();
    // getDay(): 0=Dom, 1=Lun. Queremos semana empezando lunes.
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    const totalCeldas = Math.ceil((offsetInicio + diasMes) / 7) * 7;
    const arr: { fecha: Date | null; key: string }[] = [];
    for (let i = 0; i < totalCeldas; i++) {
      const diaNum = i - offsetInicio + 1;
      if (diaNum < 1 || diaNum > diasMes) {
        arr.push({ fecha: null, key: `v-${i}` });
      } else {
        arr.push({
          fecha: new Date(cursor.getFullYear(), cursor.getMonth(), diaNum),
          key: `d-${diaNum}`,
        });
      }
    }
    return arr;
  }, [cursor]);

  const pubsPorDia = useMemo(() => {
    const map = new Map<string, PublicacionRedRow[]>();
    for (const p of publicaciones) {
      const ref = p.programada_para ?? p.publicada_at;
      if (!ref) continue;
      const d = new Date(ref);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getMonth() !== cursor.getMonth() || d.getFullYear() !== cursor.getFullYear()) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [publicaciones, cursor]);

  const diasLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const hoy = new Date();
  const hoyKey = `${hoy.getFullYear()}-${hoy.getMonth()}-${hoy.getDate()}`;

  function prev() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  }
  function next() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  }
  function irAHoy() {
    const h = new Date();
    setCursor(new Date(h.getFullYear(), h.getMonth(), 1));
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight capitalize">{mesYAnio(cursor)}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Muestra publicaciones programadas o publicadas en el mes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold"
            aria-label="Mes anterior"
          >
            &lsaquo;
          </button>
          <button
            onClick={irAHoy}
            className="px-3 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold"
          >
            Hoy
          </button>
          <button
            onClick={next}
            className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold"
            aria-label="Mes siguiente"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasLabels.map((d) => (
          <div
            key={d}
            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center py-2"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((c) => {
          if (!c.fecha) {
            return <div key={c.key} className="min-h-[90px] rounded-lg bg-slate-50/40" />;
          }
          const k = `${c.fecha.getFullYear()}-${c.fecha.getMonth()}-${c.fecha.getDate()}`;
          const items = pubsPorDia.get(k) ?? [];
          const esHoy = k === hoyKey;
          return (
            <div
              key={c.key}
              className={`min-h-[90px] rounded-lg border p-1.5 flex flex-col gap-1 ${
                esHoy ? 'border-slate-900 bg-slate-50' : 'border-slate-100'
              }`}
            >
              <span
                className={`text-xs font-bold ${esHoy ? 'text-slate-900' : 'text-slate-400'}`}
              >
                {c.fecha.getDate()}
              </span>
              <div className="flex flex-col gap-1 overflow-hidden">
                {items.slice(0, 3).map((p) => {
                  const pm = platMeta(p.plataforma);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setDetalle(p)}
                      className={`text-left text-[10px] font-bold px-1.5 py-1 rounded truncate ${pm.bg} ${pm.color} hover:opacity-80`}
                      title={p.titulo}
                    >
                      {p.titulo}
                    </button>
                  );
                })}
                {items.length > 3 && (
                  <span className="text-[10px] text-slate-400 px-1.5">
                    +{items.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detalle && (
        <ModalEditar pub={detalle} onClose={() => setDetalle(null)} onToast={onToast} />
      )}
    </section>
  );
}
