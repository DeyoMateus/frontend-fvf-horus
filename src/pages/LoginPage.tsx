import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      // Rodada 42: estava indo pra /motoristas (resquício de antes do
      // dashboard existir) , o destino certo depois do login é o Painel.
      navigate("/dashboard");
    } catch (erro) {
      // Status 429 = conta temporariamente bloqueada por excesso de
      // tentativas (AccountLockoutService, Rodada 35) , mostra a
      // mensagem real (com o tempo de espera) em vez do genérico
      // "credenciais inválidas", já que esse caso não revela nada
      // sobre a senha em si, só que houve muita tentativa recente.
      if (erro instanceof AxiosError && erro.response?.status === 429) {
        setErro(
          erro.response.data?.message ??
            "Muitas tentativas de login. Tente novamente mais tarde.",
        );
      } else {
        setErro("Credenciais inválidas.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box card">
        <h1>FVF Hórus</h1>
        <p style={{ color: "#000000", fontSize: 13, marginTop: -8 }}>
          Painel da empresa
        </p>
        <form onSubmit={onSubmit}>
          <label>E-mail</label>
          <input
            type="email" maxLength={254}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Senha</label>
          <input
            type="password" maxLength={128}
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          {erro && <p className="error-text">{erro}</p>}
          <button type="submit" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 12, width: "100%" }}
          onClick={() => navigate("/esqueci-senha")}
        >
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}
