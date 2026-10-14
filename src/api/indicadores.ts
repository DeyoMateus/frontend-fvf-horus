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

/** Parser mínimo de CSV (vírgula, aspas duplas, "" escapado, quebras dentro de aspas). */
function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  const limpo = texto.replace(/^\uFEFF/, "");
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        aspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      aspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo);
      campo = "";
      linhas.push(linha);
      linha = [];
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c !== ""));
}

const ROTULOS_CSV_INDICADORES: Record<string, string> = {
  motorista: "Motorista",
  dia: "Dia",
  horas_direcao: "Horas de direção",
  horas_espera: "Horas de espera",
  horas_normais: "Horas normais",
  horas_extras: "Horas extras",
  horas_adicional_noturno: "Horas de adicional noturno",
  horas_indefinido: "Horas indefinido",
};

function baixarBlob(blob: Blob, nome: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Baixa as horas completas e separadas por motorista/dia , pro RH decidir o
 * pagamento fora da plataforma. Rodada 233: o endpoint continua devolvendo
 * CSV; o painel converte e entrega uma planilha Excel (.xlsx) no modelo
 * visual dos PDFs. Se a conversão falhar, baixa o CSV original.
 */
export async function baixarIndicadoresCsv(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  const resposta = await api.get("/indicadores/exportar", {
    params: parametros(inicio, fim, motoristaId),
    responseType: "blob",
  });
  const nomeBase = `indicadores-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}`;
  const blobCsv = new Blob([resposta.data], { type: "text/csv;charset=utf-8" });
  try {
    const tabela = lerCsv(await blobCsv.text());
    if (tabela.length < 1) throw new Error("csv vazio");
    const [cab, ...corpo] = tabela;
    const cabecalhos = cab.map((c) => ROTULOS_CSV_INDICADORES[c] ?? c);
    const linhas = corpo.map((l) =>
      l.map((c, i) => {
        // Colunas de horas (a partir da 3ª) viram número; motorista e dia ficam texto.
        if (i >= 2 && /^-?\d+(\.\d+)?$/.test(c)) return Number(c);
        return c;
      }),
    );
    const emNegrito = corpo
      .map((l, i) => (l[0]?.endsWith("(TOTAL)") ? i : -1))
      .filter((i) => i >= 0);
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
    const { baixarPlanilhaXlsx } = await import("../utils/exportarPlanilhaXlsx");
    await baixarPlanilhaXlsx({
      nomeArquivo: `${nomeBase}.xlsx`,
      titulo: "Indicadores de jornada",
      subtitulo: `Período: ${fmt(inicio)} a ${fmt(fim)} , horas em formato decimal (sem valores em R$)`,
      cabecalhos,
      linhas,
      linhasEmNegrito: emNegrito,
      formatoNumero: "0.00",
    });
  } catch {
    baixarBlob(blobCsv, `${nomeBase}.csv`);
  }
}
