import { api } from "./client";
import type { SolicitacaoAjustePonto } from "./types";
import type { SolicitacaoFolga } from "./solicitacoesFolga";
import type { SolicitacaoPendenteSino } from "./privacidade";

/**
 * Rodada 653: as pendencias do sino (ajustes de ponto, pedidos de folga e pedidos dos titulares) numa so
 * consulta. Cada parte e `null` quando falhou no servidor; o painel mantem o que ja tinha dela.
 */
export interface PendenciasDoPainel {
  ajustes: SolicitacaoAjustePonto[] | null;
  folgas: SolicitacaoFolga[] | null;
  titulares: SolicitacaoPendenteSino[] | null;
}

export const listarPendenciasDoPainel = () =>
  api.get<PendenciasDoPainel>("/painel/pendencias").then((r) => r.data);
