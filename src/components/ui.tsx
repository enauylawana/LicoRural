import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow } from '@/theme';
import type { SyncStatus } from '@/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---- Estrutura de tela ------------------------------------------------------

interface ScreenProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** false quando o conteúdo já rola sozinho (FlatList). */
  scroll?: boolean;
  /** Conteúdo extra no fundo navy, abaixo do título (ex.: avatar no detalhe do produtor). */
  hero?: ReactNode;
}

/** Fundo navy com cabeçalho e uma "folha" branca de conteúdo, como nas referências visuais. */
export function Screen({ title, subtitle, back, right, children, footer, scroll = true, hero }: ScreenProps) {
  // No Android (edge-to-edge) o conteúdo vai até a borda: reserva o espaço da barra do sistema.
  const { bottom } = useSafeAreaInsets();
  return (
    <LinearGradient colors={[colors.navy, colors.navy2]} style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.header}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={12}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))}
              style={styles.headerBtn}
            >
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </Pressable>
          ) : null}
          <View style={[styles.flex, back && right ? styles.headerCenter : null]}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ?? (back ? <View style={styles.headerBtn} /> : null)}
        </View>
        {hero ? <View style={styles.hero}>{hero}</View> : null}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.sheetContent, !footer && { paddingBottom: 40 + bottom }]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.flex}>{children}</View>
          )}
          {footer ? <View style={[styles.footer, { paddingBottom: 16 + bottom }]}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---- Botões -----------------------------------------------------------------

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', icon, iconRight, loading, disabled, style }: ButtonProps) {
  const v = buttonVariants[variant];
  const inativo = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!loading }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.85 },
        inativo && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={v.fg} /> : null}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
          {iconRight ? <Ionicons name={iconRight} size={20} color={v.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.blue, fg: colors.white, border: colors.blue },
  secondary: { bg: colors.blueSoft, fg: colors.blueDark, border: colors.blueSoft },
  outline: { bg: colors.white, fg: colors.textSoft, border: colors.border },
  danger: { bg: colors.white, fg: colors.danger, border: '#FCA5A5' },
};

export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name="add" size={30} color={colors.white} />
    </Pressable>
  );
}

// ---- Campos -----------------------------------------------------------------

interface FieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  right?: ReactNode;
  icon?: IconName;
}

/** Campo com rótulo permanente (o rótulo não some ao digitar). */
export function Field({ label, required, error, hint, right, icon, style, multiline, ...props }: FieldProps) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View style={styles.row}>
        <View
          style={[
            styles.inputBox,
            multiline && { minHeight: 96, alignItems: 'flex-start', paddingVertical: 10 },
            foco && { borderColor: colors.blue },
            !!error && { borderColor: colors.danger },
          ]}
        >
          {icon ? <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 8 }} /> : null}
          <TextInput
            accessibilityLabel={label}
            placeholderTextColor="#94A3B8"
            style={[styles.input, multiline && { textAlignVertical: 'top' }, style]}
            multiline={multiline}
            onFocus={(e) => {
              setFoco(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFoco(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
        </View>
        {right}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  loading,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.8 }]}
    >
      {loading ? <ActivityIndicator color={colors.blue} /> : <Ionicons name={icon} size={22} color={colors.blue} />}
    </Pressable>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function Select({ label, value, options, onChange, placeholder = 'Selecione', required, error }: SelectProps) {
  const [aberto, setAberto] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={() => setAberto(true)}
        style={[styles.inputBox, !!error && { borderColor: colors.danger }]}
      >
        <Text style={[styles.input, !value && { color: '#94A3B8' }]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAberto(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(item);
                    setAberto(false);
                  }}
                  style={({ pressed }) => [styles.modalItem, pressed && { backgroundColor: colors.bg }]}
                >
                  <Text style={[styles.modalItemText, item === value && { color: colors.blue, fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {item === value ? <Ionicons name="checkmark" size={20} color={colors.blue} /> : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const ativo = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, ativo && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, ativo && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
      hitSlop={8}
    >
      <View style={[styles.checkbox, checked && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
        {checked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

// ---- Indicadores ------------------------------------------------------------

const statusInfo: Record<SyncStatus, { label: string; icon: IconName; fg: string; bg: string }> = {
  pendente: { label: 'Pendente', icon: 'time-outline', fg: colors.warning, bg: colors.warningBg },
  sincronizando: { label: 'Sincronizando', icon: 'sync', fg: colors.info, bg: colors.infoBg },
  sincronizado: { label: 'Enviado', icon: 'checkmark-circle', fg: colors.success, bg: colors.successBg },
  erro: { label: 'Erro', icon: 'alert-circle', fg: colors.danger, bg: colors.dangerBg },
};

/** Status sempre com texto e ícone, nunca apenas cor. */
export function StatusBadge({ status }: { status: SyncStatus }) {
  const s = statusInfo[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]} accessibilityLabel={`Status: ${s.label}`}>
      <Ionicons name={s.icon} size={12} color={s.fg} />
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function ConnectionPill({ online }: { online: boolean }) {
  return (
    <View
      style={[styles.pill, { borderColor: online ? 'rgba(34,211,238,0.4)' : 'rgba(251,191,36,0.5)' }]}
      accessibilityLabel={online ? 'Conectado à internet' : 'Sem conexão'}
    >
      <Ionicons name={online ? 'cloud-done' : 'cloud-offline'} size={14} color={online ? '#4ADE80' : '#FBBF24'} />
      <Text style={[styles.pillText, { color: online ? '#BBF7D0' : '#FDE68A' }]}>{online ? 'Online' : 'Offline'}</Text>
    </View>
  );
}

export function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`Etapa ${step} de ${total}`}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <View key={n} style={styles.stepItem}>
          {n > 1 ? <View style={[styles.stepLine, n <= step && { backgroundColor: colors.blue }]} /> : null}
          <View style={[styles.stepDot, n <= step && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
            {n < step ? (
              <Ionicons name="checkmark" size={14} color={colors.white} />
            ) : (
              <Text style={[styles.stepNum, n <= step && { color: colors.white }]}>{n}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export function Avatar({ text, size = 48 }: { text: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.blue} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function Banner({ tone, icon, text }: { tone: 'info' | 'warning' | 'danger' | 'success'; icon: IconName; text: string }) {
  const map = {
    info: [colors.infoBg, colors.info],
    warning: [colors.warningBg, colors.warning],
    danger: [colors.dangerBg, colors.danger],
    success: [colors.successBg, colors.success],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={[styles.bannerText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  gap: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 8 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '700' },
  headerSubtitle: { color: colors.onDarkMuted, fontSize: 13, marginTop: 2 },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, marginTop: -8 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  sheetContent: { padding: 20, paddingBottom: 40 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.3,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSoft, marginBottom: 6 },
  inputBox: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
    // No navegador, o destaque de foco já vem da borda azul da caixa.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { fontSize: 13, color: colors.danger },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(6,15,36,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: colors.white, borderRadius: radius.lg, maxHeight: '70%', paddingVertical: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, padding: 16, paddingBottom: 8 },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalItemText: { fontSize: 16, color: colors.text },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  segmentText: { fontSize: 15, fontWeight: '600', color: colors.textSoft },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.onDarkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: { color: colors.onDark, fontSize: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: { fontSize: 13, fontWeight: '700' },
  stepper: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepLine: { width: 48, height: 2, backgroundColor: colors.border },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '700', color: colors.muted },
  avatar: { backgroundColor: '#CFE0FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.blueDark, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, ...shadow },
  empty: { alignItems: 'center', padding: 32, gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  banner: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius.md, alignItems: 'flex-start', marginBottom: 16 },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
