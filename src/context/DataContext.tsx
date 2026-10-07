import NetInfo from '@react-native-community/netinfo';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  ApiError,
  api,
  formularioParaEnvio,
  produtorParaEnvio,
  type FormularioRemoto,
  type ProdutorRemoto,
  type RegistroEnvio,
} from '@/lib/api';
import { gerarId } from '@/lib/format';
import { storage, type BancoLocal } from '@/lib/storage';
import type {
  Anexo,
  DadosFormulario,
  DadosProdutor,
  Formulario,
  ItemFila,
  Produtor,
  SyncStatus,
  TipoRegistro,
} from '@/types';

export interface ResumoSync {
  enviados: number;
  falhas: number;
  mensagem: string;
}

interface DataContextValue extends BancoLocal {
  carregado: boolean;
  online: boolean;
  sincronizando: boolean;
  ultimoErro: string | null;
  salvarProdutor: (dados: DadosProdutor, id?: string) => Promise<Produtor>;
  salvarFormulario: (dados: DadosFormulario, id?: string) => Promise<Formulario>;
  sincronizar: () => Promise<ResumoSync>;
}

const DataContext = createContext<DataContextValue | null>(null);

const BANCO_VAZIO: BancoLocal = { produtores: [], formularios: [], fila: [], ultimaSync: null };

const chave = (tipo: TipoRegistro, id: string) => `${tipo}:${id}`;

function enfileirar(fila: ItemFila[], tipo: TipoRegistro, registroId: string): ItemFila[] {
  if (fila.some((i) => i.tipo === tipo && i.registroId === registroId)) return fila;
  return [...fila, { tipo, registroId, adicionadoEm: new Date().toISOString(), tentativas: 0 }];
}

function texto(v: unknown) {
  return v === null || v === undefined ? '' : String(v);
}

function numeroOuNull(v: unknown) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function produtorRemoto(r: ProdutorRemoto): Produtor {
  return {
    id: texto(r.id),
    nome: texto(r.nome),
    cpf: texto(r.cpf),
    telefone: texto(r.telefone),
    nascimento: texto(r.nascimento),
    email: texto(r.email),
    cep: texto(r.cep),
    municipio: texto(r.municipio),
    uf: texto(r.uf),
    endereco: texto(r.endereco),
    complemento: texto(r.complemento),
    latitude: numeroOuNull(r.latitude),
    longitude: numeroOuNull(r.longitude),
    propriedade: texto(r.propriedade),
    area: texto(r.area),
    atividade: texto(r.atividade),
    observacoes: texto(r.observacoes),
    usuario: texto(r.usuario),
    criadoEm: texto(r.criadoEm),
    atualizadoEm: texto(r.atualizadoEm),
    status: 'sincronizado',
  };
}

function formularioRemoto(r: FormularioRemoto): Formulario {
  const anexos: Anexo[] = texto(r.anexos)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [tipo, ...nome] = s.split(':');
      return { uri: '', nome: nome.join(':').trim(), tipo: tipo.trim() === 'Foto' ? 'foto' : 'documento' };
    });
  const possui = texto(r.possuiPecuaria);
  return {
    id: texto(r.id),
    produtorId: texto(r.produtorId),
    usuario: texto(r.usuario),
    modelo: texto(r.modelo) || 'Levantamento Pecuário',
    possuiPecuaria: possui === 'Sim' || possui === 'true' ? true : possui === 'Não' || possui === 'false' ? false : null,
    quantidadeAnimais: texto(r.quantidadeAnimais),
    finalidade: texto(r.finalidade),
    areaPastagem: texto(r.areaPastagem),
    observacoes: texto(r.observacoes),
    anexos,
    criadoEm: texto(r.criadoEm),
    atualizadoEm: texto(r.atualizadoEm),
    status: 'sincronizado',
  };
}

