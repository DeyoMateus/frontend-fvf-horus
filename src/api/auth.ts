import { api, setAccessToken } from "./client";

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

// Espelha AuthController: POST /auth/login, /auth/refresh, /auth/logout.
// O refresh token não aparece mais aqui , vira cookie httpOnly, setado
// direto pelo backend na resposta (ver client.ts e o comentário em
// refresh-cookie.util.ts no backend).
export async function login(
  email: string,
  senha: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    senha,
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
  setAccessToken(null);
}

export async function esqueciSenha(email: string): Promise<void> {
  await api.post("/auth/esqueci-senha", { email });
}

export async function redefinirSenha(
  token: string,
  novaSenha: string,
): Promise<void> {
  await api.post("/auth/redefinir-senha", { token, novaSenha });
}
