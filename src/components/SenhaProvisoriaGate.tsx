import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { alterarMinhaSenha } from "../api/usuariosEmpresa";
import { useAuth } from "../context/AuthContext";
import { validarSenhaNova } from "../utils/senha";

/**
 * Rodada 688: a senha foi definida por outra pessoa (ex.: o super admin ao criar a empresa mãe).
 * Enquanto for provisória o servidor bloqueia todo o resto, então o painel mostra SÓ este popup (sem
 * menu e sem os dados do perfil). Trocada a senha, a pessoa continua logada: o gate libera e a
 * Política de Privacidade (`PoliticaGate`) abre em seguida para o aceite.
 */
export function SenhaProvisoriaGate({ children }: { children: ReactNode }) {
  const { usuario, sair, recarregarSessao } = useAuth();
  const local = useLocation();
  const navegar = useNavigate();
  const [trocada, setTrocada] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pedidaPelaUrl = new URLSearchParams(local.search).get("senha") === "provisoria";
  const exigida = !trocada && (usuario?.senhaProvisoria === true || pedidaPelaUrl);
  if (!exigida) return <>{children}</>;

  async function trocar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const problema = validarSenhaNova(novaSenha);
    if (problema) {
      setErro(problema);
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setSalvando(true);
    try {
      await alterarMinhaSenha(senhaAtual, novaSenha);
      setTrocada(true);
      // Pega o token novo da mesma sessão (sem a marca de senha provisória) e segue logado.
      await recarregarSessao();
      if (pedidaPelaUrl) navegar("/", { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErro(
        Array.isArray(msg) ? msg.join(" ") : (msg ?? "Não foi possível alterar a senha."),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f5f6f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <form
        onSubmit={trocar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-senha-provisoria"
        className="card"
        style={{ width: 420, maxWidth: "94vw", maxHeight: "94vh", overflowY: "auto" }}
      >
        <h3 id="titulo-senha-provisoria" style={{ marginTop: 0 }}>
          Crie a sua senha
        </h3>
        <p style={{ fontSize: 14 }}>
          Sua senha foi definida por outra pessoa. Crie uma senha só sua para continuar.
        </p>
        <label>Senha atual</label>
        <input
          type="password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          autoComplete="current-password"
          required
          autoFocus
        />
        <label style={{ marginTop: 8, display: "block" }}>Nova senha</label>
        <input
          type="password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          autoComplete="new-password"
          minLength={10}
          required
        />
        <label style={{ marginTop: 8, display: "block" }}>Confirmar nova senha</label>
        <input
          type="password"
          value={confirmaSenha}
          onChange={(e) => setConfirmaSenha(e.target.value)}
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p style={{ fontSize: 12, color: "#4b5563", margin: "6px 0 0" }}>
          Mínimo de 10 caracteres, com pelo menos uma letra e um número.
        </p>
        {erro && <p className="error-text">{erro}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="secondary" onClick={() => void sair()}>
            Sair
          </button>
          <button type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
