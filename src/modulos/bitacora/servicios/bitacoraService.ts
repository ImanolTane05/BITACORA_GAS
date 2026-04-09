import { supabase } from '../../../lib/supabase';

export interface Bitacora {
  id: string;
  vehiculo_id: string | null;
  usuario_id: string | null;
  fecha: string;
  km_inicial: number;
  km_final: number | null;
  destinos: string[];
  tiene_suministro: boolean;
  suministro_importe: number | null;
  suministro_litros: number | null;
  suministro_folio: string | null;
  suministro_foto: string | null;
  usuario_adicional: string | null;
  observaciones: string | null;
  estado: 'en_ruta' | 'finalizado';
  created_at?: string;
  // joins
  vehiculos?: { marca: string; modelo: string; placas: string; unidad_responsable: string } | null;
  perfiles?: { nombre: string; apellido_paterno: string } | null;
}

export const BitacoraService = {
  async getBitacoras(desde?: string, hasta?: string) {
    let query = supabase
      .from('bitacoras')
      .select('*, vehiculos(marca, modelo, placas, unidad_responsable), perfiles(nombre, apellido_paterno)')
      .order('fecha', { ascending: false });
    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta);
    return query;
  },

  async getBitacorasPorArea(area: string, desde?: string, hasta?: string) {
    // Step 1: get vehicle IDs belonging to the area
    const { data: vehData } = await supabase
      .from('vehiculos')
      .select('id')
      .eq('unidad_responsable', area);

    const vehiculoIds = (vehData ?? []).map((v: any) => v.id);

    if (vehiculoIds.length === 0) return { data: [], error: null };

    // Step 2: get bitacoras filtered by those vehicle IDs
    let query = supabase
      .from('bitacoras')
      .select('*, vehiculos(marca, modelo, placas, unidad_responsable), perfiles(nombre, apellido_paterno)')
      .in('vehiculo_id', vehiculoIds)
      .order('fecha', { ascending: false });

    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta);
    return query;
  },

  async createBitacora(data: Omit<Bitacora, 'id' | 'created_at' | 'vehiculos' | 'perfiles'>) {
    return supabase.from('bitacoras').insert([data]).select();
  },

  async updateBitacora(id: string, data: Partial<Omit<Bitacora, 'id' | 'created_at' | 'vehiculos' | 'perfiles'>>) {
    return supabase.from('bitacoras').update(data).eq('id', id).select();
  },

  async deleteBitacora(id: string) {
    return supabase.from('bitacoras').delete().eq('id', id);
  },
};
