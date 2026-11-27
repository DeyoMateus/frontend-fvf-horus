import { avisarPendenciasMudaram } from "../utils/avisarPendenciasMudaram";
import { api } from "./client";
import type { SolicitacaoAjustePonto } from "./types";
import { baixarArquivo } from "../utils/baixarArquivo";

/** "Caixa de entrada" do RH: todas as pendentes de qualquer motorista do grupo. */
export function listSolicitacoesPendentes() {
  return api
    .get<SolicitacaoAjustePonto[]>("/solicitacoes-ajuste-ponto/pendentes")
    .then((r) => r.data);
}

/** Rodada 799: se cada pedido pendente encaixa na jornada (mesma conferência da aprovação). */
export interface EncaixePedido {
  ok: boolean | null;
  mensagem: string | null;
  fechamentoAutomatico: string | null;
  /** Rodada 803: o pedido corrige um ponto real batido mais tarde (o original sai do cálculo). */
  corrigeRegistro?: boolean;
  /** Horário do ponto real que será desconsiderado (ISO). */
  registroCorrigidoEm?: string | null;
}
export function conferirEncaixePendentes() {
  return api
    .get<Record<string, EncaixePedido>>("/solicitacoes-ajuste-ponto/pendentes/encaixe")
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
export function aprovarSolicitacao(
  id: string,
  motivoDecisao?: string,
  /** Rodada 789: horário corrigido pelo RH (ISO). Ausente = o horário pedido. */
  horarioAjustado?: string,
) {
  return api
    .patch<SolicitacaoAjustePonto>(`/solicitacoes-ajuste-ponto/${id}/aprovar`, {
      motivoDecisao: motivoDecisao || undefined,
      horarioAjustado,
    })
    .then((r) => {
      avisarPendenciasMudaram();
      return r.data;
    });
}

export function rejeitarSolicitacao(id: string, motivoDecisao: string) {
  return api
    .patch<SolicitacaoAjustePonto>(
      `/solicitacoes-ajuste-ponto/${id}/rejeitar`,
      { motivoDecisao },
    )
    .then((r) => {
      avisarPendenciasMudaram();
      return r.data;
    });
}

export async function baixarEvidenciaSolicitacao(
  evidenciaId: string,
  nomeArquivo: string,
) {
  const resposta = await api.get(
    `/solicitacoes-ajuste-ponto/evidencias/${evidenciaId}`,
    { responseType: "blob" },
  );
  baixarArquivo(new Blob([resposta.data]), nomeArquivo);
}

/** Mesma ideia de `obterUrlEvidenciaTratamento`, pro fluxo de solicitações de ajuste. */
export async function obterUrlEvidenciaSolicitacao(evidenciaId: string) {
  const resposta = await api.get(
    `/solicitacoes-ajuste-ponto/evidencias/${evidenciaId}`,
    { responseType: "blob" },
  );
  return window.URL.createObjectURL(new Blob([resposta.data]));
}
