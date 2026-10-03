import axios, { AxiosError } from "axios";

// Mesma lógica de tokens do backend (AuthModule): access token de vida
// curta (15 min) no header Authorization, guardado só em memória (nunca
// em localStorage/sessionStorage). O refresh token deixou de viver no
// JS: é um cookie httpOnly setado pelo próprio backend (ver
// backend/src/common/cookies/refresh-cookie.util.ts) , nenhum código
// aqui consegue ler o valor dele, só o navegador o envia
// automaticamente em /auth/refresh e /auth/logout. Isso é de propósito:
// um XSS nesta aplicação (hoje não existe nenhum conhecido) não
// consegue mais roubar uma sessão de 7 dias, só o access token de 15
// min que já estiver em memória no momento do ataque.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Header que identifica a chamada como vinda deste próprio frontend ,
// mitigação de CSRF pros endpoints que dependem do cookie (ver o
// comentário completo em refresh-cookie.util.ts no backend). Um site
// de terceiro não consegue mandar este header sem cair no preflight de
// CORS, que o backend rejeita pra origens fora de CORS_ORIGINS.
const HEADER_ANTI_CSRF = "x-fvf-horus-client";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { [HEADER_ANTI_CSRF]: "1" },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refrescando: Promise<string | null> | null = null;

/**
 * Exportado para o AuthProvider tentar restaurar a sessão ao abrir o
 * app (F5). Não há mais como checar "existe um refresh token?" antes
 * de chamar , o cookie é httpOnly, invisível ao JS de propósito , então
 * sempre tenta, e trata a falha (401, sem cookie nenhum) como "não
 * havia sessão", silenciosamente.
 */
export async function tentarRefresh(): Promise<string | null> {
  if (!refrescando) {
    refrescando = axios
      .post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true, headers: { [HEADER_ANTI_CSRF]: "1" } },
      )
      .then((resp) => {
        setAccessToken(resp.data.accessToken);
        return resp.data.accessToken as string;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refrescando = null;
      });
  }
  return refrescando;
}

// Se o access token expirou (401), tenta renovar uma vez com o refresh
// token antes de desistir e mandar de volta pro login.
api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !(original as { _retry?: boolean })._retry
    ) {
      (original as { _retry?: boolean })._retry = true;
      const novoAccessToken = await tentarRefresh();
      if (novoAccessToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${novoAccessToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);
