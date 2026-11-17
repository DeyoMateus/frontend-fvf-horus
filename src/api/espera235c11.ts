import { api } from "./client";

export type TipoEsperaConfirmada = "CARGA" | "DESCARGA" | "FISCALIZACAO_BARREIRA";
export type RespostaRequisito = "SIM" | "NAO" | "NAO_CONFIRMADO";

export const ROTULO_TIPO_ESPERA: Record<TipoEsperaConfirmada, string> = {
  CARGA: "Carregamento",
  DESCARGA: "Descarregamento",
  FISCALIZACAO_BARREIRA: "Fiscalização em barreira fiscal ou alfandegária",
};

export const ROTULO_RESPOSTA: Record<RespostaRequisito, string> = {
  SIM: "Sim",
  NAO: "Não",
  NAO_CONFIRMADO: "Não foi possível confirmar",
};

export interface ConfirmacaoEspera11 {
  id: string;
  motoristaId: string;
  inicioEspera: string;
  fimEspera: string;
  tipoEspera: TipoEsperaConfirmada;
  permanenciaObrigatoria: RespostaRequisito;
  condicoesAdequadas: RespostaRequisito;
  evidencia: string | null;
  substituiId: string | null;
  createdAt: string;
  confirmadoPorNome?: string | null;
  corrigidoPorOutroRegistro?: boolean;
  identificacao: string;
  resumo: {
    duracaoMin: number;
    duracaoSuperiorADuasHoras: boolean;
    requisitosRegistradosComoAtendidos: boolean;
    efeitoNaApuracao: "NENHUM";
  };
}

export interface CreateConfirmacaoEspera11Input {
  inicioEspera: string;
  fimEspera: string;
  tipoEspera: TipoEsperaConfirmada;
  permanenciaObrigatoria: RespostaRequisito;
  condicoesAdequadas: RespostaRequisito;
  evidencia?: string;
  substituiId?: string;
}

// Espelha Espera235c11Controller: registro informativo do art. 235-C §11, sem efeito na apuração.
export function listarEspera235c11(motoristaId: string) {
  return api
    .get<ConfirmacaoEspera11[]>(`/motoristas/${motoristaId}/espera-235c11`)
    .then((r) => r.data);
}

export function registrarEspera235c11(motoristaId: string, dados: CreateConfirmacaoEspera11Input) {
  return api
    .post<ConfirmacaoEspera11>(`/motoristas/${motoristaId}/espera-235c11`, dados)
    .then((r) => r.data);
}
