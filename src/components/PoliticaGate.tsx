import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { obterMinhaPolitica } from "../api/privacidade";
import type { MinhaPolitica } from "../api/privacidade";
import { liberarPerfilParaResolverPendencia } from "../utils/bloqueioDeAcessoPendente";
import { PoliticaPrivacidadeModal } from "./PoliticaPrivacidadeModal";

/**
 * Rodada 281: no primeiro acesso ao painel (e sempre que o texto da política
 * mudar) o usuário precisa aceitar a Política de Privacidade. Enquanto não
 * aceita, o painel (e o tour) não abre. Rodada 513 (N201): se o servidor não
 * responder, o painel NÃO abre (falhar aberto deixaria o usuário usar o
 * sistema sem ter aceitado a política); mostra erro com "Tentar novamente".
 * Rodada 687: exceção só para a tela de perfil quando o servidor bloqueia tudo por senha provisória
 * ou MFA pendente (senão a pessoa nunca chega ao formulário que resolve isso).
 */
export function PoliticaGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<
    "carregando" | "pendente" | "liberado" | "erro" | "perfil-pendencia"
  >("carregando");
  const [politica, setPolitica] = useState<MinhaPolitica | null>(null);

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado("carregando");
    obterMinhaPolitica()
      .then((p) => {
        if (cancelado) return;
        setPolitica(p);
        setEstado(p.aceita ? "liberado" : "pendente");
      })
      .catch((err) => {
        if (cancelado) return;
        setEstado(
          liberarPerfilParaResolverPendencia(err, window.location.pathname)
            ? "perfil-pendencia"
            : "erro",
        );
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  if (estado === "carregando") return <p style={{ padding: 24 }}>Carregando...</p>;
  if (estado === "erro") {
    return (
      <div style={{ padding: 24 }}>
        <p>Não foi possível confirmar a Política de Privacidade. Verifique a conexão e tente novamente.</p>
        <button type="button" onClick={() => setTentativa((t) => t + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (estado === "pendente" && politica) {
    return (
      <PoliticaPrivacidadeModal
        politica={politica}
        modo="aceite"
        onAceita={() => setEstado("liberado")}
      />
    );
  }
  // "liberado" ou "perfil-pendencia" (o servidor segue barrando tudo, menos a troca de senha / MFA).
  return <>{children}</>;
}
