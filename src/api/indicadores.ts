import { api } from "./client";

// Espelha IndicadoresController/IndicadoresService (Rodada 36).
// Restrição explícita do usuário: SOMENTE horas/contagens, nunca valor
// em R$ , não existe nenhum campo de valor/hora aqui de propósito.
export interface IndicadoresAlertas {
  total: number;
  criticos: number;
  atencao: number;
  info: number;
  riscoFraude: number;
}

export interface IndicadoresBancoHoras {
  ativo: boolean;
  creditoExtraMin: number;
  creditoCorrecaoMin: number;
  debitoMin: number;
  saldoMin: number;
}

export interface IndicadoresMotorista {
  motoristaId: string;
  nome: string;
  direcaoMin: number;
  esperaMin: number;
  normalMin: number;
  extraMin: number;
  noturnoMin: number;
  // Rodada 68 , jornada aberta sem etapa em aberto (nem direção, nem
  // descanso, nem espera, nem "aguardando documentação") , o motorista
  // não escolheu a próxima ação. Separado das demais categorias de
  // propósito: não é tempo trabalhado, é tempo sem status.
  indefinidoMin: number;
  alertas: IndicadoresAlertas;
  percentualExtraSobreDirecao: number;
  percentualEsperaSobreTotal: number;
  percentualNoturnoSobreDirecao: number;
  percentualIndefinidoSobreJornada: number;
  bancoHoras: IndicadoresBancoHoras;
}

export interface IndicadoresDiaTendencia {
  dia: string;
  direcaoMin: number;
  esperaMin: number;
  normalMin: number;
  extraMin: number;
  noturnoMin: number;
  indefinidoMin: number;
  alertas: number;
  bancoHorasCreditoMin: number;
  bancoHorasDebitoMin: number;
  bancoHorasSaldoAcumuladoMin: number;
}

export interface IndicadoresRankingItem {
  motoristaId: string;
  nome: string;
  valorMin: number;
}

export interface IndicadoresPainel {
  periodoInicio: string;
  periodoFim: string;
  motoristaFiltro: string | null;
  motoristas: IndicadoresMotorista[];
  totais: {
    direcaoMin: number;
    esperaMin: number;
    normalMin: number;
    extraMin: number;
    noturnoMin: number;
    indefinidoMin: number;
    alertas: IndicadoresAlertas;
    percentualExtraSobreDirecao: number;
    percentualEsperaSobreTotal: number;
    percentualNoturnoSobreDirecao: number;
    percentualIndefinidoSobreJornada: number;
    bancoHoras: IndicadoresBancoHoras;
  };
  motoristasComBancoHorasAtivo: number;
  tendenciaDiaria: IndicadoresDiaTendencia[];
  rankingHorasExtras: IndicadoresRankingItem[];
  rankingTempoEspera: IndicadoresRankingItem[];
  rankingTempoIndefinido: IndicadoresRankingItem[];
}

function parametros(inicio: string, fim: string, motoristaId?: string) {
  return { inicio, fim, ...(motoristaId ? { motoristaId } : {}) };
}

export function getIndicadoresPainel(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  return api
    .get<IndicadoresPainel>("/indicadores", {
      params: parametros(inicio, fim, motoristaId),
    })
    .then((r) => r.data);
}

/** Baixa o CSV com as horas completas e separadas por motorista/dia , pro RH decidir o pagamento fora da plataforma. */
export async function baixarIndicadoresCsv(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  const resposta = await api.get("/indicadores/exportar", {
    params: parametros(inicio, fim, motoristaId),
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `indicadores-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
