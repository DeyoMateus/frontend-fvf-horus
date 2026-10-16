import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Rodada 268 , texto livre (motivo, justificativa, observação) que pode
// ser grande. Na tabela mostra só as primeiras linhas, sem vazar do campo,
// e, quando passa do limite, oferece "Ver texto completo", que abre o
// texto inteiro formatado (quebras de linha preservadas, palavras longas
// quebradas) num popup.

const LIMITE_RESUMO = 90;

export function TextoLongo({
  texto,
  titulo = "Texto completo",
  vazio = "—",
  limite = LIMITE_RESUMO,
}: {
  texto: string | null | undefined;
  titulo?: string;
  vazio?: ReactNode;
  limite?: number;
}) {
  const [aberto, setAberto] = useState(false);
  const conteudo = texto?.trim();
  if (!conteudo) return <>{vazio}</>;

  const longo = conteudo.length > limite || conteudo.includes("\n");

  return (
    <>
      <div
        style={{
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          whiteSpace: "pre-line",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {conteudo}
      </div>
      {longo && (
        <button
          type="button"
          className="secondary"
          style={{ fontSize: 12, padding: "2px 8px", marginTop: 4 }}
          onClick={() => setAberto(true)}
        >
          Ver texto completo
        </button>
      )}
      {aberto &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            onClick={() => setAberto(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 60,
              padding: 16,
              boxSizing: "border-box",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 20,
                width: "100%",
                maxWidth: 640,
                maxHeight: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 8px 24px rgba(16,21,31,.25)",
                boxSizing: "border-box",
              }}
            >
              <h3 style={{ margin: "0 0 4px" }}>{titulo}</h3>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                {conteudo.length} caracteres
              </div>
              <div
                style={{
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  lineHeight: 1.55,
                  fontSize: 14,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                {conteudo}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" onClick={() => setAberto(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
