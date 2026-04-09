import { supabase } from '../../../lib/supabase';

export interface Vehiculo {
  id: string;
  unidad_responsable: string;
  marca: string;
  modelo: string;
  placas: string;
  capacidad_tanque: number | null;
  cilindraje: number | null;
  numero_serie: string | null;
  numero_motor: string | null;
  fotografia: string | null;
  created_at?: string;
}

export const VehiculosService = {
  async getVehiculos() {
    return supabase.from('vehiculos').select('*').order('created_at', { ascending: false });
  },

  async getVehiculosPorArea(area: string) {
    return supabase.from('vehiculos').select('*').eq('unidad_responsable', area).order('created_at', { ascending: false });
  },

  async createVehiculo(vehiculo: Omit<Vehiculo, 'id' | 'created_at'>) {
    return supabase.from('vehiculos').insert([vehiculo]).select();
  },

  async updateVehiculo(id: string, vehiculo: Partial<Omit<Vehiculo, 'id' | 'created_at'>>) {
    return supabase.from('vehiculos').update(vehiculo).eq('id', id).select();
  },

  async deleteVehiculo(id: string) {
    return supabase.from('vehiculos').delete().eq('id', id);
  }
};
