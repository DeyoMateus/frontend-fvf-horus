import type { ReactNode } from "react";
import { ListaEmPopup } from "./ListaEmPopup";
import { PaginacaoPopup } from "./PaginacaoPopup";
import type { OrdemData, QtdPorPagina } from "../hooks/useListaPaginada";

/**
 * Barra de controles (Rodada 108) , ordenar (mais recente/mais antigo
 * primeiro), "mostrar N por vez", botão que abre o popup dedicado de
 * página (`PaginacaoPopup`) e, opcionalmente, filtro de período
 * (De/Até). Companheiro visual do hook `useListaPaginada`: a tela que
 * usa os dois só precisa passar os valores/callbacks que o hook
 * devolve, sem reimplementar o JSX em cada tabela.
 */
interface ControlesListaPaginadaProps {
  ordem: OrdemData;
  onAlternarOrdem: () => void;
  qtdPorPagina: QtdPorPagina;
  onMudarQtdPorPagina: (qtd: QtdPorPagina) => void;
  pagina: number;
  totalPaginas: number;
  popupAberto: boolean;
  onAbrirPopup: () => void;
  onFecharPopup: () => void;
  onSelecionarPagina: (pagina: number) => void;
  /** Omitir quando o recurso não tem uma data útil pra filtrar (ex.: cadastro sem data relevante de negócio). */
  filtroData?: {
    dataInicio: string;
    onDataInicio: (v: string) => void;
    dataFim: string;
    onDataFim: (v: string) => void;
    /** Rótulo do campo de data filtrado, ex.: "data do evento". Só pra legenda do filtro. */
    rotulo?: string;
  };
  /**
   * Rodada 154: a tabela da tela. Quando passada e o usuário escolhe "100 por
   * vez", controles + tabela abrem numa janela separada (ver `ListaEmPopup`).
   */
  children?: ReactNode;
  /** Título da janela de 100 por vez. */
  tituloPopup?: string;
}

export function ControlesListaPaginada({
  ordem,
  onAlternarOrdem,
  qtdPorPagina,
  onMudarQtdPorPagina,
  pagina,
  totalPaginas,
  popupAberto,
  onAbrirPopup,
  onFecharPopup,
  onSelecionarPagina,
  filtroData,
  children,
  tituloPopup,
}: ControlesListaPaginadaProps) {
  const barra = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
        flexWrap: "wrap",
      }}
    >
      {filtroData && (
        // Pedido do usuário: tirar o rótulo "Filtrar por..." de dentro da
        // linha do "de"/"até" (ficava espremido e quebrava em 3 linhas,
        // "Filtra/por data/do pedido") , agora ele fica sozinho numa linha
        // ACIMA dos campos, e o bloco inteiro fica encostado na esquerda
        // da barra (é sempre o primeiro item, sem crescer/dividir espaço
        // com os outros controles , `flexShrink: 0` evita que ele seja
        // espremido quando a barra fica apertada).
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
            fontSize: 13,
            flexShrink: 0,
            marginRight: "auto",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>
            {filtroData.rotulo
              ? `Filtrar por ${filtroData.rotulo}`
              : "Período"}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "nowrap",
              whiteSpace: "nowrap",
            }}
          >
            <span>de</span>
            <input
              type="date"
              value={filtroData.dataInicio}
              onChange={(e) => filtroData.onDataInicio(e.target.value)}
            />
            <span>até</span>
            <input
              type="date"
              value={filtroData.dataFim}
              onChange={(e) => filtroData.onDataFim(e.target.value)}
            />
          </div>
        </div>
      )}
      <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
        Mostrar{" "}
        <select
          value={qtdPorPagina}
          onChange={(e) =>
            onMudarQtdPorPagina(Number(e.target.value) as QtdPorPagina)
          }
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>{" "}
        por vez
      </label>
      {totalPaginas > 1 && (
        <button
          type="button"
          className="secondary"
          style={{ fontSize: 13, whiteSpace: "nowrap" }}
          onClick={onAbrirPopup}
        >
          Página {pagina} de {totalPaginas}, trocar página
        </button>
      )}
      {/* Pedido do usuário: "o mais recente primeiro fica por último na
          lista" , movido pro final da barra de controles. */}
      <button
        type="button"
        className="secondary"
        style={{ fontSize: 13, whiteSpace: "nowrap" }}
        onClick={onAlternarOrdem}
      >
        {ordem === "recente"
          ? "Mais recentes primeiro ↓"
          : "Mais antigos primeiro ↑"}
      </button>

      {popupAberto && (
        <PaginacaoPopup
          paginaAtual={pagina}
          totalPaginas={totalPaginas}
          onSelecionarPagina={onSelecionarPagina}
          onFechar={onFecharPopup}
        />
      )}
    </div>
  );

  if (children === undefined) return barra;
  return (
    <ListaEmPopup
      ativo={qtdPorPagina === 100}
      titulo={tituloPopup}
      onFechar={() => onMudarQtdPorPagina(50)}
    >
      {barra}
      {children}
    </ListaEmPopup>
  );
}
