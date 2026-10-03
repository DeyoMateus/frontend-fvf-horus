import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { loginSuperAdmin, logoutSuperAdmin } from "../api/superAdminAuth";
import { decodeJwtSuperAdmin } from "../api/jwt";
import {
  setSuperAdminAccessToken,
  tentarRefreshSuperAdmin,
} from "../api/superAdminClient";
import type { SuperAdminAutenticado } from "../api/types";

interface SuperAdminAuthContextValue {
  superAdmin: SuperAdminAutenticado | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<
  SuperAdminAuthContextValue | undefined
>(undefined);

// Espelha AuthContext, mas para a área do super admin , estado
// (usuário/token) completamente isolado do painel de grupo. Os dois
// Providers ficam montados juntos em App.tsx sem nunca se lerem.
export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdminAutenticado | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Os dois Providers ficam sempre montados (ver comentário em
    // App.tsx), mas SÓ faz sentido tentar restaurar a sessão do super
    // admin quando quem está navegando está de fato numa rota
    // `/super-admin/*` , chamar isso pra qualquer usuário comum do
    // painel de grupo (ADMIN/GESTOR) fazia todo login disparar um
    // POST `/super-admin/auth/refresh` que sempre volta 401 (não
    // existe cookie de super admin pra essa sessão), sujando o
    // console sem nenhum efeito prático.
    if (!window.location.pathname.startsWith("/super-admin")) {
      setCarregando(false);
      return;
    }
    tentarRefreshSuperAdmin()
      .then((accessToken) =>
        setSuperAdmin(accessToken ? decodeJwtSuperAdmin(accessToken) : null),
      )
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(email: string, senha: string) {
    setCarregando(true);
    try {
      const tokens = await loginSuperAdmin(email, senha);
      setSuperAdmin(decodeJwtSuperAdmin(tokens.accessToken));
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    try {
      await logoutSuperAdmin();
    } catch {
      // mesmo se a chamada falhar, limpa localmente
    }
    setSuperAdminAccessToken(null);
    setSuperAdmin(null);
  }

  return (
    <SuperAdminAuthContext.Provider
      value={{ superAdmin, carregando, entrar, sair }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx)
    throw new Error(
      "useSuperAdminAuth precisa estar dentro de <SuperAdminAuthProvider>",
    );
  return ctx;
}
