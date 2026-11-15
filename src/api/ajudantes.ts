import { api } from "./client";
import type { Ajudante, PaginaAjudantes } from "./types";
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

export function getAjudante(id: string) {
  return api.get<Ajudante>(`/ajudantes/${id}`).then((r) => r.data);
}

export interface EventoEspelhoAjudante {
  tipoEvento: string;
  timestampEvento: string;
  flagsConfianca?: string[];
  relogioIncerto?: boolean;
}

export interface JornadaEspelhoAjudante {
  inicio: string;
  fim: string | null;
  aberta: boolean;
  duracaoMin: number;
  descansoMin: number;
  carregamentoMin: number;
  descargaMin: number;
  trabalhadoMin: number;
  eventos: EventoEspelhoAjudante[];
  sinais: string[];
}

export interface TotaisEspelhoAjudante {
  jornadas: number;
  duracaoMin: number;
  descansoMin: number;
  carregamentoMin: number;
  descargaMin: number;
  trabalhadoMin: number;
}

export interface EspelhoAjudante {
  jornadas: JornadaEspelhoAjudante[];
  totais: TotaisEspelhoAjudante;
  alertasPendentes?: number;
}

/** Espelho em JSON (o mesmo do PDF) para a aba Registros da ficha. */
export function obterEspelhoAjudante(id: string, inicio: string, fim: string) {
  return api
    .get<EspelhoAjudante>(`/ajudantes/${id}/espelho`, { params: { inicio, fim } })
    .then((r) => r.data);
}

/** Rodada 743: integridade da cadeia do cadastro antigo de ajudante. */
export interface IntegridadeAjudante {
  valido: boolean;
  totalRegistros: number;
  quebras: { sequencial: number; motivo: string }[];
  verificadoEm: string;
}

export function verificarIntegridadeAjudante(id: string) {
  return api.get<IntegridadeAjudante>(`/ajudantes/${id}/integridade`).then((r) => r.data);
}
