import React, { useEffect, useState } from 'react';
import {
  View, Image, ActivityIndicator, StyleSheet, Text,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { LoginScreen } from '@/src/modulos/autenticacion/pantallas/LoginScreen';

type Estado = 'verificando' | 'sin_sesion';

export default function Index() {
  const [estado, setEstado] = useState<Estado>('verificando');

  useEffect(() => {
    // 1. Verificar sesión persistida al arrancar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Hay sesión guardada → ir directo al home
        router.replace('/(tabs)/inicio');
      } else {
        // Sin sesión → mostrar login
        setEstado('sin_sesion');
      }
    });

    // 2. Escuchar cambios de autenticación en tiempo real
    //    (cuando el usuario cierra sesión → volver al login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setEstado('sin_sesion');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Pantalla de splash mientras verifica ──────────────
  if (estado === 'verificando') {
    return (
      <View style={styles.splash}>
        <View style={styles.logoCard}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator size="large" color="#5b1728" style={{ marginTop: 32 }} />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  // ── Login ──────────────────────────────────────────────
  return <LoginScreen />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoCard: {
    width: 160,
    height: 160,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5b1728',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 130,
    height: 130,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: '#aaa',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
