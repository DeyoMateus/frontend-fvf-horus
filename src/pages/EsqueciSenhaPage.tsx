import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { esqueciSenha } from "../api/auth";

// Resposta do backend é sempre genérica (204, exista ou não o e-mail ,
// ver AuthService.esqueciSenha) , a tela reflete isso: mostra a MESMA
// mensagem de sucesso independente do e-mail existir, pra não virar
// um jeito de enumerar contas cadastradas pela própria interface.
export function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await esqueciSenha(email);
    } finally {
      setEnviando(false);
      setEnviado(true);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box card">
        <h1>FVF Hórus</h1>
        <p style={{ color: "#000000", fontSize: 13, marginTop: -8 }}>
          Recuperar senha do painel da empresa
        </p>
        {enviado ? (
          <p>
            Se o e-mail informado estiver cadastrado, enviamos um link para
            redefinir a senha. Confira sua caixa de entrada (e o spam). O link
            vale por 1 hora.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        )}
        <p style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
