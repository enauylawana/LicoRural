import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, EmptyState, Screen, StatusBadge } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { formatDateTime } from '@/lib/format';
import { colors, radius } from '@/theme';

/** Visualização de um formulário já salvo. */
export default function DetalheFormulario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { formularios, produtores } = useData();
  const f = formularios.find((x) => x.id === id);

  if (!f) {
    return (
      <Screen title="Formulário" back>
        <EmptyState icon="alert-circle-outline" title="Formulário não encontrado" />
      </Screen>
    );
  }
  const p = produtores.find((x) => x.id === f.produtorId);
  const fotos = f.anexos.filter((a) => a.tipo === 'foto');
  const docs = f.anexos.filter((a) => a.tipo === 'documento');

  return (
    <Screen
      title={f.modelo}
      subtitle={p ? `${p.nome} – ${p.propriedade}` : undefined}
      back
      footer={
        <Button
          title="Editar"
          icon="create-outline"
          variant="outline"
          onPress={() => router.push({ pathname: '/formulario/novo', params: { id: f.id } })}
          style={{ flex: 1 }}
        />
      }
    >
      <View style={styles.statusRow}>
        <StatusBadge status={f.status} />
        <Text style={styles.meta}>{formatDateTime(f.criadoEm)}</Text>
      </View>
      {f.status === 'erro' && f.erro ? <Banner tone="danger" icon="alert-circle" text={f.erro} /> : null}
      {f.status === 'pendente' ? (
        <Banner tone="warning" icon="time-outline" text="Salvo no aparelho, aguardando envio ao Google Sheets." />
      ) : null}

      {p ? (
        <Pressable onPress={() => router.push(`/produtor/${p.id}`)} accessibilityRole="button">
          <Card style={styles.produtor}>
            <Ionicons name="person-circle-outline" size={28} color={colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={styles.valor}>{p.nome}</Text>
              <Text style={styles.label}>{p.propriedade}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Card>
        </Pressable>
      ) : null}

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.titulo}>1. Atividade Pecuária</Text>
        <Linha label="Possui atividade pecuária?" valor={f.possuiPecuaria === null ? '' : f.possuiPecuaria ? 'Sim' : 'Não'} />
        {f.possuiPecuaria ? (
          <>
            <Linha label="Quantidade de animais" valor={f.quantidadeAnimais} />
            <Linha label="Finalidade" valor={f.finalidade} />
            <Linha label="Área de pastagem" valor={f.areaPastagem ? `${f.areaPastagem} ha` : ''} />
          </>
        ) : null}
        <Linha label="Observações" valor={f.observacoes} />
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.titulo}>Anexos</Text>
        {fotos.length ? (
          <View style={styles.fotos}>
            {fotos.map((a) =>
              a.uri ? (
                <Image key={a.uri} source={{ uri: a.uri }} style={styles.foto} accessibilityLabel={a.nome} />
              ) : (
                <View key={a.nome} style={[styles.foto, styles.fotoRemota]}>
                  <Ionicons name="image-outline" size={24} color={colors.muted} />
                </View>
              ),
            )}
          </View>
        ) : null}
        {docs.map((d) => (
          <View key={d.nome} style={styles.doc}>
            <Ionicons name="document-attach-outline" size={18} color={colors.danger} />
            <Text style={styles.valor}>{d.nome}</Text>
          </View>
        ))}
        {!f.anexos.length ? <Text style={styles.label}>Nenhum anexo.</Text> : null}
      </Card>

      <Text style={[styles.meta, { textAlign: 'center', marginTop: 16 }]}>
        ID {f.id} · coletado por {f.usuario || '—'}
      </Text>
    </Screen>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.valor, !valor && { color: colors.muted }]}>{valor || 'Não informado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  meta: { fontSize: 12, color: colors.muted },
  produtor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { fontSize: 15, fontWeight: '800', color: colors.blueDark, marginBottom: 6 },
  linha: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  label: { fontSize: 13, color: colors.muted },
  valor: { fontSize: 15, color: colors.text, fontWeight: '500' },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  foto: { width: 90, height: 90, borderRadius: radius.sm },
  fotoRemota: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
});
