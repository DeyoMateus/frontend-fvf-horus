import type { ReactNode } from "react";
import { baixarCsvTabela, imprimirTabela } from "../utils/exportarTabelaModal";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "./ControlesListaPaginada";

export interface LinhaFolga {
  id: string;
  /** Data da folga (AAAA-MM-DD...), usada para ordenar e filtrar por período. */
  data: string;
  /** Uma célula de texto por coluna (a primeira costuma ser a data formatada). */
  celulas: string[];
  /** Cor do texto da linha (ex.: vermelho para folga não realizada). */
  cor?: string;
  /** Botão/ação extra da linha (ex.: Retirar folga); não vai para o Excel/PDF. */
  acao?: ReactNode;
}

/**
 * Rodada 277: lista de folgas com busca por período (De/Até), mais recentes
 * primeiro, 5 linhas por vez (10/20/50/100 disponíveis; 100 abre em janela
 * separada) e exportação em Excel e PDF do que está filtrado. Usada nas
 * seções de folga da ficha do motorista e no histórico do ranking de folgas.
 */
export function FolgasLista({
  titulo,
  subtituloArquivo,
  cabecalhos,
  linhas,
  vazio,
  qtdInicial = 5,
  comAcoes = false,
}: {
  titulo: string;
  /** Complemento do título nos arquivos (ex.: nome do motorista). */
  subtituloArquivo?: string;
  cabecalhos: string[];
  linhas: LinhaFolga[];
  vazio: string;
  qtdInicial?: 5 | 10;
  /** Mostra uma coluna final com a ação de cada linha. */
  comAcoes?: boolean;
}) {
  // Meio-dia local: a data da folga é "só calendário" (meia-noite UTC) e,
  // no fuso do Brasil, cairia no dia anterior no filtro de período.
  const lista = useListaPaginada(
    linhas,
    (l) => `${l.data.slice(0, 10)}T12:00:00`,
    { qtdInicial },
  );

  function rotuloPeriodo(): string {
    const f = (d: string) =>
      new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
    if (!lista.dataInicio && !lista.dataFim) return "Qualquer período";
    return `${lista.dataInicio ? f(lista.dataInicio) : "início"} a ${lista.dataFim ? f(lista.dataFim) : "hoje"}`;
  }
  const nomeBase = `${titulo}${subtituloArquivo ? ` - ${subtituloArquivo}` : ""}`;
  const matriz = () => lista.itensFiltrados.map((l) => l.celulas);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          className="secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          disabled={lista.itensFiltrados.length === 0}
          onClick={() =>
            void baixarCsvTabela(
              `${nomeBase}.xlsx`.replace(/\s+/g, "-"),
              cabecalhos,
              matriz(),
              {
                titulo: nomeBase,
                subtitulo: `Período: ${rotuloPeriodo()}`,
              },
            )
          }
        >
          Baixar Excel
        </button>
        <button
          type="button"
          className="secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          disabled={lista.itensFiltrados.length === 0}
          onClick={() =>
            imprimirTabela(
              nomeBase,
              `Período: ${rotuloPeriodo()}`,
              cabecalhos,
              matriz(),
            )
          }
        >
          Baixar PDF
        </button>
      </div>
      <ControlesListaPaginada
        ordem={lista.ordem}
        onAlternarOrdem={lista.alternarOrdem}
        qtdPorPagina={lista.qtdPorPagina}
        onMudarQtdPorPagina={lista.mudarQtdPorPagina}
        pagina={lista.pagina}
        totalPaginas={lista.totalPaginas}
        popupAberto={lista.popupAberto}
        onAbrirPopup={lista.abrirPopup}
        onFecharPopup={lista.fecharPopup}
        onSelecionarPagina={lista.irParaPagina}
        filtroData={{
          dataInicio: lista.dataInicio,
          onDataInicio: lista.setDataInicio,
          dataFim: lista.dataFim,
          onDataFim: lista.setDataFim,
          rotulo: "data da folga",
        }}
        opcoesQtd={[5, 10, 20, 50, 100]}
        tituloPopup={titulo}
      >
        <table>
          <thead>
            <tr>
              {cabecalhos.map((c) => (
                <th key={c}>{c}</th>
              ))}
              {comAcoes && <th />}
            </tr>
          </thead>
          <tbody>
            {lista.itensExibidos.map((l) => (
              <tr
                key={l.id}
                style={l.cor ? { color: l.cor, fontWeight: 600 } : undefined}
              >
                {l.celulas.map((c, i) => (
                  <td key={i}>{c || "—"}</td>
                ))}
                {comAcoes && <td>{l.acao}</td>}
              </tr>
            ))}
            {lista.itensFiltrados.length === 0 && (
              <tr>
                <td colSpan={cabecalhos.length + (comAcoes ? 1 : 0)} style={{ color: "#000000" }}>
                  {linhas.length === 0 ? vazio : "Nenhuma folga no período filtrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ControlesListaPaginada>
    </div>
  );
}
