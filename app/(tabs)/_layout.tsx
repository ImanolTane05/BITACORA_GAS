import { Tabs } from 'expo-router';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function TabLayout() {
  const activeColor = '#5b1728';
  const inactiveColor = '#888';
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    const loadRol = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
        if (data) setRol(data.rol);
      }
    };
    loadRol();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: '#fff',
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          borderRadius: 30,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'INICIO',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'USUARIOS',
          // Solo admin y encargado pueden ver la tab de usuarios
          href: rol === 'usuario' ? null : '/usuarios',
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehiculos"
        options={{
          title: 'VEHÍCULOS',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="car-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bitacora"
        options={{
          title: 'BITÁCORA',
          tabBarIcon: ({ color }) => <FontAwesome5 name="file-invoice" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'REPORTES',
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
