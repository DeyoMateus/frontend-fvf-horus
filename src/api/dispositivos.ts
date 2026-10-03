import { api } from "./client";
import type { DispositivoStatus, SolicitacaoTrocaDispositivo } from "./types";

// Espelha DispositivosController: rotas /motoristas/:id/dispositivo.
export function statusDispositivo(motoristaId: string) {
  return api
    .get<DispositivoStatus>(`/motoristas/${motoristaId}/dispositivo`)
    .then((r) => r.data);
}

export interface VincularDispositivoResponse {
  motoristaId: string;
  deviceUuid: string;
  vinculadoEm: string;
  deviceApiKey: string; // só aparece nesta resposta , mostrar uma vez e nunca mais
}

export function vincularDispositivo(motoristaId: string, deviceUuid: string) {
  return api
    .post<VincularDispositivoResponse>(
      `/motoristas/${motoristaId}/dispositivo`,
      { deviceUuid },
    )
    .then((r) => r.data);
}

export function revogarDispositivo(motoristaId: string) {
  return api.delete(`/motoristas/${motoristaId}/dispositivo`);
}

// Espelha SolicitacoesTrocaDispositivoController (fluxo de troca de aparelho).
export function listarSolicitacoesTroca() {
  return api
    .get<SolicitacaoTrocaDispositivo[]>("/solicitacoes-troca-dispositivo")
    .then((r) => r.data);
}

export interface AprovarTrocaResponse {
  motoristaId: string;
  deviceUuid: string;
  vinculadoEm: string;
  deviceApiKey: string; // só aparece nesta resposta , mostrar uma vez e nunca mais
}

export function aprovarTrocaDispositivo(solicitacaoId: string) {
  return api
    .patch<AprovarTrocaResponse>(
      `/solicitacoes-troca-dispositivo/${solicitacaoId}/aprovar`,
    )
    .then((r) => r.data);
}

export function rejeitarTrocaDispositivo(
  solicitacaoId: string,
  motivo: string,
) {
  return api.patch(
    `/solicitacoes-troca-dispositivo/${solicitacaoId}/rejeitar`,
    { motivo },
  );
}
