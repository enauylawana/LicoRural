import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Field, IconButton, Screen, SectionTitle, Select, Stepper } from '@/components/ui';
import { useData } from '@/context/DataContext';
import {
  isValidCPF,
  isValidDate,
  isValidEmail,
  maskCEP,
  maskCPF,
  maskDate,
  maskDecimal,
  maskPhone,
  onlyDigits,
} from '@/lib/format';
import { colors, radius } from '@/theme';
import type { DadosProdutor } from '@/types';

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

const ATIVIDADES = [
  'Pecuária de Corte',
  'Pecuária de Leite',
  'Agricultura',
  'Agricultura e Pecuária',
  'Piscicultura',
  'Avicultura',
  'Outra',
];

const VAZIO: DadosProdutor = {
  nome: '',
  cpf: '',
  telefone: '',
  nascimento: '',
  email: '',
  cep: '',
  municipio: '',
  uf: 'RO',
  endereco: '',
  complemento: '',
  latitude: null,
  longitude: null,
  propriedade: '',
  area: '',
  atividade: '',
  observacoes: '',
};

type Erros = Partial<Record<keyof DadosProdutor, string>>;

/** Tela 04 — Novo produtor / edição (etapas 1/3, 2/3 e 3/3). */
export default function NovoProdutor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { produtores, salvarProdutor, online } = useData();
  const existente = id ? produtores.find((p) => p.id === id) : undefined;

  const [etapa, setEtapa] = useState(1);
  const [dados, setDados] = useState<DadosProdutor>(() => {
    if (!existente) return VAZIO;
    const { id: _i, usuario: _u, criadoEm: _c, atualizadoEm: _a, status: _s, erro: _e, ...resto } = existente;
    return resto;
  });
  const [erros, setErros] = useState<Erros>({});
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const set = <K extends keyof DadosProdutor>(campo: K, valor: DadosProdutor[K]) => {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }));
  };

  function validar(passo: number): boolean {
    const e: Erros = {};
    if (passo === 1) {
      if (dados.nome.trim().length < 3) e.nome = 'Informe o nome completo.';
      if (!isValidCPF(dados.cpf)) e.cpf = 'CPF inválido.';
      else if (produtores.some((p) => p.id !== existente?.id && onlyDigits(p.cpf) === onlyDigits(dados.cpf))) {
        e.cpf = 'Já existe um produtor cadastrado com este CPF.';
      }
      if (dados.telefone && onlyDigits(dados.telefone).length < 10) e.telefone = 'Telefone incompleto.';
      if (dados.nascimento && !isValidDate(dados.nascimento)) e.nascimento = 'Data inválida (DD/MM/AAAA).';
      if (dados.email && !isValidEmail(dados.email)) e.email = 'E-mail inválido.';
    }
    if (passo === 2) {
      if (dados.cep && onlyDigits(dados.cep).length !== 8) e.cep = 'CEP deve ter 8 dígitos.';
      if (!dados.municipio.trim()) e.municipio = 'Informe o município.';
      if (!dados.uf) e.uf = 'Selecione a UF.';
    }
    if (passo === 3) {
      if (!dados.propriedade.trim()) e.propriedade = 'Informe o nome da propriedade.';
      if (dados.area && isNaN(Number(dados.area.replace(',', '.')))) e.area = 'Área inválida.';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function buscarCep() {
    const cep = onlyDigits(dados.cep);
    if (cep.length !== 8) {
      setErros((e) => ({ ...e, cep: 'CEP deve ter 8 dígitos.' }));
      return;
    }
    if (!online) {
      Alert.alert('Sem internet', 'A busca de CEP precisa de conexão. Preencha o endereço manualmente.');
      return;
    }
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await res.json();
      if (json.erro) {
        setErros((e) => ({ ...e, cep: 'CEP não encontrado.' }));
      } else {
        setDados((d) => ({
          ...d,
          municipio: json.localidade || d.municipio,
          uf: json.uf || d.uf,
          endereco: [json.logradouro, json.bairro].filter(Boolean).join(', ') || d.endereco,
        }));
        setErros((e) => ({ ...e, cep: undefined, municipio: undefined }));
      }
    } catch {
      Alert.alert('Falha na busca', 'Não foi possível consultar o CEP. Preencha o endereço manualmente.');
    } finally {
      setBuscandoCep(false);
    }
  }

  async function usarLocalizacao() {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Autorize o acesso à localização para registrar as coordenadas.');
        return;
      }
      // O GPS funciona sem internet.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDados((d) => ({
        ...d,
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
      }));
    } catch {
      Alert.alert('Localização indisponível', 'Não foi possível obter a localização. Tente em área aberta.');
    } finally {
      setLocalizando(false);
    }
  }

  function proximo() {
    if (validar(etapa)) setEtapa((e) => e + 1);
  }

  async function salvar() {
    if (!validar(3)) return;
    setSalvando(true);
    try {
      const salvo = await salvarProdutor(
        { ...dados, nome: dados.nome.trim(), propriedade: dados.propriedade.trim(), municipio: dados.municipio.trim() },
        existente?.id,
      );
      // Edição volta ao detalhe que já está na pilha; cadastro novo abre o detalhe no lugar do formulário.
      if (existente) router.back();
      else router.replace(`/produtor/${salvo.id}`);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o produtor no aparelho.');
      setSalvando(false);
    }
  }

  const footer = (
    <>
      {etapa > 1 ? (
        <Button title="Voltar" variant="outline" icon="arrow-back" onPress={() => setEtapa((e) => e - 1)} style={{ flex: 1 }} />
      ) : null}
      {etapa < 3 ? (
        <Button title="Próximo" iconRight="arrow-forward" onPress={proximo} style={{ flex: 2 }} />
      ) : (
        <Button title="Salvar" icon="checkmark" onPress={salvar} loading={salvando} style={{ flex: 2 }} />
      )}
    </>
  );

  return (
    <Screen title={existente ? 'Editar Produtor' : 'Novo Produtor'} subtitle={`Etapa ${etapa} de 3`} back footer={footer}>
      <Stepper step={etapa} total={3} />

      {etapa === 1 ? (
        <>
          <SectionTitle>Dados Pessoais</SectionTitle>
          <Field label="Nome completo" required value={dados.nome} onChangeText={(v) => set('nome', v)} error={erros.nome} autoCapitalize="words" placeholder="João da Silva" />
          <Field label="CPF" required value={dados.cpf} onChangeText={(v) => set('cpf', maskCPF(v))} error={erros.cpf} keyboardType="number-pad" placeholder="000.000.000-00" />
          <Field label="Telefone" value={dados.telefone} onChangeText={(v) => set('telefone', maskPhone(v))} error={erros.telefone} keyboardType="phone-pad" placeholder="(69) 9 9999-9999" />
          <Field label="Data de nascimento" value={dados.nascimento} onChangeText={(v) => set('nascimento', maskDate(v))} error={erros.nascimento} keyboardType="number-pad" placeholder="DD/MM/AAAA" />
          <Field label="E-mail (opcional)" value={dados.email} onChangeText={(v) => set('email', v.trim())} error={erros.email} keyboardType="email-address" autoCapitalize="none" placeholder="joao@email.com" />
        </>
      ) : null}

      {etapa === 2 ? (
        <>
          <SectionTitle>Endereço</SectionTitle>
          <Field
            label="CEP"
            value={dados.cep}
            onChangeText={(v) => set('cep', maskCEP(v))}
            error={erros.cep}
            keyboardType="number-pad"
            placeholder="76900-000"
            hint={online ? 'Toque na lupa para preencher o endereço automaticamente.' : undefined}
            right={<IconButton icon="search" label="Buscar CEP" onPress={buscarCep} loading={buscandoCep} />}
          />
          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Field label="Município" required value={dados.municipio} onChangeText={(v) => set('municipio', v)} error={erros.municipio} placeholder="Ji-Paraná" />
            </View>
            <View style={{ flex: 1 }}>
              <Select label="UF" required value={dados.uf} options={UFS} onChange={(v) => set('uf', v)} error={erros.uf} />
            </View>
          </View>
          <Field label="Endereço" value={dados.endereco} onChangeText={(v) => set('endereco', v)} placeholder="Linha 02, Km 11, Lote 28" />
          <Field label="Complemento" value={dados.complemento} onChangeText={(v) => set('complemento', v)} placeholder="Sítio Estância Vida Nova" />

          <View style={styles.mapa}>
            <Ionicons name="location" size={34} color={colors.blue} />
            <Text style={styles.coords}>
              {dados.latitude !== null && dados.longitude !== null
                ? `${dados.latitude}, ${dados.longitude}`
                : 'Localização não registrada'}
            </Text>
            <Button
              title={dados.latitude !== null ? 'Atualizar localização' : 'Usar minha localização'}
              icon="navigate"
              variant="secondary"
              onPress={usarLocalizacao}
              loading={localizando}
            />
          </View>
        </>
      ) : null}

      {etapa === 3 ? (
        <>
          <SectionTitle>Propriedade Rural</SectionTitle>
          <Field label="Nome da propriedade" required value={dados.propriedade} onChangeText={(v) => set('propriedade', v)} error={erros.propriedade} placeholder="Sítio Boa Esperança" />
          <Field label="Área (hectares)" value={dados.area} onChangeText={(v) => set('area', maskDecimal(v))} error={erros.area} keyboardType="decimal-pad" placeholder="80" />
          <Select label="Tipo de atividade" value={dados.atividade} options={ATIVIDADES} onChange={(v) => set('atividade', v)} />
          <Field label="Observações" value={dados.observacoes} onChangeText={(v) => set('observacoes', v)} multiline placeholder="Condições de acesso, pastagem, etc." />
          {!online ? (
            <Banner tone="warning" icon="cloud-offline-outline" text="Sem internet: o produtor será salvo no aparelho como PENDENTE e enviado depois." />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  mapa: {
    backgroundColor: '#E7F3EC',
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#CDE7D6',
  },
  coords: { fontSize: 14, color: colors.textSoft, fontWeight: '600' },
});
