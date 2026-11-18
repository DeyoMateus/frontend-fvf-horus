import { api } from "./client";

// Espelha RetencaoController: rotas /retencao (somente ADMIN).
export interface ParametrosRetencaoInput {
  retencaoRegistroAnos?: number | null;
  retencaoPosDesligamentoMeses?: number | null;
  retencaoMargemMeses?: number | null;
}

export interface RetencaoMotoristaInput {
  dataDesligamento?: string | null;
  bloqueado?: boolean;
  processo?: string;
  /** Obrigatória (mín. 10 caracteres) ao mudar o desligamento ou remover o bloqueio. */
  justificativa?: string;
}

export interface LinhaRelatorioRetencao {
  motoristaId: string;
  nome: string;
  status: string;
  dataDesligamento?: string | null;
  bloqueado: boolean;
  processo?: string | null;
  prazoPosDesligamentoVencido: boolean;
  registrosElegiveisAoExpurgo: number;
}

export interface RelatorioRetencao {
  geradoEm: string;
  somenteLeitura: boolean;
  aviso: string;
  totalElegiveis: number;
  motoristas: LinhaRelatorioRetencao[];
}

export function obterRelatorioRetencao() {
  return api.get<RelatorioRetencao>("/retencao/relatorio").then((r) => r.data);
}

export function atualizarParametrosRetencao(
  empresaId: string,
  input: ParametrosRetencaoInput,
) {
  return api
    .patch(`/retencao/empresas/${empresaId}`, input)
    .then((r) => r.data);
}

export function atualizarRetencaoMotorista(
  motoristaId: string,
  input: RetencaoMotoristaInput,
) {
  return api
    .patch(`/retencao/motoristas/${motoristaId}`, input)
    .then((r) => r.data);
}

/** Dados que ja passaram do prazo fixo do sistema, por tipo. */
export interface VencidosRetencao {
  prazos: Record<string, string>;
  GPS_PERIODICO: number;
  ANEXOS: number;
  APARELHOS: number;
}

export function obterVencidosRetencao() {
  return api.get<VencidosRetencao>("/retencao/vencidos").then((r) => r.data);
}

export function eliminarVencidosRetencao() {
  return api
    .post<{ GPS_PERIODICO: number; ANEXOS: number; APARELHOS: number; motoristas: number }>(
      "/retencao/vencidos/eliminar",
    )
    .then((r) => r.data);
}
