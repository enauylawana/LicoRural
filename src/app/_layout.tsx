import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { colors } from '@/theme';

// A tela de abertura nativa fica visível até a splash animada (src/app/index.tsx) montar.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Envia para o login qualquer rota interna acessada sem sessão. */
function ProtecaoDeRotas() {
  const { sessao, carregando } = useAuth();
  const segments = useSegments() as string[];

  useEffect(() => {
    const publica = segments.length === 0 || segments[0] === 'login' || segments[0] === 'index';
    if (!carregando && !sessao && !publica) router.replace('/login');
  }, [sessao, carregando, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="light" />
          <ProtecaoDeRotas />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.navy },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          </Stack>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
