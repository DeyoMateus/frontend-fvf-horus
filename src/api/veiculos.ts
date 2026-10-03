import { api } from "./client";
import type { TecnologiaRastreador } from "./types";

export interface VeiculoVinculado {
  id: string;
  motoristaId: string;
  placa: string;
  idRastreador: string | null;
  tecnologiaRastreador: TecnologiaRastreador | null;
  atualizadoPorTipo: "MOTORISTA" | "USUARIO_EMPRESA" | "SISTEMA";
  atualizadoPorId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AtualizarVeiculoInput {
  placa: string;
  idRastreador?: string;
  tecnologiaRastreador?: TecnologiaRastreador;
}

export interface TrocaVeiculoAuditoria {
  id: string;
  actorType: "MOTORISTA" | "USUARIO_EMPRESA" | "SISTEMA";
  actorId: string | null;
  detalhes: {
    placaAnterior: string | null;
    placaNova: string;
    idRastreador: string | null;
  } | null;
  createdAt: string;
}

// Espelha VeiculosController: rotas /motoristas/:id/veiculo (painel).
export function statusVeiculo(motoristaId: string) {
  return api
    .get<
      VeiculoVinculado | { vinculado: false }
    >(`/motoristas/${motoristaId}/veiculo`)
    .then((r) => r.data);
}

export function atualizarVeiculo(
  motoristaId: string,
  input: AtualizarVeiculoInput,
) {
  return api
    .put<VeiculoVinculado>(`/motoristas/${motoristaId}/veiculo`, input)
    .then((r) => r.data);
}

/** Histórico de trocas de placa feitas pelo próprio motorista (ou pelo painel) , o alerta pro gestor. */
export function listarTrocasVeiculo(motoristaId: string) {
  return api
    .get<TrocaVeiculoAuditoria[]>(`/motoristas/${motoristaId}/veiculo/trocas`)
    .then((r) => r.data);
}
