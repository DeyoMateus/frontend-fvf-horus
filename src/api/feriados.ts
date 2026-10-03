import { api } from "./client";
import type { Feriado } from "./types";

// Espelha FeriadosController: rotas /feriados. Cadastro de feriados
// aceitos pela empresa (Rodada 29) , o RH decide, cidade por cidade,
// o que conta como feriado (e se paga com percentual equivalente ao
// domingo, ou não). Vale para o grupo inteiro por padrão, ou só para
// um CNPJ específico quando `empresaId` é informado.
export function listFeriados() {
  return api.get<Feriado[]>("/feriados").then((r) => r.data);
}

export type FeriadoInput = {
  data: string;
  descricao: string;
  empresaId?: string;
  pagoComoDomingo?: boolean;
};

export function createFeriado(input: FeriadoInput) {
  return api.post<Feriado>("/feriados", input).then((r) => r.data);
}

export function updateFeriado(
  id: string,
  input: Partial<FeriadoInput> & { ativo?: boolean },
) {
  return api.patch<Feriado>(`/feriados/${id}`, input).then((r) => r.data);
}

// Nunca apaga de verdade , só desativa (arquivo morto, mesmo princípio de RegraSindical/StatusMotorista).
export function desativarFeriado(id: string) {
  return api.delete<Feriado>(`/feriados/${id}`).then((r) => r.data);
}
