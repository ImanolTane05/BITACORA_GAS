import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '¡Buenos días';
  if (hour < 19) return '¡Buenas tardes';
  return '¡Buenas noches';
};

export default function InicioTab() {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single();
        if (data) { setNombre(data.nombre); setRol(data.rol); }
      }
    };
    load();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
    ]).start(() => {
      // Pulse loop on icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const rolLabel: Record<string, string> = {
    admin: 'Administrador',
    encargado: 'Encargado',
    usuario: 'Usuario',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>

        {/* Animated icon */}
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <MaterialCommunityIcons name="gas-station" size={72} color="#5b1728" />
        </Animated.View>

        {/* Greeting */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Animated.Text style={[styles.name, { transform: [{ scale: scaleAnim }] }]}>{nombre || '...'}</Animated.Text>
          
          {rol !== '' && (
            <Animated.View style={[styles.rolBadge, { opacity: fadeAnim }]}>
              <Feather name="shield" size={12} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.rolText}>{rolLabel[rol] ?? rol}</Text>
            </Animated.View>
          )}
          
          <Text style={styles.subtitle}>Bienvenido al sistema de Bitácora de Gas</Text>
        </Animated.View>

        {/* Dashboard Strip – Informativo, menos parecido a botones */}
        <Animated.View style={[styles.dashboardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.dashboardTitle}>RESUMEN DE MÓDULOS</Text>
          <View style={styles.infoStrip}>
            <View style={styles.infoStripItem}>
              <View style={styles.circleIcon}><MaterialCommunityIcons name="car-multiple" size={18} color="#5b1728" /></View>
              <Text style={styles.infoStripLabel}>Vehículos</Text>
            </View>
            <View style={styles.infoStripItem}>
              <View style={styles.circleIcon}><MaterialCommunityIcons name="book-open-page-variant" size={18} color="#5b1728" /></View>
              <Text style={styles.infoStripLabel}>Bitácora</Text>
            </View>
            <View style={styles.infoStripItem}>
              <View style={styles.circleIcon}><MaterialCommunityIcons name="chart-bar" size={18} color="#5b1728" /></View>
              <Text style={styles.infoStripLabel}>Reportes</Text>
            </View>
          </View>
          <Text style={styles.dashboardHint}>Gestiona tus actividades desde el menú inferior</Text>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },

  iconWrapper: { marginBottom: 28, width: 120, height: 120, borderRadius: 60, backgroundColor: '#fae6eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#5b1728', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },

  greeting: { fontSize: 22, color: '#555', fontWeight: '500', textAlign: 'center' },
  name: { fontSize: 34, fontWeight: 'bold', color: '#5b1728', textAlign: 'center', marginTop: 4 },
  rolBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5b1728', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  rolText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 16, textAlign: 'center', lineHeight: 20 },

  dashboardContainer: { width: '100%', marginTop: 45, alignItems: 'center' },
  dashboardTitle: { fontSize: 10, fontWeight: 'bold', color: '#aaa', letterSpacing: 1.5, marginBottom: 15 },
  infoStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 20, paddingHorizontal: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, width: '100%' },
  infoStripItem: { flex: 1, alignItems: 'center', gap: 8 },
  circleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fdf0f3', alignItems: 'center', justifyContent: 'center' },
  infoStripLabel: { fontSize: 11, fontWeight: '700', color: '#555', textAlign: 'center' },
  dashboardHint: { fontSize: 11, color: '#bbb', marginTop: 18, fontStyle: 'italic' },
});
