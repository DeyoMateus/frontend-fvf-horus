import { api } from "./client";
import type { Empresa } from "./types";
import { baixarArquivo } from "../utils/baixarArquivo";

// Espelha EmpresasController: rotas /empresas.
// Um grupo pode ter mais de um CNPJ (Empresa) sob o mesmo login , esta
// lista é sempre a do GRUPO de quem está autenticado (o backend deriva
// isso do token JWT, nunca de um parâmetro que o cliente poderia mandar).
export function listEmpresas() {
  return api.get<Empresa[]>("/empresas").then((r) => r.data);
}

export interface CreateEmpresaInput {
  razaoSocial: string;
  cnpj: string;
}

// Adiciona mais um CNPJ ao MESMO grupo (não cria grupo novo).
export function createEmpresa(input: CreateEmpresaInput) {
  return api.post<Empresa>("/empresas", input).then((r) => r.data);
}

export interface DadosGrupo {
  razaoSocial: string;
  cnpj: string | null;
}

// Empresa mae do grupo (nome + CNPJ da matriz), usada no cabecalho do painel.
export function obterDadosGrupo() {
  return api.get<DadosGrupo>("/empresas/grupo").then((r) => r.data);
}

export function atualizarEmpresa(
  id: string,
  input: Partial<CreateEmpresaInput>,
) {
  return api.patch<Empresa>(`/empresas/${id}`, input).then((r) => r.data);
}

export function excluirEmpresa(id: string) {
  return api.delete(`/empresas/${id}`).then((r) => r.data);
}

// Vincula (ou desvincula, passando null) a CCT/ACT deste CNPJ.
export function vincularRegraSindical(
  empresaId: string,
  regraSindicalId: string | null,
) {
  return api
    .patch<Empresa>(`/empresas/${empresaId}/regra-sindical`, {
      regraSindicalId,
    })
    .then((r) => r.data);
}

/**
 * AFD oficial (Portaria MTP 671/2021) do período , arquivo texto de
 * largura fixa (ISO-8859-1), pra entregar a um fiscal do trabalho.
 * Precisa saber qual CNPJ (a Portaria exige um arquivo por empresa).
 */
export async function baixarAfd(
  empresaId: string,
  inicio: string,
  fim: string,
) {
  const resposta = await api.get("/empresas/afd", {
    params: { empresaId, inicio, fim },
    responseType: "blob",
  });
  // O backend já decide o nome oficial do arquivo (AFD<INPI><CNPJ>REP_P.txt),
  // mas o header Content-Disposition não é lido aqui por simplicidade ,
  // um nome genérico com o período já é suficiente pro usuário entregar.
  baixarArquivo(
    new Blob([resposta.data], { type: "text/plain" }),
    `afd-${empresaId}-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.txt`,
  );
}
