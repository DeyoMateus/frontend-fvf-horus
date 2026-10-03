import { superAdminApi } from "./superAdminClient";
import type {
  CreateEmpresaMaeInput,
  CreateUsuarioGrupoInput,
  GrupoDetalhe,
  GrupoResumo,
  UpdateEmpresaInput,
  UpdateGrupoInput,
  UpdateUsuarioSuperAdminInput,
} from "./types";

// Espelha SuperAdminController: POST /super-admin/grupos (provisiona
// empresa mãe + primeiro CNPJ + primeiro ADMIN), GET /super-admin/grupos
// (visão geral pro dashboard) e GET /super-admin/grupos/:id (detalhe).
export async function criarEmpresaMae(input: CreateEmpresaMaeInput) {
  const { data } = await superAdminApi.post("/super-admin/grupos", input);
  return data;
}

export async function listarGrupos(): Promise<GrupoResumo[]> {
  const { data } = await superAdminApi.get<GrupoResumo[]>(
    "/super-admin/grupos",
  );
  return data;
}

export async function obterGrupo(grupoId: string): Promise<GrupoDetalhe> {
  const { data } = await superAdminApi.get<GrupoDetalhe>(
    `/super-admin/grupos/${grupoId}`,
  );
  return data;
}

// Edição de cadastros já criados (Rodada 32) , PATCH /super-admin/grupos/:id,
// /super-admin/empresas/:id, /super-admin/empresas/:id/status e /super-admin/usuarios/:id.
export async function atualizarGrupo(grupoId: string, input: UpdateGrupoInput) {
  const { data } = await superAdminApi.patch(
    `/super-admin/grupos/${grupoId}`,
    input,
  );
  return data;
}

export async function atualizarEmpresaSuperAdmin(
  empresaId: string,
  input: UpdateEmpresaInput,
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/empresas/${empresaId}`,
    input,
  );
  return data;
}

export async function atualizarStatusEmpresaSuperAdmin(
  empresaId: string,
  ativo: boolean,
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/empresas/${empresaId}/status`,
    { ativo },
  );
  return data;
}

export async function atualizarUsuarioSuperAdmin(
  usuarioId: string,
  input: UpdateUsuarioSuperAdminInput,
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/usuarios/${usuarioId}`,
    input,
  );
  return data;
}

// Rodada 38: criar/ativar-desativar funcionário de um grupo já
// existente (movido pro super admin , ver comentário de CreateUsuarioGrupoDto).
export async function criarUsuarioGrupo(
  grupoId: string,
  input: CreateUsuarioGrupoInput,
) {
  const { data } = await superAdminApi.post(
    `/super-admin/grupos/${grupoId}/usuarios`,
    input,
  );
  return data;
}

export async function atualizarStatusUsuarioGrupo(
  grupoId: string,
  usuarioId: string,
  ativo: boolean,
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/grupos/${grupoId}/usuarios/${usuarioId}/status`,
    { ativo },
  );
  return data;
}
