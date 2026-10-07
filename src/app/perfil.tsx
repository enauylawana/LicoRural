import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { Avatar, Banner, Button, Card, Field, Screen, SectionTitle } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { definirApiUrl, getApiUrl } from '@/lib/api';
import { formatDateTime, initials } from '@/lib/format';
import { colors } from '@/theme';

function confirmar(titulo: string, mensagem: string, acao: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) onOk();
    return;
  }
  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: acao, style: 'destructive', onPress: onOk },
  ]);
}

/** Meus Dados — perfil, configuração do Google Apps Script e saída. */
export default function Perfil() {
  const { sessao, logout } = useAuth();
  const { produtores, formularios, fila, ultimaSync } = useData();
  const [url, setUrl] = useState(getApiUrl());
  const [erroUrl, setErroUrl] = useState<string | undefined>();

  if (!sessao) return null;

  const modo = sessao.demo ? 'Demonstração (sem Google Sheets)' : sessao.token ? 'Conectado ao Google Sheets' : 'Sem token de servidor';

  function sair() {
    const aviso = fila.length
      ? `Há ${fila.length} registro(s) pendente(s). Eles continuam salvos no aparelho e serão enviados no próximo acesso.`
      : 'Você precisará informar usuário e senha novamente.';
    confirmar('Sair do aplicativo?', aviso, 'Sair', async () => {
      await logout();
      router.replace('/login');
    });
  }

  function salvarUrl() {
    const nova = url.trim();
    if (nova && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(nova)) {
      setErroUrl('Use a URL da implantação do App da Web (https://script.google.com/.../exec).');
      return;
    }
    if (nova === getApiUrl()) return;
    confirmar(
      'Alterar servidor?',
      'É preciso entrar novamente para autenticar no novo endereço. Os registros locais serão mantidos.',
      'Salvar e sair',
      async () => {
        await definirApiUrl(nova);
        await logout();
        router.replace('/login');
      },
    );
  }

  return (
    <Screen title="Meus Dados" subtitle="Perfil e configurações" back>
      <Card style={styles.user}>
        <Avatar text={initials(sessao.nome)} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>{sessao.nome}</Text>
          <Text style={styles.perfil}>{sessao.perfil}</Text>
          <Text style={styles.meta}>@{sessao.usuario}</Text>
        </View>
      </Card>

      <Card style={{ marginTop: 12, gap: 10 }}>
        <Linha label="Modo" valor={modo} />
        <Linha label="Login em" valor={formatDateTime(sessao.loginEm)} />
        <Linha label="Produtores no aparelho" valor={String(produtores.length)} />
        <Linha label="Formulários no aparelho" valor={String(formularios.length)} />
        <Linha label="Pendentes de envio" valor={String(fila.length)} />
        <Linha label="Última sincronização" valor={ultimaSync ? formatDateTime(ultimaSync) : 'Nunca'} />
      </Card>

      <SectionTitle style={{ marginTop: 28 }}>Servidor (Google Apps Script)</SectionTitle>
      {!getApiUrl() ? (
        <Banner tone="info" icon="information-circle-outline" text="Sem URL configurada: o app funciona em modo demonstração, sem sincronizar." />
      ) : null}
      <Field
        label="URL da implantação"
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setErroUrl(undefined);
        }}
        error={erroUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://script.google.com/macros/s/.../exec"
      />
      <Button title="Salvar endereço" variant="secondary" icon="save-outline" onPress={salvarUrl} disabled={url.trim() === getApiUrl()} />

      <Button title="Sair" variant="danger" icon="log-out-outline" onPress={sair} style={{ marginTop: 32 }} />
      <Text style={styles.versao}>Lico Rural v{Constants.expoConfig?.version ?? '1.0.0'} · Lico Systems</Text>
    </Screen>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nome: { fontSize: 19, fontWeight: '800', color: colors.text },
  perfil: { fontSize: 14, color: colors.textSoft, marginTop: 2 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 14, color: colors.muted },
  valor: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  versao: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 20 },
});
