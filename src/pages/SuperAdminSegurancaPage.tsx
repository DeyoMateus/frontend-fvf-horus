import { useEffect, useState } from "react";
import { MfaCard } from "../components/MfaCard";
import {
  confirmarMfaSuperAdmin,
  desativarMfaSuperAdmin,
  iniciarMfaSuperAdmin,
  obterEstadoMfaSuperAdmin,
} from "../api/superAdminAuth";

/** Segurança da conta do super admin: verificação em duas etapas (MFA). */
export function SuperAdminSegurancaPage() {
  const [mfaAtivo, setMfaAtivo] = useState<boolean | null>(null);
  const [validoAte, setValidoAte] = useState<string | null>(null);
  const [expirado, setExpirado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    obterEstadoMfaSuperAdmin()
      .then((e) => {
        setMfaAtivo(e.mfaAtivo);
        setValidoAte(e.mfaValidoAte ?? null);
        setExpirado(!!e.mfaExpirado);
        setErro(null);
      })
      .catch(() => setErro("Não foi possível carregar o estado da verificação em duas etapas."));
  }

  useEffect(carregar, []);

  return (
    <div>
      <h2>Segurança</h2>
      <p style={{ fontSize: 13, marginTop: -8 }}>
        Proteção da conta do super admin. Com a verificação em duas etapas ativa,
        o login e a liberação de chaves por empresa exigem o código do aplicativo
        autenticador.
      </p>
      {erro && <p className="error-text">{erro}</p>}
      {mfaAtivo !== null && (
        <MfaCard
          ativo={mfaAtivo}
          validoAte={validoAte}
          expirado={expirado}
          onMudou={carregar}
          acoes={{
            iniciar: iniciarMfaSuperAdmin,
            confirmar: confirmarMfaSuperAdmin,
            desativar: desativarMfaSuperAdmin,
          }}
        />
      )}
    </div>
  );
}
