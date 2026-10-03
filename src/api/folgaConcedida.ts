import { api } from "./client";

export interface FolgaConcedida {
  id: string;
  motoristaId: string;
  data: string;
  motivo: string | null;
  concedidaPorUsuarioId: string;
  concedidaPorUsuario?: { id: string; nome: string };
  createdAt: string;
}

export interface CreateFolgaConcedidaInput {
  data: string;
  motivo?: string;
}

// Espelha FolgaConcedidaController , lançada pelo RH/gestor (ADMIN/GESTOR),
// nunca pelo motorista (isso é o AutorrelatoFolga, fluxo separado).
export function listarFolgasConcedidas(motoristaId: string) {
  return api
    .get<FolgaConcedida[]>(`/motoristas/${motoristaId}/folgas-concedidas`)
    .then((r) => r.data);
}

export function concederFolga(
  motoristaId: string,
  input: CreateFolgaConcedidaInput,
) {
  return api
    .post<FolgaConcedida>(`/motoristas/${motoristaId}/folgas-concedidas`, input)
    .then((r) => r.data);
}
