import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Botão "i" com balão de ajuda flutuante (Rodada 60 , antes disso, o
 * balão era posicionado com `position: absolute` dentro do próprio
 * card/linha, o que fazia ele ficar escondido dentro da div quando não
 * havia espaço embaixo, exigindo rolar a tela pra ler o conteúdo.
 *
 * Aqui o balão é renderizado num portal direto no `<body>`, com
 * `position: fixed` calculado a partir da posição real do botão na
 * tela (`getBoundingClientRect`) , sempre abre ACIMA do botão, nunca
 * fica cortado por nenhum container com `overflow` limitado, e nunca
 * gera barra de rolagem.
 */
export function BotaoAjuda({
  titulo,
  children,
  label = "Ajuda",
}: {
  titulo: string;
  children: ReactNode;
  /** aria-label/title do botão "i". */
  label?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(
    null,
  );

  const LARGURA_BALAO = 300;

  useLayoutEffect(() => {
    if (!aberto) return;

    function calcularPosicao() {
      const el = botaoRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(
          rect.right - LARGURA_BALAO,
          window.innerWidth - LARGURA_BALAO - 8,
        ),
      );
      setPosicao({ top: rect.top, left });
    }

    calcularPosicao();
    window.addEventListener("resize", calcularPosicao);
    window.addEventListener("scroll", calcularPosicao, true);
    return () => {
      window.removeEventListener("resize", calcularPosicao);
      window.removeEventListener("scroll", calcularPosicao, true);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        title={label}
        aria-label={label}
        style={{
          borderRadius: "50%",
          width: 24,
          height: 24,
          padding: 0,
          lineHeight: "22px",
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        i
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <>
            {/* Backdrop invisível só pra fechar ao clicar fora , não bloqueia rolagem da página de trás. */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 1000 }}
              onClick={() => setAberto(false)}
              aria-hidden="true"
            />
            <div
              className="card"
              role="tooltip"
              style={{
                position: "fixed",
                top: posicao.top,
                left: posicao.left,
                transform: "translateY(-100%) translateY(-8px)",
                width: LARGURA_BALAO,
                zIndex: 1001,
                fontSize: 13,
                padding: 12,
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <strong>{titulo}</strong>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar ajuda"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#000000",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ marginTop: 6 }}>{children}</div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
