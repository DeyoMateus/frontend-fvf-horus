/**
 * Popup dedicado de paginação (Rodada 77, pedido do usuário) , usado
 * quando uma lista tem mais itens do que o "mostrar N por vez"
 * selecionado (ver `MotoristaDetailPage.tsx`, tabela de tratamentos de
 * ponto): em vez de um "carregar mais" que só cresce a lista na
 * própria tela, abre um popup à parte pra escolher a página, mantendo
 * a tabela sempre do mesmo tamanho (10/20/50 linhas por vez).
 */
interface PaginacaoPopupProps {
  paginaAtual: number;
  totalPaginas: number;
  onSelecionarPagina: (pagina: number) => void;
  onFechar: () => void;
}

export function PaginacaoPopup({
  paginaAtual,
  totalPaginas,
  onSelecionarPagina,
  onFechar,
}: PaginacaoPopupProps) {
  const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);

  function irPara(pagina: number) {
    onSelecionarPagina(pagina);
    onFechar();
  }

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
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: 360,
          maxWidth: "90vw",
          maxHeight: "70vh",
          overflowY: "auto",
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
          <h3 style={{ marginTop: 0 }}>Escolher página</h3>
          <button className="secondary" onClick={onFechar} title="Fechar">
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            className="secondary"
            disabled={paginaAtual <= 1}
            onClick={() => irPara(paginaAtual - 1)}
          >
            ← Anterior
          </button>
          <button
            className="secondary"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => irPara(paginaAtual + 1)}
          >
            Próxima →
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {paginas.map((p) => (
            <button
              key={p}
              className={p === paginaAtual ? undefined : "secondary"}
              onClick={() => irPara(p)}
              style={{ minWidth: 36 }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
