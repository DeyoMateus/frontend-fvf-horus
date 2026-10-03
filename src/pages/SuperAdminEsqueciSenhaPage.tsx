import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { esqueciSenhaSuperAdmin } from "../api/superAdminAuth";

// Espelha EsqueciSenhaPage.tsx (painel do grupo) , ver comentário lá
// sobre a resposta genérica.
export function SuperAdminEsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await esqueciSenhaSuperAdmin(email);
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
          Recuperar senha do super admin
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
          <Link to="/super-admin/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
