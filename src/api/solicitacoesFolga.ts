import { api } from "./client";

export type StatusSolicitacaoFolga = "PENDENTE" | "APROVADA" | "NEGADA";

export interface SolicitacaoFolga {
  id: string;
  motoristaId: string;
  motorista?: { id: string; nome: string };
  dataInicio: string;
  dataFim: string;
  observacao: string | null;
  status: StatusSolicitacaoFolga;
  motivoDecisao: string | null;
  decididoEm: string | null;
  decididoPorUsuario?: { id: string; nome: string } | null;
  createdAt: string;
}

export interface PaginaHistoricoFolga {
  dados: SolicitacaoFolga[];
  total: number;
  page: number;
  pageSize: number;
}

/** Rodada 221: pedidos de folga dos motoristas esperando decisão do RH. */
export function listarPedidosFolgaPendentes() {
  return api
    .get<SolicitacaoFolga[]>("/solicitacoes-folga/pendentes")
    .then((r) => r.data);
}

export function listarHistoricoPedidosFolga(page = 1, pageSize = 10) {
  return api
    .get<PaginaHistoricoFolga>("/solicitacoes-folga/historico", {
      params: { page, pageSize },
    })
    .then((r) => r.data);
}

export function aprovarPedidoFolga(id: string, motivoDecisao?: string) {
  return api
    .patch<SolicitacaoFolga>(`/solicitacoes-folga/${id}/aprovar`, {
      motivoDecisao: motivoDecisao || undefined,
    })
    .then((r) => r.data);
}

export function negarPedidoFolga(id: string, motivoDecisao: string) {
  return api
    .patch<SolicitacaoFolga>(`/solicitacoes-folga/${id}/negar`, {
      motivoDecisao,
    })
    .then((r) => r.data);
}
