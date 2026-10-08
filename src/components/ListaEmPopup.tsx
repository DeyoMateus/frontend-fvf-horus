import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Rodada 154 , pedido do usuário: "quando selecionar 100, abrir um popup
 * separado" em todas as listagens. Quando `ativo`, o conteúdo (controles +
 * tabela) sai da página e passa a aparecer numa janela à parte (portal no
 * <body>), em vez de esticar a tela com 100 linhas. Fechar a janela chama
 * `onFechar` (as telas voltam para 50 por vez). Quando não está ativo,
 * apenas renderiza o conteúdo no lugar normal.
 */
interface ListaEmPopupProps {
  ativo: boolean;
  titulo?: string;
  onFechar: () => void;
  children: ReactNode;
}

export function ListaEmPopup({
  ativo,
  titulo,
  onFechar,
  children,
}: ListaEmPopupProps) {
  if (!ativo) return <>{children}</>;

  return (
    <>
      <p style={{ fontSize: 13, color: "#000000" }}>
        Lista aberta em janela separada (100 por vez).{" "}
        <button
          type="button"
          className="secondary"
          style={{ fontSize: 13 }}
          onClick={onFechar}
        >
          Voltar para 50 por vez
        </button>
      </p>
      {createPortal(
        <div
          onClick={onFechar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 45,
            // Mesma folga em cima, embaixo, à esquerda e à direita, em
            // qualquer tamanho de tela (5% da altura/largura, mínimo 16px).
            boxSizing: "border-box",
            padding: "max(16px, 5vh) max(16px, 5vw)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: 1100,
              maxWidth: "100%",
              maxHeight: "100%",
              boxSizing: "border-box",
              // .card tem margin-bottom: 20px, que empurrava o popup para cima.
              margin: 0,
              overflow: "auto",
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {titulo ?? "Lista"} (100 por vez)
              </h3>
              <button
                type="button"
                className="secondary"
                onClick={onFechar}
                title="Fechar"
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
