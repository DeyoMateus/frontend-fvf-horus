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
export function listAlertasByEmpresa(apenasNaoVisualizados = false) {
  return api
    .get<AlertaJornada[]>(`/alertas-jornada/empresa/minha`, {
      params: apenasNaoVisualizados ? { naoVisualizados: "true" } : undefined,
    })
    .then((r) => r.data);
}

export function marcarAlertaVisualizado(alertaId: string) {
  return api
    .patch<AlertaJornada>(`/alertas-jornada/${alertaId}/visualizar`)
    .then((r) => r.data);
}

export function tratarAlerta(alertaId: string, observacao: string) {
  return api
    .patch<AlertaJornada>(`/alertas-jornada/${alertaId}/tratar`, { observacao })
    .then((r) => r.data);
}
