import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { FormularioItem } from '@/components/items';
import { EmptyState, Fab, Field, Screen, Segmented } from '@/components/ui';
import { useData } from '@/context/DataContext';

type Filtro = 'todos' | 'pendentes' | 'enviados';

/** Tela 09 — Lista de formulários. */
export default function Formularios() {
  const { formularios, produtores } = useData();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');

  const produtorPorId = useMemo(() => new Map(produtores.map((p) => [p.id, p])), [produtores]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return formularios
      .filter((f) => {
        if (filtro === 'pendentes' && f.status === 'sincronizado') return false;
        if (filtro === 'enviados' && f.status !== 'sincronizado') return false;
        if (!q) return true;
        const p = produtorPorId.get(f.produtorId);
        return `${f.modelo} ${p?.nome ?? ''} ${p?.propriedade ?? ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }, [formularios, filtro, busca, produtorPorId]);

  const pendentes = formularios.filter((f) => f.status !== 'sincronizado').length;

  return (
    <Screen title="Formulários" subtitle="Coletas realizadas em campo" scroll={false}>
      <View style={styles.top}>
        <Field
          label="Buscar formulário"
          icon="search"
          placeholder="Produtor, propriedade ou modelo"
          value={busca}
          onChangeText={setBusca}
        />
        <Segmented<Filtro>
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'pendentes', label: `Pendentes${pendentes ? ` (${pendentes})` : ''}` },
            { value: 'enviados', label: 'Enviados' },
          ]}
        />
      </View>
      <FlatList
        data={lista}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const p = produtorPorId.get(item.produtorId);
          return (
            <FormularioItem
              formulario={item}
              subtitulo={p ? `${p.nome} – ${p.propriedade}` : 'Produtor não encontrado'}
              onPress={() => router.push(`/formulario/${item.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title={filtro === 'todos' ? 'Nenhum formulário ainda' : 'Nada por aqui'}
            text={
              filtro === 'todos'
                ? 'Abra um produtor e toque em "Novo formulário", ou use o botão +.'
                : filtro === 'pendentes'
                  ? 'Todos os formulários já foram enviados ao Google Sheets.'
                  : 'Nenhum formulário foi enviado ainda.'
            }
          />
        }
      />
      <Fab
        label="Novo formulário"
        onPress={() => (produtores.length ? router.push('/formulario/novo') : router.push('/produtor/novo'))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
