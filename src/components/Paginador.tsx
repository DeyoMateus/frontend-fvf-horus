interface PaginadorProps {
  pagina: number;
  totalPaginas: number;
  onMudarPagina: (pagina: number) => void;
  /** Se passado, clicar no campo "Página X de Y" abre o seletor de página. */
  onAbrirSeletor?: () => void;
  /** Texto extra após o campo, ex.: "(42 ocorrências)". */
  sufixo?: string;
}

/**
 * Paginação padrão do painel: botão voltar, campo "Página X de Y" e botão
 * avançar, com hover e animação de clique (classe `paginador-btn`).
 */
export function Paginador({
  pagina,
  totalPaginas,
  onMudarPagina,
  onAbrirSeletor,
  sufixo,
}: PaginadorProps) {
  return (
    <div className="paginador">
      <button
        type="button"
        className="paginador-btn"
        disabled={pagina <= 1}
        onClick={() => onMudarPagina(Math.max(1, pagina - 1))}
        aria-label="Página anterior"
        title="Página anterior"
      >
        ←
      </button>
      {onAbrirSeletor && totalPaginas > 1 ? (
        <button
          type="button"
          className="paginador-campo paginador-campo-clicavel"
          onClick={onAbrirSeletor}
          title="Escolher a página"
        >
          Página {pagina} de {totalPaginas}
        </button>
      ) : (
        <span className="paginador-campo">
          Página {pagina} de {totalPaginas}
        </span>
      )}
      <button
        type="button"
        className="paginador-btn"
        disabled={pagina >= totalPaginas}
        onClick={() => onMudarPagina(Math.min(totalPaginas, pagina + 1))}
        aria-label="Próxima página"
        title="Próxima página"
      >
        →
      </button>
      {sufixo && <span className="paginador-sufixo">{sufixo}</span>}
    </div>
  );
}
