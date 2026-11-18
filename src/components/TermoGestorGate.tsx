import { Esqueleto } from "./Esqueleto";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { aceitarTermoGestor, obterTermoGestor } from "../api/privacidade";
import type { MinhaPolitica } from "../api/privacidade";
import { liberarPerfilParaResolverPendencia } from "../utils/bloqueioDeAcessoPendente";
import { PoliticaPrivacidadeModal } from "./PoliticaPrivacidadeModal";

/**
 * Termo de responsabilidade do usuario do painel. Vem depois da Politica de Privacidade
 * (PoliticaGate): no primeiro acesso e a cada versao nova o usuario precisa aceitar antes de usar o
 * painel. Se o servidor nao responder, o painel nao abre (falhar aberto deixaria usar sem aceite).
 */
export function TermoGestorGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<"carregando" | "pendente" | "liberado" | "erro" | "perfil-pendencia">(
    "carregando",
  );
  const [termo, setTermo] = useState<MinhaPolitica | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado("carregando");
    obterTermoGestor()
      .then((t) => {
        if (cancelado) return;
        setTermo(t);
        setEstado(t.aceita ? "liberado" : "pendente");
      })
      .catch((err) => {
        if (cancelado) return;
        setEstado(
          liberarPerfilParaResolverPendencia(err, window.location.pathname) ? "perfil-pendencia" : "erro",
        );
      });
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  if (estado === "carregando") return <Esqueleto />;
  if (estado === "erro") {
    return (
      <div style={{ padding: 24 }}>
        <p>Não foi possível confirmar o termo de responsabilidade. Verifique a conexão e tente novamente.</p>
        <button type="button" onClick={() => setTentativa((t) => t + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (estado === "pendente" && termo) {
    return (
      <PoliticaPrivacidadeModal
        politica={termo}
        modo="aceite"
        aceitar={aceitarTermoGestor}
        textoIntro="Leia o termo abaixo e confirme o aceite para usar o painel."
        textoCheckbox="Li e aceito o termo de responsabilidade."
        onAceita={() => setEstado("liberado")}
      />
    );
  }
  return <>{children}</>;
}
