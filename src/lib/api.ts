import { storage } from '@/lib/storage';
import type { Formulario, Produtor, TipoRegistro, Usuario } from '@/types';

/**
 * Cliente do Google Apps Script. O app nunca acessa a planilha diretamente:
 * todas as operações passam por um único endpoint (doPost) com o campo "action".
 */

const TIMEOUT_MS = 30_000;

let apiUrl = process.env.EXPO_PUBLIC_APPS_SCRIPT_URL?.trim() ?? '';

/** Lê a URL salva na tela "Meus Dados" (sobrepõe a variável de ambiente). */
export async function carregarApiUrl() {
  const salva = await storage.getApiUrl();
  if (salva !== null) apiUrl = salva;
  return apiUrl;
}

export async function definirApiUrl(url: string) {
  apiUrl = url.trim();
  await storage.setApiUrl(apiUrl);
}

export const getApiUrl = () => apiUrl;

export class ApiError extends Error {
  constructor(
    public code: 'sem_url' | 'rede' | 'timeout' | 'resposta_invalida' | 'nao_autorizado' | 'credenciais' | 'erro',
    message: string,
  ) {
    super(message);
  }
}

async function chamar<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!apiUrl) {
    throw new ApiError('sem_url', 'URL do Google Apps Script não configurada. Informe-a em Meus Dados.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let texto: string;
  try {
    // text/plain evita o preflight CORS, que o Apps Script não responde.
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    texto = await res.text();
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError('timeout', 'O Google Apps Script não respondeu a tempo. Tente novamente.');
    }
    throw new ApiError('rede', 'Não foi possível conectar ao Google Apps Script.');
  } finally {
    clearTimeout(timer);
  }

  let json: { ok?: boolean; code?: string; erro?: string } & T;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new ApiError(
      'resposta_invalida',
      'O Google Apps Script respondeu em formato inesperado. Verifique a implantação (acesso: Qualquer pessoa).',
    );
  }
  if (!json.ok) {
    const code = json.code === 'nao_autorizado' || json.code === 'credenciais' ? json.code : 'erro';
    throw new ApiError(code, json.erro || 'Erro desconhecido no Google Apps Script.');
  }
  return json;
}

// ---- Conversão para o formato das abas ------------------------------------

/** Campos enviados ao Sheets (sem estado local como status e URIs de arquivos). */
export function produtorParaEnvio(p: Produtor) {
  const { status, erro, ...dados } = p;
  return dados;
}

export function formularioParaEnvio(f: Formulario) {
  const { status, erro, anexos, ...dados } = f;
  return {
    ...dados,
    // Fotos e documentos ficam no aparelho; a planilha recebe apenas a relação de arquivos.
    anexos: anexos.map((a) => `${a.tipo === 'foto' ? 'Foto' : 'Documento'}: ${a.nome}`).join('; '),
  };
}

// ---- Operações (seção 13 do documento) ------------------------------------

export interface RespostaLogin {
  usuario: Usuario;
  token: string;
}

export interface RegistroEnvio {
  tipo: TipoRegistro;
  dados: ReturnType<typeof produtorParaEnvio> | ReturnType<typeof formularioParaEnvio>;
}

export interface ResultadoSync {
  tipo: TipoRegistro;
  id: string;
  ok: boolean;
  erro?: string;
}

export type ProdutorRemoto = Omit<Produtor, 'status' | 'erro'>;
export type FormularioRemoto = Omit<Formulario, 'status' | 'erro' | 'anexos'> & { anexos: string };

export const api = {
  login: (usuario: string, senhaHash: string) => chamar<RespostaLogin>('login', { usuario, senhaHash }),

  listarProdutores: (token: string) => chamar<{ produtores: ProdutorRemoto[] }>('listarProdutores', { token }),

  listarFormularios: (token: string) =>
    chamar<{ formularios: FormularioRemoto[] }>('listarFormularios', { token }),

  salvarProdutor: (token: string, p: Produtor) =>
    chamar<{ id: string }>('salvarProdutor', { token, dados: produtorParaEnvio(p) }),

  salvarFormulario: (token: string, f: Formulario) =>
    chamar<{ id: string }>('salvarFormulario', { token, dados: formularioParaEnvio(f) }),

  /** Envia vários registros pendentes em uma única requisição. */
  sincronizar: (token: string, registros: RegistroEnvio[]) =>
    chamar<{ resultados: ResultadoSync[] }>('sincronizar', { token, registros }),
};
