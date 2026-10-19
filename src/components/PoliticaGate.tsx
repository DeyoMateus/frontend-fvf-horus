import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { obterMinhaPolitica } from "../api/privacidade";
import type { MinhaPolitica } from "../api/privacidade";
import { PoliticaPrivacidadeModal } from "./PoliticaPrivacidadeModal";

/**
 * Rodada 281: no primeiro acesso ao painel (e sempre que o texto da política
 * mudar) o usuário precisa aceitar a Política de Privacidade. Enquanto não
 * aceita, o painel (e o tour) não abre. Se o servidor não responder, o painel
 * abre normalmente e a confirmação volta na próxima entrada.
 */
export function PoliticaGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<"carregando" | "pendente" | "liberado">(
    "carregando",
  );
  const [politica, setPolitica] = useState<MinhaPolitica | null>(null);

  useEffect(() => {
    let cancelado = false;
    obterMinhaPolitica()
      .then((p) => {
        if (cancelado) return;
        setPolitica(p);
        setEstado(p.aceita ? "liberado" : "pendente");
      })
      .catch(() => {
        if (!cancelado) setEstado("liberado");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (estado === "carregando") return <p style={{ padding: 24 }}>Carregando...</p>;
  if (estado === "pendente" && politica) {
    return (
      <PoliticaPrivacidadeModal
        politica={politica}
        modo="aceite"
        onAceita={() => setEstado("liberado")}
      />
    );
  }
  return <>{children}</>;
}
