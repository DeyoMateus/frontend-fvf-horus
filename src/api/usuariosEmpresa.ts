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

export function atualizarLimitesEspera(input: LimitesEspera) {
  return api
    .patch<LimitesEspera & { padrao: LimitesEspera }>(
      "/usuarios-empresa/limites-espera",
      input,
    )
    .then((r) => r.data);
}
