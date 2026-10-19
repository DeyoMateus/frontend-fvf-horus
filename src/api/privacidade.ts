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
  respondidaEm: string | null;
  respondidaPorNome: string | null;
  createdAt: string;
  vencida: boolean;
  motorista: { id: string; nome: string };
};

export type FiltroSolicitacoesTitular = {
  status?: StatusSolicitacaoTitular;
  tipo?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  vencidas?: boolean;
  ordem?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type ListaSolicitacoesTitular = {
  dados: SolicitacaoTitularPainel[];
  total: number;
  page: number;
  pageSize: number;
  resumo: { abertas: number; emAnalise: number; vencidas: number };
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

export const listarSolicitacoesTitular = async (
  filtro: FiltroSolicitacoesTitular,
): Promise<ListaSolicitacoesTitular> => {
  const r = await api.get<ListaSolicitacoesTitular | SolicitacaoTitularPainel[]>(
    "/privacidade/painel/solicitacoes",
    {
      params: {
        ...filtro,
        vencidas: filtro.vencidas ? "true" : undefined,
      },
    },
  );
  const corpo = r.data;
  // Compatibilidade: backend antigo devolvia só um array (sem paginação).
  if (Array.isArray(corpo)) {
    return {
      dados: corpo,
      total: corpo.length,
      page: 1,
      pageSize: corpo.length || 50,
      resumo: {
        abertas: corpo.filter((p) => p.status === "ABERTA").length,
        emAnalise: corpo.filter((p) => p.status === "EM_ANALISE").length,
        vencidas: corpo.filter((p) => p.vencida).length,
      },
    };
  }
  return {
    ...corpo,
    dados: corpo?.dados ?? [],
    total: corpo?.total ?? 0,
    resumo: corpo?.resumo ?? { abertas: 0, emAnalise: 0, vencidas: 0 },
  };
};

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

// Rodada 281: Política de Privacidade para o usuário do painel (primeiro acesso).
export type MinhaPolitica = {
  versao: string;
  aceita: boolean;
  aceitaEm: string | null;
  titulo: string;
  texto: string;
};

export const obterMinhaPolitica = () =>
  api.get<MinhaPolitica>("/privacidade/painel/minha-politica").then((r) => r.data);

export const aceitarMinhaPolitica = (versao: string) =>
  api
    .post<{ aceita: boolean; versao: string; aceitaEm: string }>(
      "/privacidade/painel/minha-politica/aceitar",
      { versao },
    )
    .then((r) => r.data);
