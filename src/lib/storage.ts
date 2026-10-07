import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Formulario, ItemFila, Produtor, Sessao, Usuario } from '@/types';

// Chaves descritas na seção 14 do documento do projeto.
export const KEYS = {
  sessao: 'sessao_usuario',
  produtores: 'produtores_local',
  formularios: 'formularios_local',
  fila: 'fila_sincronizacao',
  ultimaSync: 'ultima_sincronizacao',
  // Auxiliares
  credencialOffline: 'credencial_offline',
  apiUrl: 'config_api_url',
} as const;

export interface CredencialOffline {
  usuario: Usuario;
  senhaHash: string;
  token: string | null;
}

export interface BancoLocal {
  produtores: Produtor[];
  formularios: Formulario[];
  fila: ItemFila[];
  ultimaSync: string | null;
}

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key: string, value: unknown) {
  if (value === null || value === undefined) await AsyncStorage.removeItem(key);
  else await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getSessao: () => getJSON<Sessao | null>(KEYS.sessao, null),
  setSessao: (s: Sessao | null) => setJSON(KEYS.sessao, s),

  getCredencial: () => getJSON<CredencialOffline | null>(KEYS.credencialOffline, null),
  setCredencial: (c: CredencialOffline | null) => setJSON(KEYS.credencialOffline, c),

  getApiUrl: () => AsyncStorage.getItem(KEYS.apiUrl),
  // String vazia também é salva: significa "usar modo demonstração" mesmo com URL no .env.
  setApiUrl: (url: string) => AsyncStorage.setItem(KEYS.apiUrl, url),

  async carregarBanco(): Promise<BancoLocal> {
    const [produtores, formularios, fila, ultimaSync] = await Promise.all([
      getJSON<Produtor[]>(KEYS.produtores, []),
      getJSON<Formulario[]>(KEYS.formularios, []),
      getJSON<ItemFila[]>(KEYS.fila, []),
      getJSON<string | null>(KEYS.ultimaSync, null),
    ]);
    return { produtores, formularios, fila, ultimaSync };
  },

  async salvarBanco(db: BancoLocal) {
    await AsyncStorage.multiSet([
      [KEYS.produtores, JSON.stringify(db.produtores)],
      [KEYS.formularios, JSON.stringify(db.formularios)],
      [KEYS.fila, JSON.stringify(db.fila)],
      [KEYS.ultimaSync, JSON.stringify(db.ultimaSync)],
    ]);
  },
};
