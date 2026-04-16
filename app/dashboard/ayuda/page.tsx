import Link from 'next/link';
import { requireRole } from '@/util/supabase/dal';

// ─────────────────────────────────────────────────────────
// Página de Ayuda — ARQOS
// Accesible para cualquier rol autenticado (admin, valuador, controlador)
// ─────────────────────────────────────────────────────────

const GUIAS_ROL = [
  {
    rol: 'Valuador',
    descripcion: 'Captura avalúos, sube documentos, llena la tabla SHF y firma el preavalúo.',
    pasos: [
      'Entra a AVALÚOS y crea un nuevo expediente.',
      'Sube documentos (CURT, escrituras, predial, INE). La IA llena campos SHF automáticamente.',
      'Agenda la visita, súbela al sistema y registra fotos (fachada, portada, entorno, interior).',
      'Construye el preavalúo con comparables y revisa la tabla SHF.',
      'Firma el PDF cuando la revisión sea aprobada.',
    ],
    href: '/dashboard/valuador/inicio',
  },
  {
    rol: 'Controlador',
    descripcion: 'Revisa preavalúos del equipo, aprueba, rechaza o solicita correcciones.',
    pasos: [
      'Entra a PANEL PRINCIPAL para ver los expedientes pendientes de revisión.',
      'Abre un expediente y verifica documentos, SHF y comparables.',
      'Elige Aprobar, Solicitar Correcciones o Rechazar — escribe siempre una nota.',
      'Consulta HISTORIAL para auditar decisiones anteriores.',
    ],
    href: '/dashboard/controlador',
  },
  {
    rol: 'Administrador',
    descripcion: 'Gestiona usuarios, bancos, plantillas y noticias del sistema.',
    pasos: [
      'En PANEL ADMIN administra usuarios (crear, editar rol, desactivar).',
      'En TABLA SHF revisa todos los avalúos y exporta a Excel.',
      'En NOTICIAS publica avisos segmentados por rol.',
      'Supervisa los dashboards de valuador y controlador sin perder contexto.',
    ],
    href: '/dashboard/admin',
  },
];

const ESTADOS_FLUJO = [
  { key: 'solicitud',        label: 'Solicitud',        desc: 'El cliente o el banco solicita un avalúo. Se crea el expediente con datos básicos.' },
  { key: 'captura',          label: 'Captura',          desc: 'El valuador completa datos del inmueble y sube la documentación inicial.' },
  { key: 'agenda_visita',    label: 'Agenda Visita',    desc: 'Se programa la visita física al inmueble con el propietario.' },
  { key: 'visita_realizada', label: 'Visita Realizada', desc: 'Se registra la visita y se suben fotos (fachada, portada, entorno, interior).' },
  { key: 'preavaluo',        label: 'Preavalúo',        desc: 'Se construye el preavalúo con comparables, enfoques físico y de mercado.' },
  { key: 'revision',         label: 'Revisión',         desc: 'El controlador audita el expediente antes de autorizar la firma.' },
  { key: 'firma',            label: 'Firma',            desc: 'El valuador firma digitalmente el PDF final. Queda inmutable.' },
  { key: 'aprobado',         label: 'Aprobado',         desc: 'El avalúo se entrega al cliente. Aparece en reportes y en el historial.' },
  { key: 'rechazado',        label: 'Rechazado',        desc: 'El expediente fue rechazado con motivo. No se emite PDF.' },
];

