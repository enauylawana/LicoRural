import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

/** Tela 01 — Splash / abertura institucional. */
export default function Splash() {
  const { sessao, carregando } = useAuth();
  const [progresso] = useState(() => new Animated.Value(0));
  const [animacaoConcluida, setAnimacaoConcluida] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.timing(progresso, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setAnimacaoConcluida(true));
  }, [progresso]);

  useEffect(() => {
    if (animacaoConcluida && !carregando) router.replace(sessao ? '/inicio' : '/login');
  }, [animacaoConcluida, carregando, sessao]);

  const largura = progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <LinearGradient colors={[colors.navy, colors.navy2, colors.navy]} style={styles.container}>
      <Image
        source={require('../../assets/brand/logo-completa.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Lico Systems"
      />
      <Text style={styles.slogan}>TECNOLOGIA QUE{'\n'}CONECTA O CAMPO</Text>
      <View style={styles.barra} accessibilityLabel="Carregando">
        <Animated.View style={[styles.barraProgresso, { width: largura }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { width: 260, height: 260 },
  slogan: {
    color: colors.cyan,
    fontSize: 14,
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 28,
    fontWeight: '600',
  },
  barra: {
    width: 180,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 48,
    overflow: 'hidden',
  },
  barraProgresso: { height: '100%', borderRadius: 3, backgroundColor: colors.cyan },
});
