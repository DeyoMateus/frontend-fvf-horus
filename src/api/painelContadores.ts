import { api } from "./client";
import type { SolicitacaoAjustePonto } from "./types";
import type { SolicitacaoFolga } from "./solicitacoesFolga";
import type { SolicitacaoPendenteSino } from "./privacidade";

/**
 * As pendencias do sino (ajustes de ponto, pedidos de folga e pedidos dos titulares) numa so
 * consulta. Cada parte e `null` quando falhou no servidor; o painel mantem o que ja tinha dela.
 */
/** Instrumento do banco de horas vencido ou perto de vencer. */
export interface AvisoInstrumento {
  empresaId: string;
  razaoSocial: string;
  vigenciaFim: string;
  situacao: "VENCIDO" | "VENCE_EM_BREVE";
  diasParaFim: number | null;
}

/** Motorista com credito do banco de horas vencido e nao baixado, ou a vencer em ate 15 dias. */
export interface AvisoBancoVencimento {
  motoristaId: string;
  nome: string;
  vencidoMin: number;
  aVencerMin: number;
  proximoVencimento: string | null;
  diasParaVencer: number | null;
  situacao: "VENCIDO" | "VENCE_HOJE" | "VENCE_EM_BREVE";
}

export interface PendenciasDoPainel {
  ajustes: SolicitacaoAjustePonto[] | null;
  folgas: SolicitacaoFolga[] | null;
  titulares: SolicitacaoPendenteSino[] | null;
  instrumentos?: AvisoInstrumento[] | null;
  bancoVencimentos?: AvisoBancoVencimento[] | null;
}

export const listarPendenciasDoPainel = () =>
  api.get<PendenciasDoPainel>("/painel/pendencias").then((r) => r.data);
