import { api } from "./client";

// Espelha PrivacidadePublicaController / PrivacidadePainelController (Rodada 206, LGPD).
export type DocumentoPrivacidade = {
  tipo: string;
  titulo: string;
  texto: string;
};
export type DocumentosPublicos = {
  versao: string;
  documentos: DocumentoPrivacidade[];
};

export type StatusSolicitacaoTitular =
  | "ABERTA"
  | "EM_ANALISE"
  | "ATENDIDA"
  | "NEGADA_COM_JUSTIFICATIVA";

export type SolicitacaoTitularPainel = {
  id: string;
  tipo: string;
  descricao: string | null;
  status: StatusSolicitacaoTitular;
  prazoEm: string;
  resposta: string | null;
  createdAt: string;
  vencida: boolean;
  motorista: { id: string; nome: string };
};

export type EmpresaEncarregado = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  encarregadoNome: string | null;
  encarregadoEmail: string | null;
  encarregadoTelefone: string | null;
};

export type CienciasPainel = {
  versao: string;
  motoristas: {
    id: string;
    nome: string;
    politicaEm: string | null;
    termoGpsEm: string | null;
    termoDadosEm: string | null;
  }[];
};

export const documentosPublicos = () =>
  api.get<DocumentosPublicos>("/privacidade/documentos").then((r) => r.data);

export const listarSolicitacoesTitular = () =>
  api
    .get<SolicitacaoTitularPainel[]>("/privacidade/painel/solicitacoes")
    .then((r) => r.data);

export const responderSolicitacaoTitular = (
  id: string,
  status: StatusSolicitacaoTitular,
  resposta: string,
) =>
  api
    .patch(`/privacidade/painel/solicitacoes/${id}`, { status, resposta })
    .then((r) => r.data);

export const obterCiencias = () =>
  api.get<CienciasPainel>("/privacidade/painel/ciencias").then((r) => r.data);

export const obterEncarregados = () =>
  api
    .get<EmpresaEncarregado[]>("/privacidade/painel/encarregado")
    .then((r) => r.data);

export type SolicitacaoPendenteSino = {
  id: string;
  tipo: string;
  createdAt: string;
  prazoEm: string;
  motorista: { nome: string };
};

export const listarSolicitacoesTitularPendentes = () =>
  api
    .get<SolicitacaoPendenteSino[]>("/privacidade/painel/solicitacoes-pendentes")
    .then((r) => r.data);

export const salvarEncarregado = (input: {
  nome?: string;
  email?: string;
  telefone?: string;
}) =>
  api
    .put<EmpresaEncarregado[]>("/privacidade/painel/encarregado", input)
    .then((r) => r.data);
