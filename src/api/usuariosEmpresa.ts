import { api } from "./client";
import type { UpdatePerfilProprioInput, UsuarioEmpresaListado } from "./types";

// Espelha UsuariosEmpresaController: rotas /usuarios-empresa, sempre
// dentro do PRÓPRIO grupo (o backend deriva do token). Rodada 110 ,
// cadastrar um usuário novo saiu daqui: segue sendo feito pelo super
// admin da plataforma (ver api/superAdmin.ts).
export function listUsuariosEmpresa() {
  return api
    .get<UsuarioEmpresaListado[]>("/usuarios-empresa")
    .then((r) => r.data);
}

export function atualizarStatusUsuarioEmpresa(id: string, ativo: boolean) {
  return api
    .patch<UsuarioEmpresaListado>(`/usuarios-empresa/${id}/status`, { ativo })
    .then((r) => r.data);
}

// Rodada 385: o ADMIN liga/desliga "aprovar ajuste" e "aceitar divergência" de outro usuário.
export function atualizarPermissoesUsuario(
  id: string,
  permissoes: { podeAprovarAjuste?: boolean; podeAceitarDivergencia?: boolean },
) {
  return api.patch(`/usuarios-empresa/${id}/permissoes`, permissoes).then((r) => r.data);
}

// ===== Meu perfil (Rodada 38) =====
// O próprio usuário vê/edita o PRÓPRIO cadastro aqui.

export function obterMeuPerfil() {
  return api
    .get<UsuarioEmpresaListado>("/usuarios-empresa/me")
    .then((r) => r.data);
}

export function atualizarMeuPerfil(input: UpdatePerfilProprioInput) {
  return api
    .patch<UsuarioEmpresaListado>("/usuarios-empresa/me", input)
    .then((r) => r.data);
}

// ===== Limites de espera do grupo (Rodada 174) =====
export interface LimitesEspera {
  infoMin: number;
  atencaoMin: number;
  criticoMin: number;
}

export function obterLimitesEspera() {
  return api
    .get<LimitesEspera & { padrao: LimitesEspera }>(
      "/usuarios-empresa/limites-espera",
    )
    .then((r) => r.data);
}

// ===== Limites de "Aguardando documentação" do grupo (Rodada 341) =====
export function obterLimitesDocumentacao() {
  return api
    .get<LimitesEspera & { padrao: LimitesEspera }>(
      "/usuarios-empresa/limites-documentacao",
    )
    .then((r) => r.data);
}

export function atualizarLimitesDocumentacao(input: LimitesEspera) {
  return api
    .patch<LimitesEspera & { padrao: LimitesEspera }>(
      "/usuarios-empresa/limites-documentacao",
      input,
    )
    .then((r) => r.data);
}

export function atualizarLimitesEspera(
  input: LimitesEspera & { motivo?: string; referenciaCct?: string },
) {
  return api
    .patch<LimitesEspera & { padrao: LimitesEspera }>(
      "/usuarios-empresa/limites-espera",
      input,
    )
    .then((r) => r.data);
}

// ===== Rodada 347 =====
export function alterarMinhaSenha(senhaAtual: string, novaSenha: string) {
  return api
    .patch<{ ok: boolean }>("/usuarios-empresa/me/senha", {
      senhaAtual,
      novaSenha,
    })
    .then((r) => r.data);
}

export function criarGestor(input: {
  nome: string;
  email: string;
  senha: string;
  telefoneWhatsapp?: string;
}) {
  return api
    .post<UsuarioEmpresaListado>("/usuarios-empresa", input)
    .then((r) => r.data);
}

// ===== Rodada 418 (N75): empresas (CNPJ) de que o usuário recebe alertas =====
export interface EmpresasDoUsuario {
  usuarioId: string;
  /** false = sem restrição: recebe de todas as empresas do grupo. */
  restrito: boolean;
  empresaIds: string[];
  empresas: { id: string; razaoSocial: string; cnpj: string }[];
}

export function obterEmpresasDoUsuario(id: string) {
  return api
    .get<EmpresasDoUsuario>(`/usuarios-empresa/${id}/empresas`)
    .then((r) => r.data);
}

export function definirEmpresasDoUsuario(id: string, empresaIds: string[]) {
  return api
    .put<{ usuarioId: string; restrito: boolean; empresaIds: string[] }>(
      `/usuarios-empresa/${id}/empresas`,
      { empresaIds },
    )
    .then((r) => r.data);
}
