import { api } from "./client";

// Rodada 375: espelha MfaController (verificação em duas etapas, TOTP).
export function iniciarMfa() {
  return api
    .post<{ segredo: string; uri: string }>("/auth/mfa/iniciar")
    .then((r) => r.data);
}

export function confirmarMfa(codigo: string) {
  return api
    .post<{ codigosReserva: string[] }>("/auth/mfa/confirmar", { codigo })
    .then((r) => r.data);
}

export function desativarMfa(senha: string, codigo: string) {
  return api.post("/auth/mfa/desativar", { senha, codigo }).then(() => undefined);
}
