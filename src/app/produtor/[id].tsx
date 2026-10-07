import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormularioItem } from '@/components/items';
import { Avatar, Banner, Button, Card, EmptyState, Screen, StatusBadge, type IconName } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { formatDateTime, initials, maskCEP, maskCPF, maskPhone } from '@/lib/format';
import { colors } from '@/theme';

/** Tela 05 — Detalhe do produtor. */
export default function DetalheProdutor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { produtores, formularios } = useData();
  const [aba, setAba] = useState<'dados' | 'formularios'>('dados');

  const p = produtores.find((x) => x.id === id);
  if (!p) {
    return (
      <Screen title="Produtor" back>
        <EmptyState icon="alert-circle-outline" title="Produtor não encontrado" />
      </Screen>
    );
  }

  const doProdutor = formularios.filter((f) => f.produtorId === p.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (
    <Screen
      title=""
      back
      hero={
        <>
          <Avatar text={initials(p.nome)} size={72} />
          <Text style={styles.heroNome}>{p.nome}</Text>
          <Text style={styles.heroProp}>{p.propriedade}</Text>
          <View style={{ marginTop: 8 }}>
            <StatusBadge status={p.status} />
          </View>
        </>
      }
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar produtor"
          hitSlop={12}
          onPress={() => router.push({ pathname: '/produtor/novo', params: { id: p.id } })}
          style={styles.edit}
        >
          <Ionicons name="create-outline" size={24} color={colors.white} />
        </Pressable>
      }
      footer={
        <Button
          title="Novo Formulário"
          icon="add-circle-outline"
          onPress={() => router.push({ pathname: '/formulario/novo', params: { produtorId: p.id } })}
          style={{ flex: 1 }}
        />
      }
    >
      {p.status === 'erro' && p.erro ? <Banner tone="danger" icon="alert-circle" text={p.erro} /> : null}

      <View style={styles.abas}>
        {(
          [
            ['dados', 'Dados'],
            ['formularios', `Formulários (${doProdutor.length})`],
          ] as const
        ).map(([valor, rotulo]) => (
          <Pressable
            key={valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: aba === valor }}
            onPress={() => setAba(valor)}
            style={[styles.aba, aba === valor && styles.abaAtiva]}
          >
            <Text style={[styles.abaTexto, aba === valor && styles.abaTextoAtivo]}>{rotulo}</Text>
          </Pressable>
        ))}
      </View>

      {aba === 'dados' ? (
        <View style={{ gap: 12 }}>
          <Secao icon="person-outline" titulo="Informações Pessoais">
            <Info label="CPF" valor={maskCPF(p.cpf)} />
            <Info label="Telefone" valor={p.telefone ? maskPhone(p.telefone) : ''} />
            <Info label="Nascimento" valor={p.nascimento} />
            <Info label="E-mail" valor={p.email} />
          </Secao>
          <Secao icon="location-outline" titulo="Endereço">
            <Info label="Endereço" valor={p.endereco} />
            <Info label="Complemento" valor={p.complemento} />
            <Info label="Município" valor={[p.municipio, p.uf].filter(Boolean).join(' – ')} />
            <Info label="CEP" valor={p.cep ? maskCEP(p.cep) : ''} />
            <Info
              label="Coordenadas"
              valor={p.latitude !== null && p.longitude !== null ? `${p.latitude}, ${p.longitude}` : ''}
            />
          </Secao>
          <Secao icon="leaf-outline" titulo="Propriedade">
            <Info label="Nome" valor={p.propriedade} />
            <Info label="Área" valor={p.area ? `${p.area} hectares` : ''} />
            <Info label="Atividade" valor={p.atividade} />
            <Info label="Observações" valor={p.observacoes} />
          </Secao>
          <Text style={styles.meta}>
            ID {p.id} · cadastrado por {p.usuario || '—'} em {formatDateTime(p.criadoEm)}
          </Text>
        </View>
      ) : doProdutor.length ? (
        <View style={{ gap: 10 }}>
          {doProdutor.map((f) => (
            <FormularioItem
              key={f.id}
              formulario={f}
              subtitulo={p.propriedade}
              onPress={() => router.push(`/formulario/${f.id}`)}
            />
          ))}
        </View>
      ) : (
        <EmptyState icon="clipboard-outline" title="Nenhum formulário" text='Toque em "Novo Formulário" para iniciar uma coleta.' />
      )}
    </Screen>
  );
}

function Secao({ icon, titulo, children }: { icon: IconName; titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <View style={styles.secaoHead}>
        <Ionicons name={icon} size={18} color={colors.blue} />
        <Text style={styles.secaoTitulo}>{titulo}</Text>
      </View>
      {children}
    </Card>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValor, !valor && { color: colors.muted }]}>{valor || 'Não informado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  edit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heroNome: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  heroProp: { color: colors.onDarkMuted, fontSize: 14, marginTop: 2, textAlign: 'center' },
  abas: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 },
  aba: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  abaAtiva: { borderBottomColor: colors.blue },
  abaTexto: { fontSize: 15, fontWeight: '600', color: colors.muted },
  abaTextoAtivo: { color: colors.blue, fontWeight: '800' },
  secaoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  secaoTitulo: { fontSize: 15, fontWeight: '800', color: colors.text },
  info: { flexDirection: 'row', paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border, gap: 12 },
  infoLabel: { width: 110, fontSize: 14, color: colors.muted },
  infoValor: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  meta: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
