import { api } from "./client";
import type { RegimeBancoHorasEmpresa } from "./types";

// Espelha ConfiguracaoApuracaoController (rodada 692): apuração, alertas e regime do banco de horas
// são decisão da própria empresa. Só ADMIN altera; GESTOR consulta.
export interface ChaveApuracaoEstado {
  chave: string;
  rotulo: string;
  descricao: string;
  atencao: string | null;
  ligada: boolean;
}

export interface ConfiguracaoApuracaoEmpresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  ativo: boolean;
  chaves: ChaveApuracaoEstado[];
  bancoHoras: RegimeBancoHorasEmpresa;
}

export function listarConfiguracaoApuracao() {
  return api.get<ConfiguracaoApuracaoEmpresa[]>("/configuracao-apuracao").then((r) => r.data);
}

export function atualizarChaveApuracao(
  empresaId: string,
  input: { chave: string; ligada: boolean; motivo: string },
) {
  return api
    .patch<{ alterada: boolean; empresa: ConfiguracaoApuracaoEmpresa }>(
      `/configuracao-apuracao/${empresaId}/chave`,
      input,
    )
    .then((r) => r.data);
}

export function atualizarBancoHorasEmpresa(
  empresaId: string,
  input: {
    regime: string;
    domingoFeriado: string;
    documento?: string;
    vigenciaInicio?: string;
    tetoMin?: number;
    fator?: number;
    motivo: string;
  },
) {
  return api
    .patch<ConfiguracaoApuracaoEmpresa["bancoHoras"]>(`/configuracao-apuracao/${empresaId}/banco-horas`, input)
    .then((r) => r.data);
}
