import { api } from "./client";
import type { Motorista, StatusMotorista, TecnologiaRastreador } from "./types";

// Espelha MotoristasController: rotas /motoristas.
// O GRUPO (tenant) nunca é enviado como parâmetro , o backend sempre
// deriva isso do próprio token JWT, pra nenhum usuário conseguir listar
// motoristas de outro grupo só trocando um parâmetro na chamada.
// empresaId (qual CNPJ do grupo) esse SIM é enviado ao criar , um grupo
// pode ter vários CNPJs, então é preciso dizer qual deles emprega este
// motorista (o backend confere que o CNPJ pertence ao grupo antes de
// aceitar, nunca confia ciegamente nisso).
export interface PaginaMotoristas {
  dados: Motorista[];
  total: number;
  page: number;
  pageSize: number;
}

// O backend agora pagina (empresas podem crescer pra milhares de
// motoristas) , pedimos o tamanho máximo de página (200) por padrão pra
// manter o comportamento atual das telas que esperam a lista completa;
// `total` fica disponível pra quem quiser mostrar "mostrando 200 de 350"
// e paginar de fato no futuro.
export function listMotoristas(
  page = 1,
  pageSize = 200,
  busca?: string,
  incluirExcluidos?: boolean,
) {
  return api
    .get<PaginaMotoristas>("/motoristas", {
      params: {
        page,
        pageSize,
        busca: busca || undefined,
        incluirExcluidos: incluirExcluidos || undefined,
      },
    })
    .then((r) => r.data);
}

export interface AlertaIntegridadeDispositivo {
  id: string;
  acao: string;
  entidadeId: string | null;
  detalhes: { flags?: string[]; deviceUuidUsado?: string } | null;
  createdAt: string;
}

export function listarAlertasIntegridadeDispositivo(motoristaId: string) {
  return api
    .get<
      AlertaIntegridadeDispositivo[]
    >(`/motoristas/${motoristaId}/alertas-integridade-dispositivo`)
    .then((r) => r.data);
}

export function getMotorista(id: string) {
  return api.get<Motorista>(`/motoristas/${id}`).then((r) => r.data);
}

export interface CreateMotoristaInput {
  nome: string;
  cpf: string;
  cnh: string;
  empresaId: string;
  /** Placa do veículo de tração , opcional no cadastro (formato antigo ABC1234 ou Mercosul ABC1D23). */
  placa?: string;
  idRastreador?: string;
  tecnologiaRastreador?: TecnologiaRastreador;
  /** Telefone de contato , obrigatório (Rodada 74), formato E.164 (ver TelefoneInput). */
  telefone: string;
}

export function createMotorista(input: CreateMotoristaInput) {
  return api.post<Motorista>("/motoristas", input).then((r) => r.data);
}

export function atualizarStatusMotorista(
  id: string,
  status: StatusMotorista,
  motivo?: string,
) {
  return api
    .patch<Motorista>(`/motoristas/${id}/status`, { status, motivo })
    .then((r) => r.data);
}

export interface AtualizarCadastroMotoristaInput {
  nome?: string;
  /** Formato E.164 (ver TelefoneInput). */
  telefone?: string;
}

/**
 * Edição dos dados cadastrais (Rodada 74) , de propósito só nome e
 * telefone. CPF/CNH não entram: são a âncora do hash genesis da
 * cadeia de jornada e o CPF também está gravado no certificado
 * digital já emitido no cadastro , ver comentário completo em
 * AtualizarCadastroMotoristaDto (backend).
 */
export function atualizarCadastroMotorista(
  id: string,
  input: AtualizarCadastroMotoristaInput,
) {
  return api.patch<Motorista>(`/motoristas/${id}`, input).then((r) => r.data);
}

/**
 * "Excluir cadastro" (Rodada 65) , NÃO apaga a linha do motorista no
 * banco, só tira da listagem normal do painel. Ver comentário completo
 * em MotoristasService.excluir (backend).
 */
export function excluirMotorista(id: string, motivo?: string) {
  return api
    .delete<Motorista>(`/motoristas/${id}`, { data: { motivo } })
    .then((r) => r.data);
}
