import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

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
import { API_URL } from "./apiUrl";

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
  // Rodada 501 (N197): nenhuma chamada fica pendurada para sempre.
  timeout: 120_000,
  withCredentials: true,
  headers: { [HEADER_ANTI_CSRF]: "1" },
});

// Rodada 637: GETs IDENTICOS feitos ao mesmo tempo (ex.: o sino de notificacoes e a tela pedindo os
// mesmos alertas ao abrir) compartilham uma unica chamada ao servidor. Quem chega depois recebe uma
// COPIA dos dados, para um nao alterar a lista do outro. Fora disso nada muda: chamadas com cancelamento
// (signal) ou arquivo (blob/arraybuffer) seguem sozinhas, e o compartilhamento termina quando a
// resposta chega (nao ha cache).
const getOriginal = api.get.bind(api) as typeof api.get;
const getsEmVoo = new Map<string, Promise<AxiosResponse<unknown>>>();

function copiarDados<T>(dados: T): T {
  try {
    return typeof structuredClone === "function" ? structuredClone(dados) : dados;
  } catch {
    return dados;
  }
}

api.get = ((url: string, config?: AxiosRequestConfig) => {
  if (
    config?.signal ||
    config?.responseType === "blob" ||
    config?.responseType === "arraybuffer" ||
    config?.onDownloadProgress
  ) {
    return getOriginal(url, config);
  }
  const chave = JSON.stringify([
    api.defaults.baseURL ?? "",
    url,
    config?.params ?? null,
    config?.headers ?? null,
  ]);
  const emVoo = getsEmVoo.get(chave);
  if (emVoo) {
    return emVoo.then((resposta) => ({ ...resposta, data: copiarDados(resposta.data) }));
  }
  const promessa = getOriginal(url, config).finally(() => {
    getsEmVoo.delete(chave);
  }) as Promise<AxiosResponse<unknown>>;
  getsEmVoo.set(chave, promessa);
  return promessa;
}) as typeof api.get;

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  // Rodada 148: fuso do computador de quem acessa (min a leste do UTC).
  config.headers["x-fuso-offset-min"] = String(-new Date().getTimezoneOffset());
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refrescando: Promise<string | null> | null = null;

// Marcador (sem nenhum dado sensível) de que este navegador já teve uma sessão.
// Serve só para NÃO chamar /auth/refresh na tela de login quando nunca houve
// login (evita um 401 inútil no console). O cookie de refresh continua httpOnly.
const CHAVE_SESSAO = "horus_sessao";

export function marcarSessao(ativa: boolean): void {
  try {
    if (ativa) localStorage.setItem(CHAVE_SESSAO, "1");
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // armazenamento indisponível: segue sem o marcador
  }
}

export function temSessaoMarcada(): boolean {
  try {
    return localStorage.getItem(CHAVE_SESSAO) === "1";
  } catch {
    return true; // sem como saber: tenta restaurar como antes
  }
}

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
        marcarSessao(true);
        return resp.data.accessToken as string;
      })
      .catch((erro: AxiosError) => {
        setAccessToken(null);
        // Só some o marcador se o servidor disse que não há sessão válida;
        // falha de rede não derruba quem ainda está logado.
        const status = erro.response?.status;
        if (status === 401 || status === 403) marcarSessao(false);
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
    // Rodada 493: o prazo do MFA venceu: leva ao cadastro (perfil ou segurança do super admin).
    if (
      error.response?.status === 403 &&
      (error.response.data as { codigo?: string } | undefined)?.codigo === "MFA_EXPIRADO"
    ) {
      const destino = window.location.pathname.startsWith("/super-admin")
        ? "/super-admin/seguranca"
        : "/perfil";
      if (!window.location.pathname.startsWith(destino)) window.location.assign(destino);
    }
    // Rodada 392: a empresa exige MFA e este ADMIN ainda não cadastrou: leva ao perfil.
    if (
      error.response?.status === 403 &&
      (error.response.data as { codigo?: string } | undefined)?.codigo ===
        "MFA_CADASTRO_PENDENTE" &&
      !window.location.pathname.startsWith("/perfil")
    ) {
      window.location.assign("/perfil");
    }
    // Rodada 577 (N164): senha definida por outra pessoa; só a troca de senha fica liberada.
    if (
      error.response?.status === 403 &&
      (error.response.data as { codigo?: string } | undefined)?.codigo === "SENHA_PROVISORIA" &&
      !window.location.pathname.startsWith("/perfil")
    ) {
      window.location.assign("/perfil?senha=provisoria");
    }
    return Promise.reject(error);
  },
);
