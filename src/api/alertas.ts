import { api } from "./client";
import type { AlertaJornada } from "./types";

// Espelha AlertasJornadaController.
export function listAlertasByMotorista(
  motoristaId: string,
  apenasNaoVisualizados = false,
) {
  return api
    .get<AlertaJornada[]>(`/alertas-jornada/motorista/${motoristaId}`, {
      params: apenasNaoVisualizados ? { naoVisualizados: "true" } : undefined,
    })
    .then((r) => r.data);
}

// grupoId não é passado , o backend sempre deriva o grupo (tenant) do
// próprio token JWT (ver AlertasJornadaController).
// Sino e Dashboard pedem a mesma lista de nao visualizados em relogios diferentes (36-39 kB cada).
// Cache curto da promise: quem pedir dentro da janela reaproveita a resposta. Qualquer escrita
// (PATCH/POST/DELETE) bem-sucedida zera o cache, para nunca mostrar a lista antiga apos uma acao.
const VALIDADE_CACHE_ALERTAS_MS = 10_000;
let cacheNaoVisualizados: {
  em: number;
  promessa: Promise<AlertaJornada[]>;
} | null = null;

export function invalidarCacheAlertas() {
  cacheNaoVisualizados = null;
}

api.interceptors.response.use((resposta) => {
  if ((resposta.config.method ?? "get").toLowerCase() !== "get") {
    invalidarCacheAlertas();
  }
  return resposta;
});

export function listAlertasByEmpresa(apenasNaoVisualizados = false) {
  if (!apenasNaoVisualizados) {
    return api
      .get<AlertaJornada[]>(`/alertas-jornada/empresa/minha`)
      .then((r) => r.data);
  }
  const agora = Date.now();
  if (
    cacheNaoVisualizados &&
    agora - cacheNaoVisualizados.em < VALIDADE_CACHE_ALERTAS_MS
  ) {
    return cacheNaoVisualizados.promessa.then((d) => structuredClone(d));
  }
  const promessa = api
    .get<AlertaJornada[]>(`/alertas-jornada/empresa/minha`, {
      params: { naoVisualizados: "true" },
    })
    .then((r) => r.data);
  const entrada = { em: agora, promessa };
  cacheNaoVisualizados = entrada;
  // Falha nao fica em cache: a proxima chamada tenta de novo.
  promessa.catch(() => {
    if (cacheNaoVisualizados === entrada) cacheNaoVisualizados = null;
  });
  return promessa.then((d) => structuredClone(d));
}

export function marcarAlertaVisualizado(alertaId: string) {
  return api
    .patch<AlertaJornada>(`/alertas-jornada/${alertaId}/visualizar`)
    .then((r) => r.data);
}

export function liberarRelogioAlerta(
  motoristaId: string,
  alertaId: string,
  horarioCorreto: string,
  observacao: string,
) {
  return api
    .patch(
      `/motoristas/${motoristaId}/tratamentos-ponto/liberar-relogio/${alertaId}`,
      { horarioCorreto, observacao },
    )
    .then((r) => r.data);
}

// Rodada 450: corrige a hora de um ponto aceito com divergência de relógio.
export function corrigirHoraPontoAlerta(
  motoristaId: string,
  alertaId: string,
  horarioCorreto: string,
  observacao: string,
) {
  return api
    .patch(
      `/motoristas/${motoristaId}/tratamentos-ponto/corrigir-hora/${alertaId}`,
      { horarioCorreto, observacao },
    )
    .then((r) => r.data);
}

export function tratarAlerta(alertaId: string, observacao: string) {
  return api
    .patch<AlertaJornada>(`/alertas-jornada/${alertaId}/tratar`, { observacao })
    .then((r) => r.data);
}

// Rodada 322: tratamento coletivo (só alertas não críticos).
export interface ResultadoTratamentoLote {
  tratados: string[];
  ignorados: string[];
  recusados: { id: string; motivo: string }[];
}

export function tratarAlertasEmLote(alertaIds: string[], observacao: string) {
  return api
    .patch<ResultadoTratamentoLote>(`/alertas-jornada/tratar-lote`, {
      alertaIds,
      observacao,
    })
    .then((r) => r.data);
}
