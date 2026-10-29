import { api } from './client';

// Espelha BancoHorasController (Rodada 37): /motoristas/:id/banco-horas.
export type TipoAjusteBancoHoras = 'COMPENSACAO' | 'PAGAMENTO' | 'CORRECAO_CREDITO' | 'CORRECAO_DEBITO';

export interface SaldoBancoHoras {
  ativo: boolean;
  creditoExtraMin: number;
  creditoCorrecaoMin: number;
  debitoMin: number;
  saldoMin: number;
}

export interface AjusteBancoHoras {
  id: string;
  motoristaId: string;
  tipo: TipoAjusteBancoHoras;
  minutos: number;
  data: string;
  observacao?: string | null;
  registradoPorUsuario?: { nome: string; email: string };
  createdAt: string;
}

export function getSaldoBancoHoras(motoristaId: string, inicio: string, fim: string) {
  return api.get<SaldoBancoHoras>(`/motoristas/${motoristaId}/banco-horas`, { params: { inicio, fim } }).then((r) => r.data);
}

export function listarAjustesBancoHoras(motoristaId: string) {
  return api.get<AjusteBancoHoras[]>(`/motoristas/${motoristaId}/banco-horas/ajustes`).then((r) => r.data);
}

export function registrarAjusteBancoHoras(
  motoristaId: string,
  input: { tipo: TipoAjusteBancoHoras; minutos: number; data: string; observacao?: string },
) {
  return api.post<AjusteBancoHoras>(`/motoristas/${motoristaId}/banco-horas/ajustes`, input).then((r) => r.data);
}

// ===== Rodada 379 (passo 31, interface): razão de lançamentos =====
export type TipoLancamentoBanco =
  | 'ABERTURA'
  | 'CREDITO_HORAS'
  | 'DEBITO_COMPENSACAO'
  | 'DEBITO_PAGAMENTO'
  | 'DEBITO_EXPIRACAO'
  | 'CORRECAO_CREDITO'
  | 'CORRECAO_DEBITO'
  | 'SNAPSHOT_FECHAMENTO';

export interface LancamentoBanco {
  id: string;
  sequencial: number;
  dataEvento: string;
  tipoDia: string;
  tipoLancamento: TipoLancamentoBanco;
  minutosBrutos: number;
  fator: string;
  minutosEquivalentes: number;
  saldoAposMin: number;
  venceEm: string | null;
  observacao: string | null;
  autorTipo: string;
}

export interface LoteBanco {
  id: string;
  venceEm: string | null;
  restanteMin: number;
}

export interface VencimentosRazao {
  saldoMin: number;
  lotes: LoteBanco[];
  vencidos: LoteBanco[];
  aVencer: LoteBanco[];
}

export interface VerificacaoRazao {
  cadeia: unknown;
  somaMin: number;
  saldoGravadoMin: number;
  conciliado: boolean;
}

const base = (id: string) => `/motoristas/${id}/banco-horas/razao`;

export const listarRazao = (id: string) => api.get<LancamentoBanco[]>(base(id)).then((r) => r.data);
export const vencimentosRazao = (id: string) => api.get<VencimentosRazao>(`${base(id)}/vencimentos`).then((r) => r.data);
export const verificarRazao = (id: string) => api.get<VerificacaoRazao>(`${base(id)}/verificar`).then((r) => r.data);
export const creditarPeriodoRazao = (id: string, inicio: string, fim: string) =>
  api.post(`${base(id)}/creditos/periodo`, { inicio, fim }).then((r) => r.data);
export const debitarRazao = (id: string, input: { tipo: 'COMPENSACAO' | 'PAGAMENTO'; minutos: number; data: string; observacao: string; chaveIdempotencia?: string }) =>
  api.post(`${base(id)}/debitos`, input).then((r) => r.data);
export const corrigirRazao = (id: string, input: { sentido: 'CREDITO' | 'DEBITO'; minutos: number; data: string; observacao: string }) =>
  api.post(`${base(id)}/correcoes`, input).then((r) => r.data);
export const expirarVencidosRazao = (id: string) => api.post(`${base(id)}/expirar-vencidos`).then((r) => r.data);
export const abrirRazao = (id: string, data: string) => api.post(`${base(id)}/abertura`, { data }).then((r) => r.data);
export const snapshotRazao = (id: string, data: string) => api.post(`${base(id)}/snapshot`, { data }).then((r) => r.data);

export interface ContestacaoBanco {
  id: string;
  lancamentoId: string;
  sequencial: number;
  dataEvento: string;
  tipoLancamento: TipoLancamentoBanco;
  minutosEquivalentes: number;
  texto: string | null;
  criadaEm: string;
  respondida: boolean;
}

/** F15: contestações do trabalhador sobre lançamentos do banco de horas. */
export const listarContestacoesBanco = (id: string) =>
  api.get<ContestacaoBanco[]>(`${base(id)}/contestacoes`).then((r) => r.data);
export const responderContestacaoBanco = (id: string, contestacaoId: string, texto: string) =>
  api.post(`${base(id)}/contestacoes/${contestacaoId}/resposta`, { texto }).then((r) => r.data);
