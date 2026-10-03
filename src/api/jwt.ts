import type { SuperAdminAutenticado, UsuarioAutenticado } from "./types";

// Decodifica só o payload do JWT para exibir na UI (papel, grupoId).
// Isso NUNCA substitui a validação real, que é sempre feita pelo
// backend (JwtAuthGuard) , aqui é só pra saber o que mostrar na tela.
export function decodeJwt(token: string): UsuarioAutenticado | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as UsuarioAutenticado;
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
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as SuperAdminAutenticado;
  } catch {
    return null;
  }
}
