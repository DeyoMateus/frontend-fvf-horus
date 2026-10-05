import { api } from "./client";
import type {
  CardPainel,
  ChaveIndicadorTendencia,
  DashboardDetalheCard,
  DashboardResumo,
  DashboardTendenciaDetalhe,
  DashboardTendenciaDia,
} from "./types";

// Espelha DashboardController.
export function getDashboardResumo() {
  return api.get<DashboardResumo>("/dashboard/resumo").then((r) => r.data);
}

// Pedido do usuário: além dos atalhos de 7/30/90 dias, poder extrair os
// dados por um período exato (AAAA-MM-DD) definido pelo usuário. Passar
// `periodo` (desde/ate) tem prioridade sobre `dias` (ver
// DashboardService.tendencia no backend).
export function getDashboardTendencia(
  dias = 30,
  periodo?: { desde: string; ate: string },
) {
  return api
    .get<DashboardTendenciaDia[]>("/dashboard/tendencia", {
      // fusoOffsetMin: os alertas por dia seguem o fuso do computador de quem vê.
      params: periodo
        ? {
            desde: periodo.desde,
            ate: periodo.ate,
            fusoOffsetMin: -new Date().getTimezoneOffset(),
          }
        : { dias, fusoOffsetMin: -new Date().getTimezoneOffset() },
    })
    .then((r) => r.data);
}

export function getDashboardDetalhe(card: CardPainel) {
  return api
    .get<DashboardDetalheCard>("/dashboard/detalhe", { params: { card } })
    .then((r) => r.data);
}

// Drill-through de um ponto do gráfico de evolução (dia + indicador) , ver DashboardController.tendenciaDetalhe.
export function getDashboardTendenciaDetalhe(
  dia: string,
  indicador: ChaveIndicadorTendencia,
) {
  return api
    .get<DashboardTendenciaDetalhe>("/dashboard/tendencia-detalhe", {
      params: { dia, indicador, fusoOffsetMin: -new Date().getTimezoneOffset() },
    })
    .then((r) => r.data);
}
