import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, Screen, StatusBadge, type IconName } from '@/components/ui';
import { useData, type ResumoSync } from '@/context/DataContext';
import { formatDateTime } from '@/lib/format';
import { colors, radius } from '@/theme';

/** Tela 07/12 — Sincronização. */
export default function Sincronizar() {
  const { produtores, formularios, fila, ultimaSync, online, sincronizando, ultimoErro, sincronizar } = useData();
  const [resultado, setResultado] = useState<ResumoSync | null>(null);

  const produtoresPendentes = fila.filter((i) => i.tipo === 'produtor').length;
  const formulariosPendentes = fila.filter((i) => i.tipo === 'formulario').length;
  const total = produtores.length + formularios.length;
  const sincronizados = total - fila.length;
  const comErro = [
    ...produtores.filter((p) => p.status === 'erro').map((p) => ({ id: p.id, titulo: p.nome, erro: p.erro, href: `/produtor/${p.id}` as const })),
    ...formularios
      .filter((f) => f.status === 'erro')
      .map((f) => ({ id: f.id, titulo: `${f.modelo} (${f.id})`, erro: f.erro, href: `/formulario/${f.id}` as const })),
  ];

  async function executar() {
    setResultado(null);
    setResultado(await sincronizar());
  }

  return (
    <Screen title="Sincronização" subtitle="Envio de dados para o Google Sheets">
      <Card style={styles.hero}>
        <View style={[styles.cloud, { backgroundColor: fila.length ? colors.blueSoft : colors.successBg }]}>
          <Ionicons
            name={fila.length ? 'cloud-upload' : 'cloud-done'}
            size={44}
            color={fila.length ? colors.blue : colors.success}
          />
        </View>
        <Text style={styles.heroTitle}>
          {fila.length ? `${fila.length} registro${fila.length > 1 ? 's' : ''} pendente${fila.length > 1 ? 's' : ''}` : 'Tudo sincronizado'}
        </Text>
        <Text style={styles.heroText}>
          {fila.length
            ? 'Seus dados foram salvos localmente e serão enviados quando houver conexão com a internet.'
            : 'Todos os registros deste aparelho já estão no Google Sheets.'}
        </Text>
        <View style={styles.progress} accessibilityLabel={`${sincronizados} de ${total} registros sincronizados`}>
          <View style={[styles.progressFill, { width: total ? `${(sincronizados / total) * 100}%` : '100%' }]} />
        </View>
        <Text style={styles.progressText}>
          {sincronizados} de {total} registros sincronizados
        </Text>
      </Card>

      {resultado ? (
        <Banner
          tone={resultado.falhas > 0 || (resultado.enviados === 0 && ultimoErro) ? 'danger' : 'success'}
          icon={resultado.falhas > 0 ? 'alert-circle' : 'checkmark-circle'}
          text={resultado.mensagem}
        />
      ) : ultimoErro ? (
        <Banner tone="danger" icon="alert-circle" text={ultimoErro} />
      ) : null}

      <Card style={{ gap: 4, marginBottom: 16 }}>
        <Linha
          icon={online ? 'wifi' : 'cloud-offline-outline'}
          cor={online ? colors.success : colors.warning}
          titulo="Conexão"
          valor={online ? 'Conectado' : 'Sem internet'}
        />
        <Linha icon="people-outline" cor={colors.blue} titulo="Produtores" valor={pendenteTexto(produtoresPendentes)} destaque={produtoresPendentes > 0} />
        <Linha icon="document-text-outline" cor={colors.warning} titulo="Formulários" valor={pendenteTexto(formulariosPendentes)} destaque={formulariosPendentes > 0} />
        <Linha
          icon="time-outline"
          cor={colors.success}
          titulo="Última sincronização"
          valor={ultimaSync ? formatDateTime(ultimaSync) : 'Nunca'}
        />
      </Card>

      {comErro.length > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.errTitle}>Registros com erro</Text>
          {comErro.map((r) => (
            <Pressable key={r.id} onPress={() => router.push(r.href)} style={styles.errItem} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.errName}>{r.titulo}</Text>
                <Text style={styles.errMsg}>{r.erro}</Text>
              </View>
              <StatusBadge status="erro" />
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Button
        title={sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
        icon="sync"
        onPress={executar}
        loading={sincronizando}
        disabled={!online}
      />
      {!online ? <Text style={styles.hint}>Conecte-se à internet para sincronizar. O envio também acontece automaticamente quando a conexão volta.</Text> : null}
    </Screen>
  );
}

function pendenteTexto(n: number) {
  return n === 0 ? 'Em dia' : `${n} pendente${n > 1 ? 's' : ''}`;
}

function Linha({ icon, cor, titulo, valor, destaque }: { icon: IconName; cor: string; titulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.linha}>
      <View style={[styles.linhaIcon, { backgroundColor: cor + '1A' }]}>
        <Ionicons name={icon} size={20} color={cor} />
      </View>
      <Text style={styles.linhaTitulo}>{titulo}</Text>
      <Text style={[styles.linhaValor, destaque && { color: colors.warning }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 16, paddingVertical: 24 },
  cloud: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  heroText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 16 },
  progress: { width: '100%', height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.blue, borderRadius: 4 },
  progressText: { fontSize: 12, color: colors.muted, marginTop: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  linhaIcon: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  linhaTitulo: { flex: 1, fontSize: 15, color: colors.textSoft },
  linhaValor: { fontSize: 14, fontWeight: '700', color: colors.text },
  errTitle: { fontSize: 15, fontWeight: '800', color: colors.danger, marginBottom: 8 },
  errItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  errName: { fontSize: 14, fontWeight: '700', color: colors.text },
  errMsg: { fontSize: 13, color: colors.muted, marginTop: 2 },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 18 },
});
