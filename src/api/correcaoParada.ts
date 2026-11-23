import { api } from "./client";
import type { MotivoParada } from "./types";

export interface CorrecaoMotivoParada {
  id: string;
  motoristaId: string;
  registroId: string;
  motivoAnterior: MotivoParada;
  motivoNovo: MotivoParada;
  observacaoNova: string | null;
  justificativa: string;
  createdAt: string;
  corrigidoPorNome: string | null;
}

export interface CorrigirMotivoParadaInput {
  motivoNovo: MotivoParada;
  observacao?: string;
  justificativa: string;
}

// Espelha CorrecaoParadaController: o registro original não muda; a correção mais recente é o motivo vigente.
export function listarCorrecoesDeParada(motoristaId: string) {
  return api
    .get<CorrecaoMotivoParada[]>(`/motoristas/${motoristaId}/correcoes-motivo-parada`)
    .then((r) => r.data);
}

export function corrigirMotivoDaParada(motoristaId: string, registroId: string, dados: CorrigirMotivoParadaInput) {
  return api
    .post(`/motoristas/${motoristaId}/paradas/${registroId}/correcao-motivo`, dados)
    .then((r) => r.data);
}
