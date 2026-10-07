import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Banner, ConnectionPill, type IconName } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { initials, isToday } from '@/lib/format';
import { colors, radius, shadow } from '@/theme';

/** Tela 03 — Home. */
export default function Inicio() {
  const { sessao } = useAuth();
  const { produtores, formularios, fila, online } = useData();

  const pendentes = fila.length;
  const produtoresHoje = produtores.filter((p) => isToday(p.criadoEm)).length;
  const formulariosHoje = formularios.filter((f) => isToday(f.criadoEm)).length;
  const comErro = [...produtores, ...formularios].filter((r) => r.status === 'erro').length;

  return (
    <LinearGradient colors={[colors.navy, colors.navy2]} style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.brand}>
              <Image source={require('../../../assets/brand/simbolo.png')} style={styles.brandIcon} resizeMode="contain" />
              <Text style={styles.brandText}>
                Lico<Text style={{ color: colors.cyan }}>S</Text>
              </Text>
            </View>
            <ConnectionPill online={online} />
          </View>

          <Pressable style={styles.user} onPress={() => router.push('/perfil')} accessibilityRole="button">
            <Avatar text={initials(sessao?.nome ?? '')} size={52} />
            <View>
              <Text style={styles.hello}>Olá, {sessao?.nome}</Text>
              <Text style={styles.role}>{sessao?.perfil}</Text>
            </View>
          </Pressable>

          {sessao?.demo ? (
            <Banner
              tone="info"
              icon="flask-outline"
              text="Modo demonstração: os dados ficam só neste aparelho até a URL do Google Apps Script ser configurada."
            />
          ) : null}
          {!online ? (
            <Banner
              tone="warning"
              icon="cloud-offline-outline"
              text="Você está sem internet. Pode continuar trabalhando: tudo fica salvo no aparelho e será enviado quando a conexão voltar."
            />
          ) : null}

          <View style={styles.grid}>
            <Atalho
              icon="people"
              iconBg="#DCFCE7"
              iconColor={colors.success}
              title="Produtores"
              text="Consultar e cadastrar"
              href="/produtores"
            />
            <Atalho
              icon="document-text"
              iconBg={colors.blueSoft}
              iconColor={colors.blue}
              title="Formulários"
              text="Realizar coleta"
              href="/formularios"
            />
            <Atalho
              icon="sync"
              iconBg={colors.infoBg}
              iconColor={colors.info}
              title="Sincronização"
              text={
                comErro > 0
                  ? `${comErro} com erro`
                  : pendentes > 0
                    ? `${pendentes} registro${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''}`
                    : 'Tudo sincronizado'
              }
              textColor={comErro > 0 ? colors.danger : pendentes > 0 ? colors.warning : colors.success}
              badge={pendentes}
              href="/sincronizar"
            />
            <Atalho
              icon="person"
              iconBg={colors.cyanSoft}
              iconColor="#0E7490"
              title="Meus Dados"
              text="Perfil e configurações"
              href="/perfil"
            />
          </View>

          <Text style={styles.sectionTitle}>Resumo de hoje</Text>
          <View style={styles.grid}>
            <Resumo icon="people-outline" cor={colors.success} bg="#DCFCE7" valor={produtoresHoje} label="Produtores" total={produtores.length} />
            <Resumo icon="clipboard-outline" cor={colors.blue} bg={colors.blueSoft} valor={formulariosHoje} label="Formulários" total={formularios.length} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Atalho(props: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  text: string;
  textColor?: string;
  badge?: number;
  href: Href;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.title}. ${props.text}`}
      onPress={() => router.push(props.href)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: props.iconBg }]}>
          <Ionicons name={props.icon} size={24} color={props.iconColor} />
        </View>
        {props.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{props.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardTitle}>{props.title}</Text>
      <Text style={[styles.cardText, props.textColor ? { color: props.textColor, fontWeight: '600' } : null]}>
        {props.text}
      </Text>
    </Pressable>
  );
}

function Resumo({ icon, cor, bg, valor, label, total }: { icon: IconName; cor: string; bg: string; valor: number; label: string; total: number }) {
  return (
    <View style={[styles.card, styles.resumo]}>
      <View style={[styles.cardIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={cor} />
      </View>
      <View>
        <Text style={styles.resumoNum}>{valor}</Text>
        <Text style={styles.cardText}>{label}</Text>
        <Text style={styles.resumoTotal}>{total} no total</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 38, height: 32 },
  brandText: { color: colors.white, fontSize: 24, fontWeight: '800' },
  user: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  hello: { color: colors.white, fontSize: 19, fontWeight: '700' },
  role: { color: colors.onDarkMuted, fontSize: 14, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    minHeight: 128,
    ...shadow,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 14 },
  cardText: { fontSize: 13, color: colors.muted, marginTop: 4 },
  badge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 0 },
  resumoNum: { fontSize: 24, fontWeight: '800', color: colors.text },
  resumoTotal: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
