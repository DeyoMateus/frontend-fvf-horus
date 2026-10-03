import { api } from "./client";
import type { Ajudante, PaginaAjudantes, StatusMotorista } from "./types";

// Espelha AjudantesController: rotas /ajudantes (Rodada 66). Mesmo
// raciocínio de listMotoristas , grupoId nunca é enviado, vem do token.
export function listAjudantes(
  page = 1,
  pageSize = 200,
  busca?: string,
  incluirExcluidos?: boolean,
) {
  return api
    .get<PaginaAjudantes>("/ajudantes", {
      params: {
        page,
        pageSize,
        busca: busca || undefined,
        incluirExcluidos: incluirExcluidos || undefined,
      },
    })
    .then((r) => r.data);
}

export interface CreateAjudanteInput {
  nome: string;
  cpf: string;
  empresaId: string;
  telefone?: string;
}

export function createAjudante(input: CreateAjudanteInput) {
  return api.post<Ajudante>("/ajudantes", input).then((r) => r.data);
}

export function atualizarStatusAjudante(
  id: string,
  status: StatusMotorista,
  motivo?: string,
) {
  return api
    .patch<Ajudante>(`/ajudantes/${id}/status`, { status, motivo })
    .then((r) => r.data);
}

export function excluirAjudante(id: string, motivo?: string) {
  return api
    .delete<Ajudante>(`/ajudantes/${id}`, { data: { motivo } })
    .then((r) => r.data);
}

export interface VinculoDispositivoAjudante {
  ajudanteId: string;
  deviceUuid: string;
  vinculadoEm: string;
  deviceApiKey: string;
}

export function vincularDispositivoAjudante(id: string, deviceUuid: string) {
  return api
    .post<VinculoDispositivoAjudante>(`/ajudantes/${id}/dispositivo`, {
      deviceUuid,
    })
    .then((r) => r.data);
}

export function revogarDispositivoAjudante(id: string) {
  return api.delete(`/ajudantes/${id}/dispositivo`);
}
