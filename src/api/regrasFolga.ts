import { api } from "./client";

export interface RegraFolga {
  id: string;
  nome: string;
  diasTrabalho: number;
  toleranciaDias: number;
  limiteFolgasVencidas: number;
  empresas: Array<{ id: string; razaoSocial: string; cnpj: string }>;
}

export interface RegraFolgaInput {
  nome: string;
  diasTrabalho: number;
  toleranciaDias: number;
  limiteFolgasVencidas: number;
}

/** Rodada 278: regras de folga do grupo, vinculadas aos CNPJs. */
export function listarRegrasFolga() {
  return api.get<RegraFolga[]>("/regras-folga").then((r) => r.data);
}
export function criarRegraFolga(input: RegraFolgaInput) {
  return api.post<RegraFolga>("/regras-folga", input).then((r) => r.data);
}
export function atualizarRegraFolga(id: string, input: Partial<RegraFolgaInput>) {
  return api.patch<RegraFolga>(`/regras-folga/${id}`, input).then((r) => r.data);
}
export function excluirRegraFolga(id: string) {
  return api.delete(`/regras-folga/${id}`).then((r) => r.data);
}
/** Vincula a regra ao CNPJ (cada CNPJ tem uma só); null desvincula. */
export function vincularRegraFolga(
  empresaId: string,
  regraFolgaId: string | null,
) {
  return api
    .patch(`/regras-folga/empresas/${empresaId}`, { regraFolgaId })
    .then((r) => r.data);
}
