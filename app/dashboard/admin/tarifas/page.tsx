import { createClient } from '@/util/supabase/server';
import { requireRole } from '@/util/supabase/dal';
import TarifasClient, { type Tarifa } from './TarifasClient';

export default async function TarifasPage() {
  await requireRole(['administrador']);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tarifas')
    .select('*')
    .order('tipo_avaluo_codigo', { ascending: true })
    .order('precio', { ascending: true });

  const tarifas: Tarifa[] = (data ?? []) as Tarifa[];

  return <TarifasClient tarifas={tarifas} errorCarga={error?.message ?? null} />;
}
