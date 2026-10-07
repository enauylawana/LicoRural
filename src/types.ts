export type SyncStatus = 'pendente' | 'sincronizando' | 'sincronizado' | 'erro';

export interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  perfil: string;
}

export interface Sessao extends Usuario {
  /** Token emitido pelo Apps Script no login online; exigido para gravar no Sheets. */
  token: string | null;
  loginEm: string;
  demo: boolean;
}

export interface Produtor {
  id: string;
  // Etapa 1 — dados pessoais
  nome: string;
  cpf: string;
  telefone: string;
  nascimento: string;
  email: string;
  // Etapa 2 — endereço
  cep: string;
  municipio: string;
  uf: string;
  endereco: string;
  complemento: string;
  latitude: number | null;
  longitude: number | null;
  // Etapa 3 — propriedade
  propriedade: string;
  area: string;
  atividade: string;
  observacoes: string;

  usuario: string;
  criadoEm: string;
  atualizadoEm: string;
  status: SyncStatus;
  erro?: string;
}

export interface Anexo {
  uri: string;
  nome: string;
  tipo: 'foto' | 'documento';
  tamanho?: number;
}

export interface Formulario {
  id: string;
  produtorId: string;
  usuario: string;
  modelo: string;
  possuiPecuaria: boolean | null;
  quantidadeAnimais: string;
  finalidade: string;
  areaPastagem: string;
  observacoes: string;
  anexos: Anexo[];
  criadoEm: string;
  atualizadoEm: string;
  status: SyncStatus;
  erro?: string;
}

export type TipoRegistro = 'produtor' | 'formulario';

export interface ItemFila {
  tipo: TipoRegistro;
  registroId: string;
  adicionadoEm: string;
  tentativas: number;
}

export type DadosProdutor = Omit<Produtor, 'id' | 'usuario' | 'criadoEm' | 'atualizadoEm' | 'status' | 'erro'>;
export type DadosFormulario = Omit<Formulario, 'id' | 'usuario' | 'criadoEm' | 'atualizadoEm' | 'status' | 'erro'>;
