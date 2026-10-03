import axios, { AxiosError } from "axios";

// Espelha client.ts, mas para a área do super admin: instância de
// axios TOTALMENTE separada, com seu próprio access token em memória e
// seu próprio ciclo de refresh , nunca compartilha token com o `api`
// do painel de grupo (ver comentário completo em client.ts e em
// SuperAdminAuthContext.tsx). O cookie httpOnly usado pelo refresh
// aqui é outro (`fvf_horus_super_admin_refresh`, path
// `/super-admin/auth`), setado pelo backend , ver
// backend/src/common/cookies/refresh-cookie.util.ts.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const HEADER_ANTI_CSRF = "x-fvf-horus-client";

let superAdminAccessToken: string | null = null;

export function setSuperAdminAccessToken(token: string | null) {
  superAdminAccessToken = token;
}

export const superAdminApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { [HEADER_ANTI_CSRF]: "1" },
});

superAdminApi.interceptors.request.use((config) => {
  if (superAdminAccessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${superAdminAccessToken}`;
  }
  return config;
});

let refrescando: Promise<string | null> | null = null;

/** Espelha tentarRefresh de client.ts, mas contra /super-admin/auth/refresh. */
export async function tentarRefreshSuperAdmin(): Promise<string | null> {
  if (!refrescando) {
    refrescando = axios
      .post(
        `${API_URL}/super-admin/auth/refresh`,
        {},
        { withCredentials: true, headers: { [HEADER_ANTI_CSRF]: "1" } },
      )
      .then((resp) => {
        setSuperAdminAccessToken(resp.data.accessToken);
        return resp.data.accessToken as string;
      })
      .catch(() => {
        setSuperAdminAccessToken(null);
        return null;
      })
      .finally(() => {
        refrescando = null;
      });
  }
  return refrescando;
}

superAdminApi.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !(original as { _retry?: boolean })._retry
    ) {
      (original as { _retry?: boolean })._retry = true;
      const novoAccessToken = await tentarRefreshSuperAdmin();
      if (novoAccessToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${novoAccessToken}`;
        return superAdminApi(original);
      }
    }
    return Promise.reject(error);
  },
);
