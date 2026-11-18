import type { FuncaoColaborador } from "./types";
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

/**
 * Busca TODAS as páginas (200 por vez), para telas que
 * precisam da frota inteira (seletores, filtros) não truncarem em silêncio.
 * Teto de 50 páginas (10.000 motoristas) como trava de segurança.
 */
export async function listarTodosMotoristas(
  busca?: string,
  incluirExcluidos?: boolean,
): Promise<PaginaMotoristas> {
  const primeira = await listMotoristas(1, 200, busca, incluirExcluidos);
  const paginas = Math.min(
    50,
    Math.ceil(primeira.total / (primeira.pageSize || 200)),
  );
  // As demais páginas em paralelo, de 5 em 5 (antes uma por vez).
  const dados = [...primeira.dados];
  for (let pg = 2; pg <= paginas; pg += 5) {
    const lote = [];
    for (let p = pg; p < pg + 5 && p <= paginas; p++) {
      lote.push(listMotoristas(p, 200, busca, incluirExcluidos));
    }
    for (const pagina of await Promise.all(lote)) dados.push(...pagina.dados);
  }
  return { ...primeira, dados };
}

/**
 * Lista de colaboradores ativos (sem busca e sem excluídos) para seletores e filtros,
 * guardada em memória por 60 s. Várias telas (e componentes da mesma tela) pedem a mesma lista;
 * quem chega durante a busca espera a mesma resposta. Limpa ao entrar, ao sair e a cada alteração
 * de cadastro feita por este painel. A tela de Colaboradores continua lendo sem cache.
 */
const VALIDADE_CACHE_COLABORADORES_MS = 60_000;
let cacheColaboradores: { expiraEm: number; valor: Promise<Motorista[]> } | null = null;

export function listarColaboradoresParaSeletor(): Promise<Motorista[]> {
  const agora = Date.now();
  if (cacheColaboradores && cacheColaboradores.expiraEm > agora) return cacheColaboradores.valor;
  const entrada = {
    expiraEm: agora + VALIDADE_CACHE_COLABORADORES_MS,
    valor: listarTodosMotoristas().then((r) => r.dados),
  };
  cacheColaboradores = entrada;
  entrada.valor.catch(() => {
    if (cacheColaboradores === entrada) cacheColaboradores = null;
  });
  return entrada.valor;
}

export function invalidarCacheColaboradores(): void {
  cacheColaboradores = null;
}

function aposAlterar<T>(r: T): T {
  invalidarCacheColaboradores();
  return r;
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
  /** Obrigatória só para motorista. */
  cnh?: string;
  funcao?: FuncaoColaborador;
  empresaId: string;
  /** Placa do veículo de tração , opcional no cadastro (formato antigo ABC1234 ou Mercosul ABC1D23). */
  placa?: string;
  idRastreador?: string;
  tecnologiaRastreador?: TecnologiaRastreador;
  /** Telefone de contato , obrigatório, formato E.164 (ver TelefoneInput). */
  telefone: string;
}

export function createMotorista(input: CreateMotoristaInput) {
  return api.post<Motorista>("/motoristas", input).then((r) => aposAlterar(r.data));
}

export function atualizarStatusMotorista(
  id: string,
  status: StatusMotorista,
  motivo?: string,
) {
  return api
    .patch<Motorista>(`/motoristas/${id}/status`, { status, motivo })
    .then((r) => aposAlterar(r.data));
}

export interface AtualizarCadastroMotoristaInput {
  nome?: string;
  /** Formato E.164 (ver TelefoneInput). */
  telefone?: string;
  /** CNPJ (empresa do grupo) ao qual o motorista fica vinculado. */
  empresaId?: string;
}

/**
 * Edição dos dados cadastrais , de propósito só nome e
 * telefone. CPF/CNH não entram: são a âncora do hash genesis da
 * cadeia de jornada e o CPF também está gravado no certificado
 * digital já emitido no cadastro , ver comentário completo em
 * AtualizarCadastroMotoristaDto (backend).
 */
export function atualizarCadastroMotorista(
  id: string,
  input: AtualizarCadastroMotoristaInput,
) {
  return api.patch<Motorista>(`/motoristas/${id}`, input).then((r) => aposAlterar(r.data));
}

/**
 * "Excluir cadastro" , NÃO apaga a linha do motorista no
 * banco, só tira da listagem normal do painel. Ver comentário completo
 * em MotoristasService.excluir (backend).
 */
/** Reativa um cadastro excluido (volta ATIVO). O servidor recusa se CPF/CNH foi reutilizado. */
export function reativarMotorista(id: string) {
  return api.post<Motorista>(`/motoristas/${id}/reativar`).then((r) => aposAlterar(r.data));
}

export function excluirMotorista(id: string, motivo: string) {
  return api
    .delete<Motorista>(`/motoristas/${id}`, { data: { motivo } })
    .then((r) => aposAlterar(r.data));
}

/** Rescisão (desligamento) pela ficha: grava a data, inativa o cadastro e mantém todo o histórico. */
export function rescindirMotorista(id: string, dataDesligamento: string, motivo: string) {
  return api
    .post<Motorista>(`/motoristas/${id}/rescisao`, { dataDesligamento, motivo })
    .then((r) => aposAlterar(r.data));
}

/** Readmissão de quem teve a rescisão registrada: volta a ATIVO e encerra o desligamento. */
export function readmitirMotorista(id: string, dataReadmissao: string, motivo: string) {
  return api
    .post<Motorista>(`/motoristas/${id}/readmissao`, { dataReadmissao, motivo })
    .then((r) => aposAlterar(r.data));
}
