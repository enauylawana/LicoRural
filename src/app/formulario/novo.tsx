import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Field, Screen, SectionTitle, Segmented, Select, Stepper } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { guardarAnexo } from '@/lib/anexos';
import { formatBytes, maskDecimal, onlyDigits } from '@/lib/format';
import { colors, radius } from '@/theme';
import type { Anexo, DadosFormulario } from '@/types';

const MODELO = 'Levantamento Pecuário';
const FINALIDADES = ['Corte', 'Leite', 'Misto (corte e leite)', 'Cria', 'Recria', 'Engorda'];

type Erros = Partial<Record<'produtorId' | 'possuiPecuaria' | 'quantidadeAnimais' | 'finalidade' | 'areaPastagem', string>>;

/** Tela 06/10 — Preenchimento do formulário; etapa 2 corresponde à tela 11 (Anexos e Fotos). */
export default function NovoFormulario() {
  const params = useLocalSearchParams<{ produtorId?: string; id?: string }>();
  const { produtores, formularios, salvarFormulario, online } = useData();
  const existente = params.id ? formularios.find((f) => f.id === params.id) : undefined;

  const [etapa, setEtapa] = useState(1);
  const [dados, setDados] = useState<DadosFormulario>(() =>
    existente
      ? {
          produtorId: existente.produtorId,
          modelo: existente.modelo,
          possuiPecuaria: existente.possuiPecuaria,
          quantidadeAnimais: existente.quantidadeAnimais,
          finalidade: existente.finalidade,
          areaPastagem: existente.areaPastagem,
          observacoes: existente.observacoes,
          anexos: existente.anexos,
        }
      : {
          produtorId: params.produtorId ?? '',
          modelo: MODELO,
          possuiPecuaria: null,
          quantidadeAnimais: '',
          finalidade: '',
          areaPastagem: '',
          observacoes: '',
          anexos: [],
        },
  );
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  const produtor = produtores.find((p) => p.id === dados.produtorId);
  const opcoesProdutor = [...produtores]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((p) => ({ id: p.id, label: `${p.nome} — ${p.propriedade}` }));

  const set = <K extends keyof DadosFormulario>(campo: K, valor: DadosFormulario[K]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  function validar() {
    const e: Erros = {};
    if (!dados.produtorId) e.produtorId = 'Selecione o produtor.';
    if (dados.possuiPecuaria === null) e.possuiPecuaria = 'Responda esta pergunta.';
    if (dados.possuiPecuaria) {
      if (!dados.quantidadeAnimais || Number(dados.quantidadeAnimais) <= 0) e.quantidadeAnimais = 'Informe a quantidade de animais.';
      if (!dados.finalidade) e.finalidade = 'Selecione a finalidade.';
      if (dados.areaPastagem && isNaN(Number(dados.areaPastagem.replace(',', '.')))) e.areaPastagem = 'Área inválida.';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function adicionarFotos(origem: 'camera' | 'galeria') {
    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão negada', `Autorize o acesso à ${origem === 'camera' ? 'câmera' : 'galeria'} nas configurações.`);
      return;
    }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const res =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync({ ...opcoes, allowsMultipleSelection: true, selectionLimit: 6 });
    if (res.canceled) return;
    const novos: Anexo[] = await Promise.all(
      res.assets.map(async (a, i) => {
        const nome = a.fileName ?? `foto_${Date.now()}_${i}.jpg`;
        return { uri: await guardarAnexo(a.uri, nome), nome, tipo: 'foto' as const, tamanho: a.fileSize };
      }),
    );
    setDados((d) => ({ ...d, anexos: [...d.anexos, ...novos] }));
  }

  function escolherOrigemFoto() {
    Alert.alert('Adicionar fotos', 'Escolha a origem da imagem', [
      { text: 'Câmera', onPress: () => adicionarFotos('camera') },
      { text: 'Galeria', onPress: () => adicionarFotos('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function adicionarDocumento() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    const anexo: Anexo = { uri: await guardarAnexo(a.uri, a.name), nome: a.name, tipo: 'documento', tamanho: a.size };
    setDados((d) => ({ ...d, anexos: [...d.anexos, anexo] }));
  }

  function remover(anexo: Anexo) {
    setDados((d) => ({ ...d, anexos: d.anexos.filter((a) => a !== anexo) }));
  }

  async function salvar() {
    if (!validar()) {
      setEtapa(1);
      return;
    }
    setSalvando(true);
    try {
      const semPecuaria = dados.possuiPecuaria === false;
      const salvo = await salvarFormulario(
        {
          ...dados,
          quantidadeAnimais: semPecuaria ? '' : dados.quantidadeAnimais,
          finalidade: semPecuaria ? '' : dados.finalidade,
          areaPastagem: semPecuaria ? '' : dados.areaPastagem,
          observacoes: dados.observacoes.trim(),
        },
        existente?.id,
      );
      if (existente) router.back();
      else router.replace(`/formulario/${salvo.id}`);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o formulário no aparelho.');
      setSalvando(false);
    }
  }

  const fotos = dados.anexos.filter((a) => a.tipo === 'foto');
  const documentos = dados.anexos.filter((a) => a.tipo === 'documento');

  const footer =
    etapa === 1 ? (
      <Button title="Próximo" iconRight="arrow-forward" onPress={() => validar() && setEtapa(2)} style={{ flex: 1 }} />
    ) : (
      <>
        <Button title="Voltar" variant="outline" icon="arrow-back" onPress={() => setEtapa(1)} style={{ flex: 1 }} />
        <Button title="Salvar Formulário" icon="checkmark" onPress={salvar} loading={salvando} style={{ flex: 2 }} />
      </>
    );

  return (
    <Screen
      title={etapa === 1 ? dados.modelo : 'Anexos'}
      subtitle={produtor ? `${produtor.nome} – ${produtor.propriedade}` : 'Selecione o produtor'}
      back
      footer={footer}
    >
      <Stepper step={etapa} total={2} />

      {etapa === 1 ? (
        <>
          {!params.produtorId && !existente ? (
            <Select
              label="Produtor"
              required
              value={opcoesProdutor.find((o) => o.id === dados.produtorId)?.label ?? ''}
              options={opcoesProdutor.map((o) => o.label)}
              onChange={(label) => set('produtorId', opcoesProdutor.find((o) => o.label === label)?.id ?? '')}
              error={erros.produtorId}
            />
          ) : null}

          <View style={styles.secao}>
            <Text style={styles.secaoTexto}>1. Atividade Pecuária</Text>
          </View>

          <Text style={styles.pergunta}>
            Possui atividade pecuária? <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <Segmented<'sim' | 'nao'>
            value={dados.possuiPecuaria === null ? null : dados.possuiPecuaria ? 'sim' : 'nao'}
            onChange={(v) => set('possuiPecuaria', v === 'sim')}
            options={[
              { value: 'sim', label: 'Sim' },
              { value: 'nao', label: 'Não' },
            ]}
          />
          {erros.possuiPecuaria ? <Text style={styles.erro}>{erros.possuiPecuaria}</Text> : null}
          <View style={{ height: 16 }} />

          {dados.possuiPecuaria ? (
            <>
              <Field
                label="Quantidade de animais"
                required
                value={dados.quantidadeAnimais}
                onChangeText={(v) => set('quantidadeAnimais', onlyDigits(v).slice(0, 7))}
                error={erros.quantidadeAnimais}
                keyboardType="number-pad"
                placeholder="165"
              />
              <Select
                label="Finalidade"
                required
                value={dados.finalidade}
                options={FINALIDADES}
                onChange={(v) => set('finalidade', v)}
                error={erros.finalidade}
              />
              <Field
                label="Área de pastagem (hectares)"
                value={dados.areaPastagem}
                onChangeText={(v) => set('areaPastagem', maskDecimal(v))}
                error={erros.areaPastagem}
                keyboardType="decimal-pad"
                placeholder="80"
              />
            </>
          ) : null}

          <Field
            label="Observações"
            value={dados.observacoes}
            onChangeText={(v) => set('observacoes', v)}
            multiline
            placeholder="Animais Nelore, boa condição corporal."
          />
        </>
      ) : (
        <>
          <SectionTitle>Fotos da propriedade</SectionTitle>
          {fotos.length ? (
            <View style={styles.fotos}>
              {fotos.map((f) => (
                <View key={f.uri + f.nome} style={styles.foto}>
                  {f.uri ? (
                    <Image source={{ uri: f.uri }} style={StyleSheet.absoluteFill} accessibilityLabel={f.nome} />
                  ) : (
                    <Ionicons name="image-outline" size={28} color={colors.muted} />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${f.nome}`}
                    onPress={() => remover(f)}
                    style={styles.removerFoto}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={16} color={colors.white} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.vazio}>Nenhuma foto adicionada.</Text>
          )}
          <Button title="Adicionar fotos" icon="camera" variant="secondary" onPress={escolherOrigemFoto} />

          <SectionTitle style={{ marginTop: 28 }}>Documentos (opcional)</SectionTitle>
          {documentos.map((d) => (
            <View key={d.uri + d.nome} style={styles.doc}>
              <Ionicons name="document-attach" size={26} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docNome} numberOfLines={1}>
                  {d.nome}
                </Text>
                {d.tamanho ? <Text style={styles.docTam}>{formatBytes(d.tamanho)}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${d.nome}`} onPress={() => remover(d)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
          ))}
          {!documentos.length ? <Text style={styles.vazio}>Nenhum documento anexado.</Text> : null}
          <Button title="Adicionar documento" icon="attach" variant="secondary" onPress={adicionarDocumento} />

          <View style={{ height: 20 }} />
          <Banner
            tone="info"
            icon="information-circle-outline"
            text="As fotos e documentos ficam guardados no aparelho. A planilha recebe a relação de arquivos anexados."
          />
          {!online ? (
            <Banner tone="warning" icon="cloud-offline-outline" text="Sem internet: o formulário será salvo como PENDENTE e enviado quando a conexão voltar." />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  secao: { backgroundColor: colors.blueSoft, borderRadius: radius.sm, padding: 10, marginBottom: 16 },
  secaoTexto: { color: colors.blueDark, fontWeight: '800', fontSize: 15 },
  pergunta: { fontSize: 15, fontWeight: '600', color: colors.textSoft, marginBottom: 8 },
  erro: { color: colors.danger, fontSize: 13, marginTop: 4 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  foto: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removerFoto: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazio: { color: colors.muted, fontSize: 14, marginBottom: 12 },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  docNome: { fontSize: 14, fontWeight: '600', color: colors.text },
  docTam: { fontSize: 12, color: colors.muted },
});
