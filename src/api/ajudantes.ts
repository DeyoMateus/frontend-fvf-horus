import { api } from "./client";
import type { Ajudante, PaginaAjudantes, StatusMotorista } from "./types";
import { baixarArquivo } from "../utils/baixarArquivo";

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

/** Rodada 491 (N17): baixa o espelho de ponto do ajudante em PDF. */
export async function baixarEspelhoAjudantePdf(
  id: string,
  nome: string,
  inicio: string,
  fim: string,
) {
  const resposta = await api.get(`/ajudantes/${id}/espelho/pdf`, {
    params: { inicio, fim },
    responseType: "blob",
  });
  baixarArquivo(new Blob([resposta.data], { type: "application/pdf" }), `espelho-ajudante-${nome.replace(/\s+/g, "-")}-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`);
}

export interface AlertaJornadaAbertaAjudante {
  ajudanteId: string;
  nome: string;
  empresa: string;
  inicio: string;
  minutosAbertos: number;
  limiteMin: number;
}

/** Rodada 493: ajudantes com jornada aberta alem do limite (so informa). */
export function getAlertasJornadaAbertaAjudantes() {
  return api
    .get<AlertaJornadaAbertaAjudante[]>("/ajudantes/alertas/jornada-aberta")
    .then((r) => r.data);
}

// Rodada 668: pontos do ajudante batidos com divergência de relógio (fila do gestor).
export interface AlertaPontoAjudante {
  id: string;
  ajudanteId: string;
  ajudanteNome: string;
  registroId: string;
  tipoEvento: string;
  flags: string[];
  horarioInformado: string;
  horaProvavel: string | null;
  horaProvavelFonte: string | null;
  tratadoEm: string | null;
  tratamentoObservacao: string | null;
  createdAt: string;
}

export function listarAlertasPontoAjudantes(tratado?: boolean) {
  return api
    .get<AlertaPontoAjudante[]>("/ajudantes/alertas-ponto/lista", {
      params: tratado === undefined ? undefined : { tratado },
    })
    .then((r) => r.data);
}

export function tratarAlertaPontoAjudante(alertaId: string, observacao: string) {
  return api
    .patch(`/ajudantes/alertas-ponto/${alertaId}/tratar`, { observacao })
    .then((r) => r.data);
}

export function corrigirHoraPontoAjudante(
  alertaId: string,
  horarioCorreto: string,
  observacao: string,
) {
  return api
    .patch(`/ajudantes/alertas-ponto/${alertaId}/corrigir-hora`, {
      horarioCorreto,
      observacao,
    })
    .then((r) => r.data);
}
