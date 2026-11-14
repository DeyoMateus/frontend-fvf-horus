import { api } from "./client";
import { baixarArquivo } from "../utils/baixarArquivo";

/** Rodada 712 (N529): fechamentos de periodo por motorista no painel. Espelha FechamentoPeriodoController. */
export interface FechamentoPeriodo {
  id: string;
  periodoInicio: string;
  periodoFim: string;
  versao: number;
  hashSnapshot: string;
  motivoReabertura: string | null;
  criadoPorId: string | null;
  criadoEm: string;
  /** Regra de cada trecho do periodo (null em fechamentos antigos, gravados antes da rodada 720). */
  regrasAplicadas: Array<{ de: string; ate: string; regraId: string | null; nome: string | null; versao: number | null }> | null;
}

export interface VerificacaoFechamento {
  id: string;
  versao: number;
  hashGravado: string;
  hashRecalculado: string;
  integro: boolean;
}

export interface DiferencaFechamento {
  campo: string;
  snapshot: unknown;
  vivo: unknown;
  diferenca: number | null;
}

export interface ComparacaoFechamento {
  fechamentoId: string;
  versao: number;
  periodoInicio: string;
  periodoFim: string;
  snapshotIntegro: boolean;
  igual: boolean;
  diferencas: DiferencaFechamento[];
}

export interface FecharPeriodoPayload {
  motoristaId: string;
  inicio: string;
  fim: string;
  motivo?: string;
  aceitarIncompleto?: boolean;
}

export const listarFechamentos = (motoristaId: string) =>
  api.get<FechamentoPeriodo[]>("/fechamentos-periodo", { params: { motoristaId } }).then((r) => r.data);

export const fecharPeriodo = (p: FecharPeriodoPayload) =>
  api.post("/fechamentos-periodo", p).then((r) => r.data);

export const verificarFechamento = (id: string) =>
  api.get<VerificacaoFechamento>(`/fechamentos-periodo/${id}/verificar`).then((r) => r.data);

export const compararFechamento = (id: string) =>
  api.get<ComparacaoFechamento>(`/fechamentos-periodo/${id}/comparar-apuracao-viva`).then((r) => r.data);

export async function baixarFechamentoPdf(id: string, nome: string) {
  const r = await api.get(`/fechamentos-periodo/${id}/pdf`, { responseType: "blob" });
  baixarArquivo(new Blob([r.data], { type: "application/pdf" }), nome);
}
