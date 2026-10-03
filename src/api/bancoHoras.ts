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
