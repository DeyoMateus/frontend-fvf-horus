import { api } from "./client";

export interface OpcoesHolerite {
  direcaoEspera: boolean;
  normalExtra: boolean;
  adicionalNoturno: boolean;
}

export interface DiaHolerite {
  dia: string;
  direcaoMin: number;
  esperaMin: number;
  normalMin: number;
  extraMin: number;
  noturnoMin: number;
  teveFechamentoGestor: boolean;
}

export interface ResultadoHolerite {
  motoristaId: string;
  periodoInicio: string;
  periodoFim: string;
  opcoes: OpcoesHolerite;
  dias: DiaHolerite[];
  totais: {
    direcaoMin: number;
    esperaMin: number;
    normalMin: number;
    extraMin: number;
    noturnoMin: number;
  };
}

function paramsHolerite(inicio: string, fim: string, opcoes: OpcoesHolerite) {
  return {
    inicio,
    fim,
    direcaoEspera: String(opcoes.direcaoEspera),
    normalExtra: String(opcoes.normalExtra),
    adicionalNoturno: String(opcoes.adicionalNoturno),
  };
}

/** Prévia (JSON) do holerite , usada pra mostrar a tabela na tela antes de baixar o PDF. */
export function calcularHolerite(
  motoristaId: string,
  inicio: string,
  fim: string,
  opcoes: OpcoesHolerite,
) {
  return api
    .get<ResultadoHolerite>(`/motoristas/${motoristaId}/holerite`, {
      params: paramsHolerite(inicio, fim, opcoes),
    })
    .then((r) => r.data);
}

/** Baixa o PDF do holerite (folha de ponto) pro gestor imprimir/enviar pro financeiro. */
export async function baixarHoleritePdf(
  motoristaId: string,
  nomeMotorista: string,
  inicio: string,
  fim: string,
  opcoes: OpcoesHolerite,
) {
  const resposta = await api.get(`/motoristas/${motoristaId}/holerite/pdf`, {
    params: paramsHolerite(inicio, fim, opcoes),
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `holerite-${nomeMotorista.replace(/\s+/g, "-")}-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Fechamento em lote (Rodada 36) , "janela de fechamento": o gestor
 * escolhe um conjunto de motoristas (ou nenhum = frota inteira) e
 * baixa tudo de uma vez. Com 1 motorista só, o backend devolve o
 * mesmo PDF individual de sempre.
 *
 * Rodada 82 , pedido do usuário: com mais de um motorista, o backend
 * não combina mais tudo num PDF só , devolve um .zip com um PDF
 * separado por motorista (cada um com o relatório completo dele).
 * O Content-Type da resposta que o backend manda decide a extensão
 * do arquivo salvo, em vez de adivinhar aqui pela contagem de ids
 * (mais simples e não duplica a regra "1 = pdf, mais de 1 = zip" que
 * já vive no controller).
 */
export async function baixarFechamentoPdf(
  inicio: string,
  fim: string,
  motoristaIds: string[] | null,
  opcoes: OpcoesHolerite,
) {
  const resposta = await api.get("/holerite-fechamento/pdf", {
    params: {
      inicio,
      fim,
      ...(motoristaIds && motoristaIds.length > 0
        ? { motoristaIds: motoristaIds.join(",") }
        : {}),
      direcaoEspera: String(opcoes.direcaoEspera),
      normalExtra: String(opcoes.normalExtra),
      adicionalNoturno: String(opcoes.adicionalNoturno),
    },
    responseType: "blob",
  });
  // Rodada 88 , corrigido erro de tipo: em versões mais novas do axios,
  // o valor de um header pode ser tipado como string | number | boolean |
  // AxiosHeaders | string[], não só string , `.includes` direto quebra a
  // checagem de tipos. `String(...)` normaliza pra sempre poder chamar
  // `.includes` (undefined vira "undefined", nunca contém "zip", então o
  // comportamento de fallback pro PDF continua o mesmo).
  const ehZip = String(resposta.headers["content-type"] ?? "").includes("zip");
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], {
      type: ehZip ? "application/zip" : "application/pdf",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  const sufixoPeriodo = `${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}`;
  const nomeArquivo =
    motoristaIds && motoristaIds.length === 1
      ? `holerite-${sufixoPeriodo}.pdf`
      : `fechamento-frota-${sufixoPeriodo}.${ehZip ? "zip" : "pdf"}`;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
