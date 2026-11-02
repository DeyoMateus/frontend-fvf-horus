import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PendenciaDaAba } from "./penMenu";

const LINHAS_VISIVEIS = 6;

/**
 * Rodada 335: bolinha no fim do botão da aba do menu lateral. Ao passar o
 * cursor, lista as pendências de forma resumida. O resumo é desenhado fora do
 * menu portal para não ser cortado pela rolagem da barra lateral t
 */
export function BolinhaPendencia({
  nomeDaAba,
  pendencia,
}: {
  nomeDaAba: string;
  pendencia: PendenciaDaAba;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function mostrar() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const top = Math.min(Math.max(12, r.top - 8), window.innerHeight - 220);
    setPos({ top, left: r.right + 12 });
  }

  const extras = pendencia.resumo.length - LINHAS_VISIVEIS;

  return (
    <>
      <span
        ref={ref}
        className="nav-bolinha"
        role="status"
        aria-label={`${pendencia.total} pendência(s) em ${nomeDaAba}`}
        onMouseEnter={mostrar}
        onMouseLeave={() => setPos(null)}
      />
      {pos &&
        createPortal(
          <div
            className="nav-bolinha-resumo"
            style={{ top: pos.top, left: pos.left }}
          >
            <strong>
              {nomeDaAba}: {pendencia.total}{" "}
              {pendencia.total === 1 ? "pendência" : "pendências"}
            </strong>
            <ul>
              {pendencia.resumo.slice(0, LINHAS_VISIVEIS).map((linha, i) => (
                <li key={i}>{linha}</li>
              ))}
            </ul>
            {extras > 0 && (
              <span className="nav-bolinha-mais">e mais {extras}</span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
