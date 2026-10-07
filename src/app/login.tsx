import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, Checkbox, type IconName } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/api';
import { colors, radius } from '@/theme';

/** Tela 02 — Login. */
export default function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const senhaRef = useRef<TextInput>(null);
  const demo = !getApiUrl();

  async function entrar() {
    setErro(null);
    setEntrando(true);
    try {
      await login(usuario, senha, lembrar);
      router.replace('/inicio');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <LinearGradient colors={[colors.navy, colors.navy2]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Image
              source={require('../../assets/brand/logo-completa.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Lico Systems"
            />
            <Text style={styles.title}>Acesse sua conta</Text>
            <Text style={styles.subtitle}>Entre com seu usuário e senha para continuar</Text>

            {demo ? (
              <Banner
                tone="info"
                icon="information-circle"
                text="Modo demonstração (sem Google Sheets configurado). Use usuário joao e senha 1234."
              />
            ) : null}
            {erro ? <Banner tone="danger" icon="alert-circle" text={erro} /> : null}

            <CampoLogin
              icon="person-outline"
              label="Usuário"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              onSubmitEditing={() => senhaRef.current?.focus()}
            />
            <CampoLogin
              ref={senhaRef}
              icon="lock-closed-outline"
              label="Senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={entrar}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onPress={() => setMostrarSenha((v) => !v)}
                  hitSlop={10}
                >
                  <Ionicons name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
                </Pressable>
              }
            />

            <View style={styles.options}>
              <Checkbox checked={lembrar} onChange={setLembrar} label="Lembrar de mim" />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() =>
                  Alert.alert(
                    'Esqueceu a senha?',
                    'Procure o administrador do sistema para redefinir sua senha na planilha de usuários.',
                  )
                }
              >
                <Text style={styles.link}>Esqueceu a senha?</Text>
              </Pressable>
            </View>

            <Button title="Entrar" onPress={entrar} loading={entrando} style={{ marginTop: 8 }} />

            <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

interface CampoLoginProps extends React.ComponentProps<typeof TextInput> {
  icon: IconName;
  label: string;
  right?: React.ReactNode;
  ref?: React.Ref<TextInput>;
}

function CampoLogin({ icon, label, right, ref, ...props }: CampoLoginProps) {
  return (
    <View style={styles.campo}>
      <Ionicons name={icon} size={22} color={colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.campoLabel}>{label}</Text>
        <TextInput ref={ref} accessibilityLabel={label} style={styles.campoInput} placeholderTextColor="#94A3B8" {...props} />
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { width: 200, height: 200, alignSelf: 'center', marginBottom: 16 },
  title: { color: colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.onDarkMuted, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  campoLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  campoInput: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  options: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  link: { color: colors.onDark, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  version: { color: colors.onDarkMuted, fontSize: 12, textAlign: 'center', marginTop: 28 },
});
