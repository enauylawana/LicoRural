import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ProdutorItem } from '@/components/items';
import { EmptyState, Fab, Field, Screen } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { onlyDigits } from '@/lib/format';

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Tela 04 — Lista de produtores. */
export default function Produtores() {
  const { produtores, formularios } = useData();
  const [busca, setBusca] = useState('');

  const contagem = useMemo(() => {
    const m = new Map<string, { total: number; pendentes: number }>();
    for (const f of formularios) {
      const c = m.get(f.produtorId) ?? { total: 0, pendentes: 0 };
      c.total += 1;
      if (f.status !== 'sincronizado') c.pendentes += 1;
      m.set(f.produtorId, c);
    }
    return m;
  }, [formularios]);

  const lista = useMemo(() => {
    const q = normalizar(busca.trim());
    const qDigitos = onlyDigits(busca);
    return produtores
      .filter((p) => {
        if (!q) return true;
        const texto = normalizar(`${p.nome} ${p.propriedade} ${p.municipio}`);
        return texto.includes(q) || (qDigitos.length >= 3 && onlyDigits(p.cpf).includes(qDigitos));
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [produtores, busca]);

  return (
    <Screen title="Produtores" subtitle={`${produtores.length} cadastrado${produtores.length === 1 ? '' : 's'}`} scroll={false}>
      <View style={styles.search}>
        <Field
          label="Buscar produtor"
          icon="search"
          placeholder="Nome, CPF ou propriedade"
          value={busca}
          onChangeText={setBusca}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ProdutorItem
            produtor={item}
            totalFormularios={contagem.get(item.id)?.total ?? 0}
            formulariosPendentes={contagem.get(item.id)?.pendentes ?? 0}
            onPress={() => router.push(`/produtor/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          busca ? (
            <EmptyState icon="search" title="Nenhum produtor encontrado" text="Revise a busca ou cadastre um novo produtor." />
          ) : (
            <EmptyState
              icon="people-outline"
              title="Nenhum produtor cadastrado"
              text="Toque no botão + para cadastrar o primeiro produtor. Funciona mesmo sem internet."
            />
          )
        }
      />
      <Fab label="Novo produtor" onPress={() => router.push('/produtor/novo')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: 20, paddingTop: 20, marginBottom: -4 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
