import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const { user } = await requireRole(['administrador']);
  const supabase = await createClient();

  // Listar todos los usuarios institucionales
  const { data: usuariosRaw } = await supabase
    .from('perfiles')
    .select('id, nombre, apellidos, email, rol, activo, created_at')
    .order('created_at', { ascending: false });

  const usuarios = (usuariosRaw ?? []).map((u) => ({
    ...u,
    rol: u.rol as 'administrador' | 'controlador' | 'evaluador',
  }));

  // Listar proyectos aprobados
  const { data: proyectosRaw } = await supabase
    .from('avaluos')
    .select(`
      id, folio, estado, calle, colonia, municipio, estado_inmueble,
      valor_estimado, moneda, fecha_aprobacion,
      valuador:valuador_id (nombre, apellidos),
      controlador:controlador_id (nombre, apellidos)
    `)
    .eq('estado', 'aprobado')
    .order('fecha_aprobacion', { ascending: false });

  type RawProyecto = {
    id: string;
    folio: string | null;
    estado: string;
    calle: string;
    colonia: string | null;
    municipio: string;
    estado_inmueble: string;
    valor_estimado: number | null;
    moneda: string;
    fecha_aprobacion: string | null;
    valuador: { nombre: string; apellidos: string | null } | { nombre: string; apellidos: string | null }[] | null;
    controlador: { nombre: string; apellidos: string | null } | { nombre: string; apellidos: string | null }[] | null;
  };

  const proyectos = ((proyectosRaw as RawProyecto[] | null) ?? []).map((p) => ({
    ...p,
    valuador: Array.isArray(p.valuador) ? p.valuador[0] ?? null : p.valuador,
    controlador: Array.isArray(p.controlador) ? p.controlador[0] ?? null : p.controlador,
  }));

  return (
    <AdminDashboardClient
      usuarios={usuarios}
      proyectos={proyectos}
      adminId={user.id}
    />
  );
}
