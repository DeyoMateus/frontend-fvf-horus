import type { ReactNode } from "react";

/**
 * Rodada 680 , base dos popups: o título e o botão de fechar ficam FIXOS
 * no topo (não rolam junto com o conteúdo), os botões de ação ficam fixos
 * embaixo e só o miolo rola, se não couber. Usar em popups novos e ao
 * mexer nos antigos, para o botão de sair estar sempre no mesmo lugar.
 */
export function PopupBase({
  titulo,
  onFechar,
  rodape,
  largura = 560,
  zIndex = 50,
  children,
}: {
  titulo: ReactNode;
  onFechar: () => void;
  /** Botões de ação, fixos no pé do popup. */
  rodape?: ReactNode;
  largura?: number;
  zIndex?: number;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: largura,
          maxWidth: "94vw",
          maxHeight: "94vh",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>{titulo}</h3>
          <button
            className="secondary"
            onClick={onFechar}
            title="Fechar"
            aria-label="Fechar"
            style={{ padding: "2px 10px", lineHeight: 1.2 }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "10px 16px",
          }}
        >
          {children}
        </div>
        {rodape && (
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              justifyContent: "flex-end",
              padding: "8px 16px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
