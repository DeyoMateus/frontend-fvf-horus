import type { SuperAdminAutenticado, UsuarioAutenticado } from "./types";

/** Rodada 555 (N197): payload em UTF-8 (atob sozinho devolve latin1 e estraga acentos). */
function lerPayload(token: string): unknown {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder("utf-8").decode(bytes));
}

// Decodifica só o payload do JWT para exibir na UI (papel, grupoId).
// Isso NUNCA substitui a validação real, que é sempre feita pelo
// backend (JwtAuthGuard) , aqui é só pra saber o que mostrar na tela.
export function decodeJwt(token: string): UsuarioAutenticado | null {
  try {
    return lerPayload(token) as UsuarioAutenticado;
  } catch {
    return null;
  }
}

// Mesma decodificação, para o token do super admin (payload sem
// papel/grupoId , ver SuperAdminAuthService.emitirTokens no backend).
// Reutiliza a mesma lógica pura de parsing do JWT, só com outro tipo
// de retorno; nunca mistura estado com decodeJwt acima.
export function decodeJwtSuperAdmin(
  token: string,
): SuperAdminAutenticado | null {
  try {
    return lerPayload(token) as SuperAdminAutenticado;
  } catch {
    return null;
  }
}
