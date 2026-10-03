import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { login as apiLogin, logout as apiLogout } from "../api/auth";
import { decodeJwt } from "../api/jwt";
import { setAccessToken, tentarRefresh } from "../api/client";
import type { UsuarioAutenticado } from "../api/types";

interface AuthContextValue {
  usuario: UsuarioAutenticado | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Ao abrir o app (ou dar F5), tenta restaurar a sessão via o cookie
  // httpOnly de refresh , não há mais como checar de antemão no JS se
  // ele existe (é invisível de propósito), então sempre tenta, e uma
  // falha (401, sem cookie) só significa "não havia sessão".
  useEffect(() => {
    tentarRefresh()
      .then((accessToken) =>
        setUsuario(accessToken ? decodeJwt(accessToken) : null),
      )
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(email: string, senha: string) {
    setCarregando(true);
    try {
      const tokens = await apiLogin(email, senha);
      setUsuario(decodeJwt(tokens.accessToken));
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    try {
      await apiLogout();
    } catch {
      // mesmo se a chamada falhar, limpa localmente
    }
    setAccessToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
