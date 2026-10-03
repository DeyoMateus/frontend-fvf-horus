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
): Promise<SuperAdminLoginResponse> {
  const { data } = await superAdminApi.post<SuperAdminLoginResponse>(
    "/super-admin/auth/login",
    { email, senha },
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
