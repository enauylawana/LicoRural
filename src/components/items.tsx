import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, StatusBadge } from '@/components/ui';
import { formatDateTime, initials } from '@/lib/format';
import { colors, radius } from '@/theme';
import type { Formulario, Produtor } from '@/types';

export function ProdutorItem({
  produtor,
  totalFormularios,
  formulariosPendentes,
  onPress,
}: {
  produtor: Produtor;
  totalFormularios: number;
  formulariosPendentes: number;
  onPress: () => void;
}) {
  const local = [produtor.municipio, produtor.uf].filter(Boolean).join(' – ');
  // Contador como na referência: laranja com pendências, azul se tudo enviado, cinza sem formulários.
  const contador =
    totalFormularios === 0
      ? { bg: colors.border, fg: colors.muted }
      : formulariosPendentes > 0
        ? { bg: '#F97316', fg: colors.white }
        : { bg: colors.blue, fg: colors.white };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Avatar text={initials(produtor.nome)} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {produtor.nome}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {produtor.propriedade || 'Propriedade não informada'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText} numberOfLines={1}>
            {local}
          </Text>
          <Text style={styles.metaText}>
            {totalFormularios === 0
              ? 'Sem formulários'
              : `${totalFormularios} formulário${totalFormularios > 1 ? 's' : ''}`}
          </Text>
        </View>
        {produtor.status !== 'sincronizado' ? (
          <View style={{ marginTop: 6 }}>
            <StatusBadge status={produtor.status} />
          </View>
        ) : null}
      </View>
      <View
        style={[styles.contador, { backgroundColor: contador.bg }]}
        accessibilityLabel={`${totalFormularios} formulários, ${formulariosPendentes} pendentes`}
      >
        <Text style={[styles.contadorTexto, { color: contador.fg }]}>{totalFormularios}</Text>
      </View>
    </Pressable>
  );
}

export function FormularioItem({
  formulario,
  subtitulo,
  onPress,
}: {
  formulario: Formulario;
  subtitulo: string;
  onPress: () => void;
}) {
  const cor = formulario.status === 'sincronizado' ? colors.success : formulario.status === 'erro' ? colors.danger : colors.warning;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={[styles.formIcon, { backgroundColor: cor + '1A' }]}>
        <Ionicons name="document-text-outline" size={22} color={cor} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {formulario.modelo}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitulo}
        </Text>
        <Text style={styles.metaText}>{formatDateTime(formulario.criadoEm)}</Text>
      </View>
      <StatusBadge status={formulario.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.blueSoft },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSoft, marginTop: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  metaText: { fontSize: 12, color: colors.muted, marginTop: 2 },
  contador: {
    minWidth: 26,
    height: 26,
    borderRadius: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  contadorTexto: { fontSize: 13, fontWeight: '800' },
  formIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
