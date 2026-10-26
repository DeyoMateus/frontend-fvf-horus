import { api } from "./client";

// Rodada 378: espelha DadosContratoController (Portaria 671, art. 84).
export interface HorarioContratual {
  id: string;
  codigo: string;
  tipoJornada: string;
  entradaMin: number | null;
  saidaMin: number | null;
  intervaloMin: number;
  cargaSemanalMin: number;
  ativo: boolean;
}

export interface ContratoMotoristaInput {
  dataAdmissao?: string | null;
  cargo?: string | null;
  matricula?: string | null;
  matriculaEsocial?: string | null;
  horarioContratualId?: string | null;
}

export function listarHorariosContratuais(empresaId: string) {
  return api
    .get<HorarioContratual[]>(`/dados-contrato/empresas/${empresaId}/horarios`)
    .then((r) => r.data);
}

export function criarHorarioContratual(
  empresaId: string,
  input: {
    codigo: string;
    tipoJornada: string;
    entradaMin?: number;
    saidaMin?: number;
    intervaloMin?: number;
    cargaSemanalMin: number;
  },
) {
  return api
    .post<HorarioContratual>(`/dados-contrato/empresas/${empresaId}/horarios`, input)
    .then((r) => r.data);
}

export function atualizarContratoMotorista(motoristaId: string, input: ContratoMotoristaInput) {
  return api.patch(`/dados-contrato/motoristas/${motoristaId}`, input).then((r) => r.data);
}

export function atualizarEstabelecimento(
  empresaId: string,
  input: { caepfCno?: string | null; enderecoEstabelecimento?: string | null },
) {
  return api.patch(`/dados-contrato/empresas/${empresaId}`, input).then((r) => r.data);
}

// Rodada 389: importação em lote (CSV lido no navegador).
export interface LinhaContratoImportacao {
  cpf: string;
  dataAdmissao?: string;
  cargo?: string;
  matricula?: string;
  matriculaEsocial?: string;
  codigoHorario?: string;
}

export interface ResultadoImportacaoContrato {
  total: number;
  atualizados: number;
  erros: { linha: number; cpf: string; motivo: string }[];
}

export function importarContratos(linhas: LinhaContratoImportacao[]) {
  return api
    .post<ResultadoImportacaoContrato>("/dados-contrato/motoristas/importar", { linhas })
    .then((r) => r.data);
}
