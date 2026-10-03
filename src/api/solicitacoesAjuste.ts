import { api } from "./client";
import type { SolicitacaoAjustePonto } from "./types";

/** "Caixa de entrada" do RH: todas as pendentes de qualquer motorista do grupo. */
export function listSolicitacoesPendentes() {
  return api
    .get<SolicitacaoAjustePonto[]>("/solicitacoes-ajuste-ponto/pendentes")
    .then((r) => r.data);
}

export interface PaginaHistoricoSolicitacoes {
  dados: SolicitacaoAjustePonto[];
  total: number;
  page: number;
  pageSize: number;
}

/** Pedido do usuário: histórico do que já foi decidido (aprovado/rejeitado), paginado no servidor. */
export function listarHistoricoSolicitacoes(
  page = 1,
  pageSize = 10,
  ordem: "asc" | "desc" = "desc",
) {
  return api
    .get<PaginaHistoricoSolicitacoes>("/solicitacoes-ajuste-ponto/historico", {
      params: { page, pageSize, ordem },
    })
    .then((r) => r.data);
}

// Cada decisão mexe só na solicitação em questão , nunca em lote.
export function aprovarSolicitacao(id: string, motivoDecisao?: string) {
  return api
    .patch<SolicitacaoAjustePonto>(`/solicitacoes-ajuste-ponto/${id}/aprovar`, {
      motivoDecisao,
    })
    .then((r) => r.data);
}

export function rejeitarSolicitacao(id: string, motivoDecisao: string) {
  return api
    .patch<SolicitacaoAjustePonto>(
      `/solicitacoes-ajuste-ponto/${id}/rejeitar`,
      { motivoDecisao },
    )
    .then((r) => r.data);
}

export async function baixarEvidenciaSolicitacao(
  evidenciaId: string,
  nomeArquivo: string,
) {
  const resposta = await api.get(
    `/solicitacoes-ajuste-ponto/evidencias/${evidenciaId}`,
    { responseType: "blob" },
  );
  const url = window.URL.createObjectURL(new Blob([resposta.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Mesma ideia de `obterUrlEvidenciaTratamento`, pro fluxo de solicitações de ajuste. */
export async function obterUrlEvidenciaSolicitacao(evidenciaId: string) {
  const resposta = await api.get(
    `/solicitacoes-ajuste-ponto/evidencias/${evidenciaId}`,
    { responseType: "blob" },
  );
  return window.URL.createObjectURL(new Blob([resposta.data]));
}

/** Remove (painel do RH) , some do R2 e do Postgres. */
export function removerEvidenciaSolicitacao(evidenciaId: string) {
  return api
    .delete(`/solicitacoes-ajuste-ponto/evidencias/${evidenciaId}`)
    .then((r) => r.data);
}
