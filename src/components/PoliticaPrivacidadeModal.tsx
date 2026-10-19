import { useEffect, useState } from "react";
import { aceitarMinhaPolitica } from "../api/privacidade";
import type { MinhaPolitica } from "../api/privacidade";
import { travarRolagemFundo } from "../utils/exportarTabelaModal";

/**
 * Rodada 281: Política de Privacidade para o usuário do painel.
 * Modo "aceite" (primeiro acesso ou texto novo): não fecha sem aceitar.
 * Modo "leitura" (Configuração): só mostra o texto e a data do aceite.
 */
export function PoliticaPrivacidadeModal({
  politica,
  modo,
  onAceita,
  onFechar,
}: {
  politica: MinhaPolitica;
  modo: "aceite" | "leitura";
  onAceita?: (aceitaEm: string) => void;
  onFechar?: () => void;
}) {
  const [li, setLi] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => travarRolagemFundo(), []);

  async function aceitar() {
    setEnviando(true);
    setErro(null);
    try {
      const r = await aceitarMinhaPolitica(politica.versao);
      onAceita?.(r.aceitaEm);
    } catch (err: any) {
      setErro(
        err?.response?.data?.message ??
          "Não foi possível registrar o aceite. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const aceite = modo === "aceite";
  return (
    <div
      onClick={aceite ? undefined : onFechar}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9500,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          margin: 0,
          padding: 20,
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {aceite ? "Antes de continuar: " : ""}
          {politica.titulo}
        </h3>
        {aceite && (
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Leia a política abaixo e confirme o aceite para usar o painel.
          </p>
        )}
        <div
          style={{
            overflow: "auto",
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
            fontSize: 14,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            flex: "1 1 auto",
          }}
        >
          {politica.texto}
        </div>
        {aceite ? (
          <>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 12,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={li}
                onChange={(e) => setLi(e.target.checked)}
                style={{ width: "auto" }}
              />
              Li e aceito a Política de Privacidade.
            </label>
            {erro && <p className="error-text">{erro}</p>}
            <div style={{ marginTop: 12 }}>
              <button type="button" disabled={!li || enviando} onClick={aceitar}>
                {enviando ? "Registrando..." : "Aceitar e continuar"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <button type="button" className="secondary" onClick={onFechar}>
              Fechar
            </button>
            {politica.aceitaEm && (
              <span style={{ fontSize: 12 }}>
                Aceita em {new Date(politica.aceitaEm).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
