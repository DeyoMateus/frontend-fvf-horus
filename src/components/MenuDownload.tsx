import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface OpcaoDownload {
  rotulo: string;
  onClick: () => void | Promise<unknown>;
  desabilitado?: boolean;
  /** Mostra o texto de andamento no lugar do rótulo (ex.: "Gerando..."). */
  carregando?: boolean;
  /** Dica ao passar o mouse. */
  dica?: string;
}

/**
 * Ícone laranja de download que abre a lista de opções de baixar/extrair.
 * Fica no fim da linha do título do bloco, para a tela não ficar poluída com botões.
 */
export function MenuDownload({
  opcoes,
  titulo = "Baixar ou extrair",
  desabilitado = false,
}: {
  opcoes: OpcaoDownload[];
  titulo?: string;
  desabilitado?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const ocupado = opcoes.some((o) => o.carregando);

  return (
    <div ref={raiz} className="menu-download">
      <button
        type="button"
        className="menu-download-icone"
        aria-label={titulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={titulo}
        disabled={desabilitado}
        onClick={() => setAberto((v) => !v)}
      >
        {ocupado ? (
          <span style={{ fontSize: 12 }}>…</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        )}
      </button>
      {aberto && (
        <div className="menu-download-lista" role="menu">
          {opcoes.map((o) => (
            <button
              key={o.rotulo}
              type="button"
              role="menuitem"
              className="menu-download-item"
              title={o.dica}
              disabled={o.desabilitado || o.carregando}
              onClick={() => {
                setAberto(false);
                void o.onClick();
              }}
            >
              {o.carregando ? "Gerando..." : o.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Linha de título de um bloco com o menu de download no fim. */
export function TituloComDownload({
  children,
  opcoes,
  titulo,
  desabilitado,
}: {
  children: ReactNode;
  opcoes: OpcaoDownload[];
  titulo?: string;
  desabilitado?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      {children}
      <MenuDownload opcoes={opcoes} titulo={titulo} desabilitado={desabilitado} />
    </div>
  );
}
