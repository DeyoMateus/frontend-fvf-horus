import { api } from "./client";
import type { RegistroJornada, VerificacaoIntegridade } from "./types";

// Espelha RegistrosJornadaController: rotas de leitura usadas pelo
// painel (o POST de criação é feito pelo app do motorista, não aqui).
export function listRegistros(motoristaId: string) {
  return api
    .get<RegistroJornada[]>(`/registros-jornada/motorista/${motoristaId}`)
    .then((r) => r.data);
}

export function verificarIntegridade(motoristaId: string) {
  return api
    .get<VerificacaoIntegridade>(
      `/registros-jornada/motorista/${motoristaId}/verificar-integridade`,
    )
    .then((r) => r.data);
}

export interface ResumoEventoVizinho {
  sequencial: number;
  tipoEvento: string;
  timestampEvento: string;
  criadoEm: string;
}

/** Rodada 158: análise detalhada de um único evento da cadeia de integridade. */
export interface AnaliseEventoIntegridade {
  motoristaId: string;
  divergente: boolean;
  explicacao: string;
  evento: {
    sequencial: number;
    tipoEvento: string;
    timestampEvento: string;
    criadoEm: string;
    latitude: number | null;
    longitude: number | null;
    precisaoGpsM: number | null;
    odometro: number | null;
    observacao: string | null;
    fusoOffsetMin: number | null;
    deviceUuidUsado: string;
  };
  anterior: ResumoEventoVizinho | null;
  proximo: ResumoEventoVizinho | null;
  verificacao: {
    hashAnteriorConfere: boolean;
    hashAnteriorGravado: string;
    hashAnteriorEsperado: string;
    hashConfere: boolean;
    hashGravado: string;
    hashRecalculado: string;
    payloadCanonico: string;
    tentativas: Array<{ descricao: string; bate: boolean }>;
    variacaoQueBate: string | null;
  };
  aceite: { motivo: string; aceitoPorNome: string; aceitoEm: string } | null;
}

export function analisarEventoIntegridade(
  motoristaId: string,
  sequencial: number,
) {
  return api
    .get<AnaliseEventoIntegridade>(
      `/registros-jornada/motorista/${motoristaId}/integridade/${sequencial}`,
    )
    .then((r) => r.data);
}

/** Pedido do usuário: aceitar/regularizar uma divergência específica, pra ela parar de aparecer como problema em aberto (fica documentada, nunca apagada). */
export function aceitarDivergenciaIntegridade(
  motoristaId: string,
  sequencial: number,
  motivo: string,
  motivoTipo: string = "OUTRO",
  rompimentoDeVidro: boolean = false,
) {
  return api
    .patch(
      `/registros-jornada/motorista/${motoristaId}/integridade/${sequencial}/aceitar`,
      { motivo, motivoTipo, rompimentoDeVidro },
    )
    .then((r) => r.data);
}

export interface PedidoAceiteIntegridade {
  id: string;
  sequencial: number;
  motivoTipo: string;
  motivo: string;
  solicitadoPorUsuarioId: string;
  createdAt: string;
}

export function listarPedidosAceiteIntegridade(
  motoristaId: string,
): Promise<PedidoAceiteIntegridade[]> {
  return api
    .get(`/registros-jornada/motorista/${motoristaId}/integridade-pedidos`)
    .then((r) => r.data);
}

export function decidirPedidoAceiteIntegridade(
  pedidoId: string,
  aprovar: boolean,
  motivoDecisao?: string,
) {
  return api
    .patch(`/registros-jornada/integridade-pedidos/${pedidoId}`, {
      aprovar,
      motivoDecisao,
    })
    .then((r) => r.data);
}

export interface JornadaDiariaConsolidada {
  inicio: string;
  fim: string;
  emAndamento: boolean;
  totalDirecaoMin: number;
  totalEsperaMin: number;
  totalJornadaMin: number;
}

export interface ViagemConsolidada {
  inicio: string;
  fim: string;
  diasCorridos: number;
  emAndamento: boolean;
  jornadas: JornadaDiariaConsolidada[];
  totalDirecaoMin: number;
  totalEsperaMin: number;
  totalJornadaMin: number;
  /** CT-e(s) que definem esta viagem , vazio quando é uma jornada avulsa sem CT-e vinculado no período. */
  ctesRelacionados: { id: string; numero: string | null }[];
}

/** Fechamento diário consolidado em "Viagem" multi-dia (ver ARCHITECTURE.md §16). */
export function listarViagens(motoristaId: string) {
  return api
    .get<
      ViagemConsolidada[]
    >(`/registros-jornada/motorista/${motoristaId}/viagens`)
    .then((r) => r.data);
}

/** Baixa a planilha CSV da jornada (conveniência; NÃO é o AEJ oficial). */
export async function baixarPlanilhaJornada(
  motoristaId: string,
  periodo?: { inicio?: string; fim?: string },
) {
  const params: Record<string, string> = {};
  if (periodo?.inicio) params.inicio = periodo.inicio;
  if (periodo?.fim) params.fim = periodo.fim;

  const resposta = await api.get(
    `/registros-jornada/motorista/${motoristaId}/aej-planilha`,
    {
      params,
      responseType: "blob",
    },
  );

  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `planilha-jornada-${motoristaId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Baixa o comprovante em PDF do período e dispara o download no navegador. */
export async function baixarComprovante(
  motoristaId: string,
  periodo?: { inicio?: string; fim?: string },
) {
  const params: Record<string, string> = {};
  if (periodo?.inicio) params.inicio = periodo.inicio;
  if (periodo?.fim) params.fim = periodo.fim;

  const resposta = await api.get(
    `/registros-jornada/motorista/${motoristaId}/comprovante`,
    {
      params,
      responseType: "blob",
    },
  );

  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `comprovante-${motoristaId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Baixa o Espelho de Ponto Eletrônico (REP-P), Rodada 27 , layout
 * exigido pela Lei 13.103/2015 + Portaria 671/2021 (GPS + NSR +
 * categoria legal por evento, resumo diário categorizado, rodapé com
 * cadeia de hash). Ver RepPService no backend sobre o que este
 * relatório é e o que deliberadamente não afirma (ICP-Brasil A1,
 * validação NTP formal).
 */
export async function baixarEspelhoRepP(
  motoristaId: string,
  periodo?: { inicio?: string; fim?: string },
) {
  const params: Record<string, string> = {};
  if (periodo?.inicio) params.inicio = periodo.inicio;
  if (periodo?.fim) params.fim = periodo.fim;

  const resposta = await api.get(
    `/registros-jornada/motorista/${motoristaId}/espelho-rep-p`,
    {
      params,
      responseType: "blob",
    },
  );

  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `espelho-rep-p-${motoristaId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** Baixa o AEJ no leiaute oficial (Anexo VI da Portaria 671/2021, texto ISO 8859-1). */
export async function baixarAej(
  motoristaId: string,
  periodo?: { inicio?: string; fim?: string },
) {
  const params: Record<string, string> = {};
  if (periodo?.inicio) params.inicio = periodo.inicio;
  if (periodo?.fim) params.fim = periodo.fim;
  const resposta = await api.get(
    `/registros-jornada/motorista/${motoristaId}/aej`,
    { params, responseType: "blob" },
  );
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "text/plain;charset=iso-8859-1" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `AEJ-${motoristaId}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
