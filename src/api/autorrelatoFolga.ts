import { api } from "./client";

export interface AutorrelatoFolga {
  id: string;
  motoristaId: string;
  data: string;
  observacao: string | null;
  createdAt: string;
}

export interface MotoristaSemInteracao {
  motoristaId: string;
  nome: string;
  diasSemInteracao: string[];
}

// Espelha AutorrelatoFolgaController , a criação é feita pelo próprio
// app do motorista (AutorrelatoFolgaMobileController), não pelo painel.
export function listarAutorrelatosFolga(motoristaId: string) {
  return api
    .get<AutorrelatoFolga[]>(`/motoristas/${motoristaId}/autorrelatos-folga`)
    .then((r) => r.data);
}

/** "Radar" de dias sem nenhum ponto batido e sem folga autorrelatada. `dias` é a janela pra trás (padrão 7, máx. 90). */
export function listarDiasSemInteracao(dias = 7) {
  return api
    .get<
      MotoristaSemInteracao[]
    >("/motoristas/relatorios/dias-sem-interacao", { params: { dias } })
    .then((r) => r.data);
}

export type TipoTratamentoDiaSemInteracao =
  | "FOLGA"
  | "FALTA"
  | "ATESTADO"
  | "OUTRO";

/** Trata um dia do radar (folga, falta, atestado ou outro). "Sem sinal/esquecimento" vai pelo tratamento de ponto. */
export function tratarDiaSemInteracao(
  motoristaId: string,
  input: {
    data: string;
    tipo: TipoTratamentoDiaSemInteracao;
    observacao: string;
  },
) {
  return api
    .post(`/motoristas/${motoristaId}/dias-sem-interacao/tratar`, input)
    .then((r) => r.data);
}
