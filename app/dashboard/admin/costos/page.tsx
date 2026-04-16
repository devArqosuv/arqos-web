import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import CostosClient, { type Costo } from './CostosClient';

export default async function CostosPage() {
  await requireRole(['administrador']);
  const supabase = await createClient();

  const { data: costosData } = await supabase
    .from('configuracion_costos')
    .select('id, servicio, plan, costo_mensual, moneda, notas, created_at')
    .order('costo_mensual', { ascending: false });

  // Cuenta avalúos aprobados del mes actual para costo promedio por avalúo
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { count: numAvaluosMes } = await supabase
    .from('avaluos')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', inicioMes.toISOString());

  const costos: Costo[] = (costosData ?? []) as Costo[];

  return <CostosClient costos={costos} numAvaluosMes={numAvaluosMes ?? 0} />;
}
