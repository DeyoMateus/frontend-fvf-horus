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

/** Rodada 164: quem recebe alerta por WhatsApp (padrão: só a equipe de GR). */
export async function atualizarDestinatariosWhatsapp(
  usuarioId: string,
  input: { recebeWhatsappAlertas?: boolean; recebeWhatsappEquipeGr?: boolean },
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/usuarios/${usuarioId}/whatsapp-alertas`,
    input,
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

/** Rodada 297: exclusão lógica (o histórico do usuário continua gravado). */
export async function excluirUsuarioGrupo(grupoId: string, usuarioId: string) {
  const { data } = await superAdminApi.delete(
    `/super-admin/grupos/${grupoId}/usuarios/${usuarioId}`,
  );
  return data;
}

export async function atualizarRegimeBancoHorasSuperAdmin(
  empresaId: string,
  input: {
    regime: string;
    domingoFeriado: string;
    documento?: string;
    vigenciaInicio?: string;
    tetoMin?: number;
    fator?: number;
    razaoAtivo: boolean;
    motivo: string;
  },
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/empresas/${empresaId}/banco-horas-regime`,
    input,
  );
  return data;
}

export async function atualizarChaveLiberacaoSuperAdmin(
  empresaId: string,
  input: { chave: string; ligada: boolean; motivo: string },
) {
  const { data } = await superAdminApi.patch(
    `/super-admin/empresas/${empresaId}/chaves`,
    input,
  );
  return data as { alterada: boolean; chaves: import("./types").ChaveLiberacaoEstado[] };
}
