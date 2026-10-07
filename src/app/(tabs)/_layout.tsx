import { Ionicons } from '@expo/vector-icons';
import Tabs from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useData } from '@/context/DataContext';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { fila } = useData();
  // Altura explícita + área da barra do sistema (botões ou gestos) para os rótulos nunca serem cortados.
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blueOnDark,
        tabBarInactiveTintColor: colors.onDarkMuted,
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 64 + bottom,
          paddingTop: 6,
          paddingBottom: bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.navy },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="produtores"
        options={{
          title: 'Produtores',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="formularios"
        options={{
          title: 'Formulários',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sincronizar"
        options={{
          title: 'Sincronizar',
          tabBarBadge: fila.length > 0 ? fila.length : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F97316', color: colors.white },
          tabBarIcon: ({ color }) => <Ionicons name="sync" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
