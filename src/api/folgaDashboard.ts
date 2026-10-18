import { api } from "./client";

export type SituacaoFolga =
  | "URGENTE"
  | "ACIMA_DO_LIMITE"
  | "VENCIDA"
  | "EM_DIA"
  | "MARCADA"
  | "SEM_REGRA";

export interface ItemFolgaDashboard {
  motoristaId: string;
  nome: string;
  empresaId: string;
  empresa: string;
  empresaCnpj: string;
  regraNome: string | null;
  diasTrabalhados: number;
  diasParaFolga: number | null;
  toleranciaDias: number;
  janelaDias: number;
  folgasVencidas: number;
  limiteFolgasVencidas: number | null;
  acimaDoLimite: boolean;
  urgente: boolean;
  severidade: "ATENCAO" | "CRITICO" | null;
  situacao: SituacaoFolga;
  ultimaFolga: string | null;
  proximaFolga: string | null;
  folgaAte: string | null;
  inicioCiclo: string;
  posicao: number;
}

export interface PedidoAbertoDashboard {
  id: string;
  motoristaId: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  totalDias: number;
  observacao: string | null;
  createdAt: string;
}

export interface PedidoNegadoDashboard {
  id: string;
  motoristaId: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  totalDias: number;
  observacao: string | null;
  motivoDecisao: string | null;
  decididoEm: string | null;
  decididoPor: string | null;
  /** Negado sozinho porque ninguém respondeu a tempo. */
  automatico: boolean;
}

export interface FolgaNaoRealizadaDashboard {
  id: string;
  motoristaId: string;
  nome: string;
  data: string;
  motivo: string | null;
  registradoEm: string | null;
}

export interface RegraFolgaResumo {
  id: string;
  nome: string;
  diasTrabalho: number;
  toleranciaDias: number;
  limiteFolgasVencidas: number;
}

export interface FolgaDashboard {
  geradoEm: string;
  empresas: Array<{
    id: string;
    razaoSocial: string;
    cnpj: string;
    regra: RegraFolgaResumo | null;
  }>;
  totais: {
    motoristasAtivos: number;
    deFolga: number;
    vencidas: number;
    marcadas: number;
    pedidosEmAberto: number;
    pedidosNegados: number;
    naoRealizadas: number;
    emDia: number;
    semConfiguracao: number;
    /** Folgas vencidas em nível crítico (urgentes + acima do limite). */
    acimaDoLimite: number;
    urgentes: number;
  };
  ranking: ItemFolgaDashboard[];
  deFolga: ItemFolgaDashboard[];
  vencidas: ItemFolgaDashboard[];
  marcadas: ItemFolgaDashboard[];
  pedidosEmAberto: PedidoAbertoDashboard[];
  /** Negados nos últimos 90 dias. */
  pedidosNegados: PedidoNegadoDashboard[];
  /** Folgas em que o motorista trabalhou, últimos 90 dias. */
  naoRealizadas: FolgaNaoRealizadaDashboard[];
}

/** Rodada 274: indicadores do dashboard de folgas. */
export function getFolgaDashboard() {
  return api
    .get<FolgaDashboard>("/solicitacoes-folga/dashboard")
    .then((r) => r.data);
}