/**
 * Mescla registros vindos do Sheets com os locais.
 * Registros com alterações ainda não enviadas (pendente/erro) têm prioridade.
 */
function mesclar<T extends { id: string; status: SyncStatus }>(locais: T[], remotos: T[], manter?: (l: T, r: T) => T) {
  const mapa = new Map(locais.map((l) => [l.id, l]));
  for (const r of remotos) {
    const l = mapa.get(r.id);
    if (!l) mapa.set(r.id, r);
    else if (l.status === 'sincronizado') mapa.set(r.id, manter ? manter(l, r) : r);
  }
  return [...mapa.values()];
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth();
  const [db, setDb] = useState<BancoLocal>(BANCO_VAZIO);
  const [carregado, setCarregado] = useState(false);
  const [online, setOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);

  // Refs evitam estado desatualizado dentro de operações assíncronas longas.
  const dbRef = useRef<BancoLocal>(BANCO_VAZIO);
  const onlineRef = useRef(true);
  const sessaoRef = useRef(sessao);
  const syncRef = useRef(false);
  useEffect(() => {
    sessaoRef.current = sessao;
  }, [sessao]);

  /** Aplica uma alteração sobre o estado mais recente e persiste no AsyncStorage. */
  const atualizar = useCallback(async (fn: (atual: BancoLocal) => BancoLocal) => {
    const novo = fn(dbRef.current);
    dbRef.current = novo;
    setDb(novo);
    await storage.salvarBanco(novo);
    return novo;
  }, []);

  useEffect(() => {
    storage.carregarBanco().then((banco) => {
      // Se o app foi fechado no meio de um envio, o registro volta a ser pendente.
      const corrigir = <T extends { status: SyncStatus }>(r: T): T =>
        r.status === 'sincronizando' ? { ...r, status: 'pendente' } : r;
      const corrigido = {
        ...banco,
        produtores: banco.produtores.map(corrigir),
        formularios: banco.formularios.map(corrigir),
      };
      dbRef.current = corrigido;
      setDb(corrigido);
      setCarregado(true);
    });
  }, []);

  const sincronizar = useCallback(async (): Promise<ResumoSync> => {
    const vazio = (mensagem: string): ResumoSync => ({ enviados: 0, falhas: 0, mensagem });
    if (syncRef.current) return vazio('Sincronização já em andamento.');
    const s = sessaoRef.current;
    if (!s) return vazio('Faça login para sincronizar.');

    if (!onlineRef.current) {
      const msg = 'Sem conexão com a internet. Os registros continuam salvos no aparelho.';
      setUltimoErro(msg);
      return vazio(msg);
    }
    if (!s.token) {
      const msg = s.demo
        ? 'Modo demonstração: configure a URL do Google Apps Script em Meus Dados para sincronizar.'
        : 'Entre novamente com internet para habilitar a sincronização.';
      setUltimoErro(msg);
      return vazio(msg);
    }
    const token = s.token;

    syncRef.current = true;
    setSincronizando(true);
    setUltimoErro(null);
    let enviados = 0;
    let falhas = 0;
    let mensagem = 'Nada para enviar. Dados atualizados.';

    try {
      // Produtores primeiro: formulários fazem referência a eles.
      const fila = [...dbRef.current.fila].sort((a, b) =>
        a.tipo === b.tipo ? 0 : a.tipo === 'produtor' ? -1 : 1,
      );

      if (fila.length > 0) {
        const registros: RegistroEnvio[] = [];
        const versaoEnviada = new Map<string, string>();
        for (const item of fila) {
          if (item.tipo === 'produtor') {
            const p = dbRef.current.produtores.find((x) => x.id === item.registroId);
            if (p) {
              registros.push({ tipo: 'produtor', dados: produtorParaEnvio(p) });
              versaoEnviada.set(chave('produtor', p.id), p.atualizadoEm);
            }
          } else {
            const f = dbRef.current.formularios.find((x) => x.id === item.registroId);
            if (f) {
              registros.push({ tipo: 'formulario', dados: formularioParaEnvio(f) });
              versaoEnviada.set(chave('formulario', f.id), f.atualizadoEm);
            }
          }
        }

        const marcar = <T extends { id: string; status: SyncStatus; erro?: string }>(
          tipo: TipoRegistro,
          lista: T[],
          fn: (r: T) => T,
        ) => lista.map((r) => (versaoEnviada.has(chave(tipo, r.id)) ? fn(r) : r));

        await atualizar((db) => ({
          ...db,
          produtores: marcar('produtor', db.produtores, (r) => ({ ...r, status: 'sincronizando' })),
          formularios: marcar('formulario', db.formularios, (r) => ({ ...r, status: 'sincronizando' })),
        }));

        try {
          const { resultados } = await api.sincronizar(token, registros);
          const porChave = new Map(resultados.map((r) => [chave(r.tipo, r.id), r]));

          // Só confirma se o registro não foi editado durante o envio.
          const confirmar = <T extends { id: string; status: SyncStatus; erro?: string; atualizadoEm: string }>(
            tipo: TipoRegistro,
            r: T,
          ): T => {
            const k = chave(tipo, r.id);
            if (!versaoEnviada.has(k) || r.status !== 'sincronizando') return r;
            const res = porChave.get(k);
            if (res?.ok && versaoEnviada.get(k) === r.atualizadoEm) return { ...r, status: 'sincronizado', erro: undefined };
            return { ...r, status: 'erro', erro: res?.erro ?? 'Sem confirmação do servidor.' };
          };

          const confirmados = new Set(resultados.filter((r) => r.ok).map((r) => chave(r.tipo, r.id)));
          await atualizar((db) => {
            const produtores = db.produtores.map((r) => confirmar('produtor', r));
            const formularios = db.formularios.map((r) => confirmar('formulario', r));
            const sincronizado = new Set([
              ...produtores.filter((p) => p.status === 'sincronizado').map((p) => chave('produtor', p.id)),
              ...formularios.filter((f) => f.status === 'sincronizado').map((f) => chave('formulario', f.id)),
            ]);
            return {
              produtores,
              formularios,
              fila: db.fila
                .filter((i) => !(confirmados.has(chave(i.tipo, i.registroId)) && sincronizado.has(chave(i.tipo, i.registroId))))
                .map((i) => (versaoEnviada.has(chave(i.tipo, i.registroId)) ? { ...i, tentativas: i.tentativas + 1 } : i)),
              ultimaSync: new Date().toISOString(),
            };
          });
          enviados = confirmados.size;
          falhas = registros.length - enviados;
          mensagem =
            falhas === 0
              ? `${enviados} registro(s) enviados ao Google Sheets.`
              : `${enviados} enviado(s), ${falhas} com erro. Eles continuam salvos no aparelho.`;
          if (falhas > 0) setUltimoErro(mensagem);
        } catch (e) {
          const msg =
            e instanceof ApiError && e.code === 'nao_autorizado'
              ? 'Sessão não reconhecida pelo servidor. Saia e entre novamente com internet.'
              : e instanceof Error
                ? e.message
                : 'Falha ao sincronizar.';
          await atualizar((db) => ({
            ...db,
            produtores: marcar('produtor', db.produtores, (r) =>
              r.status === 'sincronizando' ? { ...r, status: 'erro', erro: msg } : r,
            ),
            formularios: marcar('formulario', db.formularios, (r) =>
              r.status === 'sincronizando' ? { ...r, status: 'erro', erro: msg } : r,
            ),
            fila: db.fila.map((i) =>
              versaoEnviada.has(chave(i.tipo, i.registroId)) ? { ...i, tentativas: i.tentativas + 1 } : i,
            ),
          }));
          setUltimoErro(msg);
          return { enviados: 0, falhas: registros.length, mensagem: msg };
        }
      }

      // Depois do envio, baixa o que existe no Sheets (ex.: cadastros de outros técnicos).
      try {
        const [{ produtores }, { formularios }] = await Promise.all([
          api.listarProdutores(token),
          api.listarFormularios(token),
        ]);
        await atualizar((db) => ({
          ...db,
          produtores: mesclar(db.produtores, produtores.map(produtorRemoto)),
          formularios: mesclar(db.formularios, formularios.map(formularioRemoto), (l, r) => ({
            ...r,
            // Mantém as fotos locais (a planilha guarda só os nomes dos arquivos).
            anexos: l.anexos.some((a) => a.uri) ? l.anexos : r.anexos,
          })),
          ultimaSync: new Date().toISOString(),
        }));
      } catch (e) {
        if (fila.length === 0) {
          mensagem = e instanceof Error ? e.message : 'Falha ao consultar o Google Sheets.';
          setUltimoErro(mensagem);
        }
      }
      return { enviados, falhas, mensagem };
    } finally {
      syncRef.current = false;
      setSincronizando(false);
    }
  }, [atualizar]);

  // Monitora a conexão e sincroniza automaticamente quando a internet volta.
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const agora = state.isConnected === true && state.isInternetReachable !== false;
      const voltou = agora && !onlineRef.current;
      onlineRef.current = agora;
      setOnline(agora);
      if (voltou && dbRef.current.fila.length > 0) void sincronizar();
    });
  }, [sincronizar]);

  // Ao abrir o app (ou entrar), envia pendências e atualiza a base local.
  useEffect(() => {
    if (carregado && sessao?.token && onlineRef.current) void sincronizar();
  }, [carregado, sessao?.token, sincronizar]);

  const salvarProdutor = useCallback(
    async (dados: DadosProdutor, id?: string) => {
      const agora = new Date().toISOString();
      const existente = id ? dbRef.current.produtores.find((p) => p.id === id) : undefined;
      const produtor: Produtor = {
        ...dados,
        id: existente?.id ?? gerarId('P'),
        usuario: existente?.usuario ?? sessaoRef.current?.usuario ?? '',
        criadoEm: existente?.criadoEm ?? agora,
        atualizadoEm: agora,
        status: 'pendente',
      };
      await atualizar((db) => ({
        ...db,
        produtores: existente
          ? db.produtores.map((p) => (p.id === produtor.id ? produtor : p))
          : [...db.produtores, produtor],
        fila: enfileirar(db.fila, 'produtor', produtor.id),
      }));
      if (onlineRef.current) void sincronizar();
      return produtor;
    },
    [atualizar, sincronizar],
  );

  const salvarFormulario = useCallback(
    async (dados: DadosFormulario, id?: string) => {
      const agora = new Date().toISOString();
      const existente = id ? dbRef.current.formularios.find((f) => f.id === id) : undefined;
      const formulario: Formulario = {
        ...dados,
        id: existente?.id ?? gerarId('F'),
        usuario: existente?.usuario ?? sessaoRef.current?.usuario ?? '',
        criadoEm: existente?.criadoEm ?? agora,
        atualizadoEm: agora,
        status: 'pendente',
      };
      await atualizar((db) => ({
        ...db,
        formularios: existente
          ? db.formularios.map((f) => (f.id === formulario.id ? formulario : f))
          : [...db.formularios, formulario],
        fila: enfileirar(db.fila, 'formulario', formulario.id),
      }));
      if (onlineRef.current) void sincronizar();
      return formulario;
    },
    [atualizar, sincronizar],
  );

  const value = useMemo(
    () => ({
      ...db,
      carregado,
      online,
      sincronizando,
      ultimoErro,
      salvarProdutor,
      salvarFormulario,
      sincronizar,
    }),
    [db, carregado, online, sincronizando, ultimoErro, salvarProdutor, salvarFormulario, sincronizar],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider');
  return ctx;
}
