import { superAdminApi, setSuperAdminAccessToken } from "./superAdminClient";

export interface SuperAdminLoginResponse {
  accessToken: string;
  expiresIn: number;
}

// Espelha auth.ts, mas contra SuperAdminAuthController
// (/super-admin/auth/...) , rota e cookie totalmente separados do
// login do painel de grupo.
export async function loginSuperAdmin(
  email: string,
  senha: string,
  codigoMfa?: string,
): Promise<SuperAdminLoginResponse> {
  const { data } = await superAdminApi.post<SuperAdminLoginResponse>(
    "/super-admin/auth/login",
    { email, senha, ...(codigoMfa ? { codigoMfa } : {}) },
  );
  setSuperAdminAccessToken(data.accessToken);
  return data;
}

export async function logoutSuperAdmin(): Promise<void> {
  await superAdminApi.post("/super-admin/auth/logout");
  setSuperAdminAccessToken(null);
}

export async function esqueciSenhaSuperAdmin(email: string): Promise<void> {
  await superAdminApi.post("/super-admin/auth/esqueci-senha", { email });
}

export async function redefinirSenhaSuperAdmin(
  token: string,
  novaSenha: string,
): Promise<void> {
  await superAdminApi.post("/super-admin/auth/redefinir-senha", {
    token,
    novaSenha,
  });
}

// Rodada 384: MFA (TOTP) do próprio super admin.
export function obterEstadoMfaSuperAdmin() {
  return superAdminApi
    .get<{ mfaAtivo: boolean; codigosReservaRestantes: number; mfaValidoAte?: string | null; mfaExpirado?: boolean }>("/super-admin/auth/mfa/estado")
    .then((r) => r.data);
}

export function iniciarMfaSuperAdmin() {
  return superAdminApi
    .post<{ segredo: string; uri: string }>("/super-admin/auth/mfa/iniciar")
    .then((r) => r.data);
}

export function confirmarMfaSuperAdmin(codigo: string, validadeDias?: number) {
  return superAdminApi
    .post<{ codigosReserva: string[] }>("/super-admin/auth/mfa/confirmar", { codigo, validadeDias })
    .then((r) => r.data);
}

export function desativarMfaSuperAdmin(senha: string, codigo: string) {
  return superAdminApi
    .post("/super-admin/auth/mfa/desativar", { senha, codigo })
    .then(() => undefined);
}
