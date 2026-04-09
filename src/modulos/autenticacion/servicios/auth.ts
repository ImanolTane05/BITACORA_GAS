import { supabase } from '../../../lib/supabase';

export const AuthService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Función temporal auxiliar para crear la cuenta de administrador inicial
  async signUpAdmin(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          rol: 'admin',
        },
      },
    });
    return { data, error };
  },

  async signUpConMetadatos(email: string, password: string, metadatos: object) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadatos,
      },
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  }
};
