import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, api, carregarApiUrl, getApiUrl } from '@/lib/api';
import { hashSenha } from '@/lib/hash';
import { storage } from '@/lib/storage';
import type { Sessao, Usuario } from '@/types';

// Usuários do modo demonstração (quando não há URL do Apps Script configurada).
const USUARIOS_DEMO: Record<string, { senha: string; usuario: Usuario }> = {
  joao: { senha: '1234', usuario: { id: '001', nome: 'João Silva', usuario: 'joao', perfil: 'Técnico de Campo' } },
  maria: { senha: '1234', usuario: { id: '002', nome: 'Maria Souza', usuario: 'maria', perfil: 'Administrador' } },
};

interface AuthContextValue {
  sessao: Sessao | null;
  carregando: boolean;
  login: (usuario: string, senha: string, lembrar: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Valida as credenciais. Com internet, consulta a aba USUARIOS pelo Apps Script;
 * sem internet, aceita o último usuário que já entrou online neste aparelho.
 */
async function autenticar(usuarioDigitado: string, senha: string): Promise<Sessao> {
  const usuario = usuarioDigitado.trim().toLowerCase();
  if (!usuario || !senha) throw new Error('Informe usuário e senha.');
  const senhaHash = await hashSenha(usuario, senha);
  const loginEm = new Date().toISOString();

  if (!getApiUrl()) {
    const demo = USUARIOS_DEMO[usuario];
    if (!demo || demo.senha !== senha) throw new Error('Usuário ou senha inválidos (modo demonstração: joao / 1234).');
    return { ...demo.usuario, token: null, loginEm, demo: true };
  }

  const net = await NetInfo.fetch();
  if (net.isConnected !== false && net.isInternetReachable !== false) {
    const resposta = await loginOnline(usuario, senhaHash);
    if (resposta) {
      await storage.setCredencial({ usuario: resposta.usuario, senhaHash, token: resposta.token });
      return { ...resposta.usuario, token: resposta.token, loginEm, demo: false };
    }
  }

  const cred = await storage.getCredencial();
  if (!cred) throw new Error('Sem conexão. O primeiro acesso precisa ser feito com internet.');
  if (cred.usuario.usuario !== usuario || cred.senhaHash !== senhaHash) {
    throw new Error('Sem conexão e as credenciais não conferem com o último acesso neste aparelho.');
  }
  return { ...cred.usuario, token: cred.token, loginEm, demo: false };
}

/** Retorna null apenas em falha de rede; credenciais recusadas e erros do script são repassados. */
async function loginOnline(usuario: string, senhaHash: string) {
  try {
    return await api.login(usuario, senhaHash);
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'rede' || e.code === 'timeout')) return null;
    throw e;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      await carregarApiUrl();
      setSessao(await storage.getSessao());
      setCarregando(false);
    })();
  }, []);

  const login = useCallback(async (usuario: string, senha: string, lembrar: boolean) => {
    const nova = await autenticar(usuario, senha);
    // "Lembrar de mim" mantém a sessão ao reabrir o app.
    await storage.setSessao(lembrar ? nova : null);
    setSessao(nova);
  }, []);

  const logout = useCallback(async () => {
    await storage.setSessao(null);
    setSessao(null);
  }, []);

  const value = useMemo(() => ({ sessao, carregando, login, logout }), [sessao, carregando, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
