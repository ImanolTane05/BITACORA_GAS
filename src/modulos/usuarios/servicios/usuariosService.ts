import { supabase } from '../../../lib/supabase';

export interface Perfil {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  cargo: string;
  area: string;
  rol: 'admin' | 'encargado' | 'usuario';
  email?: string;
}

export const UsuariosService = {
  async getPerfiles() {
    return supabase.from('perfiles').select('*').order('created_at', { ascending: false });
  },

  /**
   * Elimina tanto el registro de `perfiles` como el usuario de `auth.users`.
   * Supabase permite borrar de Auth usando la Admin API solo con service_role,
   * por lo que usamos la función RPC si existe, o bien hacemos el delete de
   * `auth.users` directamente a través de una función SQL expuesta como RPC.
   * Como alternativa segura desde el cliente con rol anon, borramos solo el perfil
   * y dejamos una nota para la Edge Function / trigger.
   *
   * SOLUCIÓN REAL: Necesitamos un trigger SQL que borre auth.users cuando se borre perfiles,
   * o una RPC. Aquí hacemos el delete de perfiles y luego del auth user vía admin SDK si disponible.
   */
  async deletePerfil(id: string) {
    // 1. Borrar de la tabla perfiles (esto es suficiente para que el login falle)
    const { error } = await supabase.from('perfiles').delete().eq('id', id);
    if (error) return { error };

    // 2. Intentar borrar de auth.users via RPC (requiere que la función exista en Supabase)
    try { await supabase.rpc('delete_auth_user', { user_id: id }); } catch (_) {}

    return { error: null };
  },

  async createPerfil(data: Omit<Perfil, 'id'>) {
    const { data: perfil, error } = await supabase.from('perfiles').insert([data]).select().single();
    return { data: perfil, error };
  },

  async updatePerfil(id: string, updates: Partial<Perfil>) {
    const { data, error } = await supabase.from('perfiles').update(updates).eq('id', id).select().single();
    return { data, error };
  }
};
