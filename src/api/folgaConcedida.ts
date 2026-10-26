import { api } from "./client";

export type StatusFolgaConcedida = "CONCEDIDA" | "NAO_REALIZADA" | "RETIRADA";

export const ROTULO_STATUS_FOLGA: Record<StatusFolgaConcedida, string> = {
  CONCEDIDA: "Concedida",
  NAO_REALIZADA: "Folga não realizada: motorista trabalhou",
  RETIRADA: "Folga retirada pelo RH",
};

export interface FolgaConcedida {
  id: string;
  status: StatusFolgaConcedida;
  statusAlteradoEm: string | null;
  motivoRetirada: string | null;
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
  /** Rodada 387: CCT/ACT que autoriza folga depois de mais de 6 dias seguidos de trabalho. */
  justificativaExcessoDias?: string;
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

/** Retira a folga antes da data prevista (o registro fica como "retirada"). */
export function retirarFolgaConcedida(
  motoristaId: string,
  folgaId: string,
  motivo?: string,
) {
  return api
    .post<FolgaConcedida>(
      `/motoristas/${motoristaId}/folgas-concedidas/${folgaId}/retirar`,
      { motivo },
    )
    .then((r) => r.data);
}
