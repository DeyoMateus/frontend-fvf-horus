import { api } from "./client";
import type { RegraSindical } from "./types";

// Espelha RegrasSindicaisController: rotas /regras-sindicais. CCT/ACT do
// setor de transporte, cadastrada pelo grupo e vinculável a um ou mais
// CNPJs (ver api/empresas.ts#vincularRegraSindical).
export function listRegrasSindicais() {
  return api.get<RegraSindical[]>("/regras-sindicais").then((r) => r.data);
}

export type RegraSindicalInput = Partial<
  Omit<RegraSindical, "id" | "grupoId" | "createdAt" | "updatedAt" | "empresas">
> & { nome: string };

export function createRegraSindical(input: RegraSindicalInput) {
  return api
    .post<RegraSindical>("/regras-sindicais", input)
    .then((r) => r.data);
}

export function updateRegraSindical(
  id: string,
  input: Partial<RegraSindicalInput>,
) {
  return api
    .patch<RegraSindical>(`/regras-sindicais/${id}`, input)
    .then((r) => r.data);
}

// Nunca apaga de verdade , só desativa (arquivo morto, mesmo princípio do StatusMotorista).
export function desativarRegraSindical(id: string) {
  return api
    .delete<RegraSindical>(`/regras-sindicais/${id}`)
    .then((r) => r.data);
}
