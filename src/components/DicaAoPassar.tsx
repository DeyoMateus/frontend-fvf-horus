import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Rodada 337: "?" que, ao passar o mouse (ou focar pelo teclado), abre um
 * balão com a explicação do campo. O balão sai num portal no `<body>`, com
 * posição fixa calculada a partir do "?", então nunca é cortado por um
 * container com `overflow`.
 */
export function DicaAoPassar({
  children,
  label = "Explicação",
  largura = 340,
}: {
  children: ReactNode;
  label?: string;
  largura?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function abrir() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const larguraReal = Math.min(largura, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left - 8, window.innerWidth - larguraReal - 8));
    setPos({ top: r.bottom + 8, left });
  }

  return (
    <>
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={abrir}
        onMouseLeave={() => setPos(null)}
        onFocus={abrir}
        onBlur={() => setPos(null)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          marginLeft: 8,
          borderRadius: "50%",
          border: "1.5px solid #6b7280",
          color: "#000",
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          cursor: "help",
          verticalAlign: "middle",
        }}
      >
        ?
      </span>
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="card"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: Math.min(largura, window.innerWidth - 16),
              zIndex: 1001,
              fontSize: 13,
              lineHeight: 1.45,
              padding: 12,
              color: "#000000",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              pointerEvents: "none",
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