const FAQ = [
  {
    q: '¿Cómo subo documentos a un expediente?',
    a: 'Abre el expediente desde EXPEDIENTES o AVALÚOS, ve a la pestaña de documentos y arrastra los archivos (PDF o JPG). Se suben directo a Storage, por lo que no hay límite de 4.5 MB. Cada documento se categoriza: documento general, fachada, portada, entorno, interior o uso de suelo.',
  },
  {
    q: '¿Qué hace la IA cuando analizo documentos?',
    a: 'Al subir CURT, escrituras, predial, INE o boletas, la IA extrae hasta 38 campos y auto-llena 28 campos SHF del formato (folios, catastrales, legales, entorno urbano, descripción física, uso de suelo, medidas y colindancias). Los campos con baja confianza se marcan en amarillo para que los revises antes de firmar.',
  },
  {
    q: '¿Cómo agrego mi firma al PDF?',
    a: 'Sube tu firma una sola vez desde /dashboard/firma (se guarda en tu perfil). Cuando un expediente llegue al estado firma, el sistema usa tu firma guardada para sellar el PDF. La acción es irreversible.',
  },
  {
    q: '¿Qué pasa si la IA bloquea mi expediente?',
    a: 'Si la IA detecta inconsistencias graves (por ejemplo, direcciones que no coinciden entre documentos) marca el expediente como "requiere atención" y deja notas en el panel. Revisa las notas, corrige los documentos y vuelve a ejecutar el análisis desde la pestaña de IA.',
  },
  {
    q: '¿Cómo exporto la tabla SHF a Excel?',
    a: 'Desde /dashboard/admin/tabla (solo admin). El botón EXPORTAR genera un XLSX con todas las columnas del formato SHF del universo de avalúos visible, respetando los filtros aplicados.',
  },
  {
    q: '¿Cómo agrego comparables a un preavalúo?',
    a: 'En el expediente, ve a la pestaña Preavalúo, sección Comparables. Puedes capturarlos manualmente o importarlos desde INMUEBLES. Necesitas al menos 3 comparables válidos para poder firmar.',
  },
  {
    q: '¿Por qué un avalúo no aparece en Reportes?',
    a: 'REPORTES sólo muestra avalúos en estado aprobado. Los que siguen en captura, revisión o firma se ven en EXPEDIENTES. Los rechazados se ven en HISTORIAL (solo para controlador y admin).',
  },
  {
    q: '¿Qué documentos necesito para un avalúo tipo 2.0 (crédito bancario)?',
    a: 'Depende del banco: cada uno tiene su checklist dinámico configurado en el catálogo. Como mínimo aplica INE del propietario, escrituras, boleta predial del año en curso, recibo de agua, CURT/constancia de uso de suelo y planos (si aplican). El expediente te marca en rojo los documentos obligatorios faltantes.',
  },
];

const ATAJOS = [
  { tecla: 'N',       accion: 'Crear nuevo avalúo (desde cualquier pantalla del valuador)' },
  { tecla: '/',       accion: 'Buscar expediente por folio' },
  { tecla: 'Esc',     accion: 'Cerrar modal abierto' },
  { tecla: 'Ctrl+S',  accion: 'Guardar cambios en el expediente (cuando aplica)' },
  { tecla: 'Ctrl+K',  accion: 'Abrir paleta de comandos rápida (próximamente)' },
];

export default async function AyudaPage() {
  await requireRole(['administrador', 'evaluador', 'controlador']);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Encabezado */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">
            Centro de ayuda ARQOS
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            ¿En qué podemos ayudarte?
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Guías rápidas, FAQ y contactos de soporte. Si no encuentras lo que buscas, escríbenos y
            te acompañamos con tu caso puntual.
          </p>
        </div>

        {/* Guías por rol */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
            Guía rápida por rol
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {GUIAS_ROL.map((g) => (
              <div
                key={g.rol}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
              >
                <h3 className="text-sm font-black text-slate-900 mb-1">{g.rol}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{g.descripcion}</p>
                <ol className="space-y-1.5">
                  {g.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-2 text-[11px] text-slate-700 leading-snug">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      {paso}
                    </li>
                  ))}
                </ol>
                <Link
                  href={g.href}
                  className="inline-block mt-4 text-[10px] font-black text-slate-900 underline decoration-slate-300 hover:decoration-slate-900"
                >
                  Ir al panel →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Flujo de un avalúo */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
            Flujo de un avalúo (9 estados)
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <ol className="divide-y divide-slate-100">
              {ESTADOS_FLUJO.map((e, i) => (
                <li key={e.key} className="flex gap-4 px-5 py-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-xs font-black text-slate-700 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      {e.label}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">{e.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
            Preguntas frecuentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((f, i) => (
              <details
                key={i}
                className="group bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between px-5 py-4 gap-4">
                  <span className="text-sm font-bold text-slate-900">{f.q}</span>
                  <span className="shrink-0 text-slate-400 text-xl leading-none transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 -mt-1">
                  <p className="text-[12px] text-slate-600 leading-relaxed">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Atajos */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
            Atajos de teclado
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {ATAJOS.map((a) => (
                <li key={a.tecla} className="flex items-center gap-4 px-5 py-3">
                  <kbd className="shrink-0 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-black text-slate-700 tracking-wider">
                    {a.tecla}
                  </kbd>
                  <span className="text-xs text-slate-700">{a.accion}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] text-slate-400 italic mt-2">
            * Algunos atajos están en construcción. Avisaremos por NOTICIAS cuando se activen.
          </p>
        </section>

        {/* Soporte */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">
            Soporte
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                Correo
              </p>
              <p className="text-sm font-black text-slate-900 mt-1">soporte@arqosuv.com</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Respuesta en menos de 24 horas hábiles.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                WhatsApp
              </p>
              <p className="text-sm font-black text-slate-900 mt-1">+52 442 000 0000</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Lunes a viernes de 9:00 a 18:00 (hora CDMX).
              </p>
            </div>
          </div>
        </section>

        <div className="text-center pt-6">
          <Link
            href="/dashboard"
            className="text-[10px] font-black text-slate-500 hover:text-slate-900 tracking-widest uppercase"
          >
            ← Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
