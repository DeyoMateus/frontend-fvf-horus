import { useMemo, useState } from "react";

export type QtdPorPagina = 10 | 20 | 50 | 100;
export type OrdemData = "recente" | "antigo";

export interface ListaPaginadaResultado<T> {
  ordem: OrdemData;
  alternarOrdem: () => void;
  qtdPorPagina: QtdPorPagina;
  mudarQtdPorPagina: (qtd: QtdPorPagina) => void;
  pagina: number;
  irParaPagina: (pagina: number) => void;
  totalPaginas: number;
  popupAberto: boolean;
  abrirPopup: () => void;
  fecharPopup: () => void;
  itensFiltrados: T[];
  itensExibidos: T[];
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataFim: string;
  setDataFim: (v: string) => void;
}

/**
 * Hook genérico (Rodada 108) , pedido do usuário: "coloque essa lógica
 * de pop up dedicado para todos os recursos que tragam informação em
 * tabelas, e dê a ele a opção de ordenar do mais recente para o mais
 * antigo além dos filtros de data". Antes disso cada tela reimplementava
 * (ou simplesmente não tinha) paginação/ordenação/filtro de período na
 * mão , isto generaliza o padrão que já existia em duas tabelas de
 * `MotoristaDetailPage.tsx` (Rodada 77/107: "mostrar N por vez" + popup
 * dedicado de página via `PaginacaoPopup.tsx`) e acrescenta ordenação
 * (mais recente/mais antigo primeiro, alternável) e filtro de período
 * (De/Até), reaproveitável em qualquer tabela de listagem do painel.
 *
 * Não faz chamada de rede nem paginação no backend , opera sobre um
 * array já carregado em memória (`itens`), igual ao padrão anterior.
 * Quem usa passa `obterData`, a função que extrai a data relevante de
 * cada item (ex.: `(r) => r.createdAt`), já que o nome do campo varia
 * por recurso (`createdAt`, `timestampEvento`, `data`, etc.).
 */
export function useListaPaginada<T>(
  itens: T[],
  obterData: (item: T) => string | Date | null | undefined,
  opts?: {
    qtdInicial?: QtdPorPagina;
    ordemInicial?: OrdemData;
    /** Desempate crescente quando duas datas são iguais (ex.: `sequencial` do ledger). */
    desempate?: (a: T, b: T) => number;
  },
): ListaPaginadaResultado<T> {
  const [ordem, setOrdem] = useState<OrdemData>(
    opts?.ordemInicial ?? "recente",
  );
  const [qtdPorPagina, setQtdPorPaginaState] = useState<QtdPorPagina>(
    opts?.qtdInicial ?? 10,
  );
  const [pagina, setPagina] = useState(1);
  const [popupAberto, setPopupAberto] = useState(false);
  const [dataInicio, setDataInicioState] = useState("");
  const [dataFim, setDataFimState] = useState("");

  const itensFiltrados = useMemo(() => {
    let resultado = itens;
    if (dataInicio) {
      const inicioMs = new Date(`${dataInicio}T00:00:00`).getTime();
      resultado = resultado.filter((item) => {
        const d = obterData(item);
        return d != null && new Date(d).getTime() >= inicioMs;
      });
    }
    if (dataFim) {
      const fimMs = new Date(`${dataFim}T23:59:59`).getTime();
      resultado = resultado.filter((item) => {
        const d = obterData(item);
        return d != null && new Date(d).getTime() <= fimMs;
      });
    }
    return [...resultado].sort((a, b) => {
      const da = obterData(a);
      const db = obterData(b);
      const ta = da != null ? new Date(da).getTime() : 0;
      const tb = db != null ? new Date(db).getTime() : 0;
      const diff = ordem === "recente" ? tb - ta : ta - tb;
      if (diff !== 0 || !opts?.desempate) return diff;
      const d = opts.desempate(a, b);
      return ordem === "recente" ? -d : d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, dataInicio, dataFim, ordem]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(itensFiltrados.length / qtdPorPagina),
  );
  const paginaEfetiva = Math.min(pagina, totalPaginas);
  const itensExibidos = itensFiltrados.slice(
    (paginaEfetiva - 1) * qtdPorPagina,
    paginaEfetiva * qtdPorPagina,
  );

  function mudarQtdPorPagina(qtd: QtdPorPagina) {
    setQtdPorPaginaState(qtd);
    setPagina(1);
  }
  function alternarOrdem() {
    setOrdem((o) => (o === "recente" ? "antigo" : "recente"));
    setPagina(1);
  }
  function setDataInicio(v: string) {
    setDataInicioState(v);
    setPagina(1);
  }
  function setDataFim(v: string) {
    setDataFimState(v);
    setPagina(1);
  }

  return {
    ordem,
    alternarOrdem,
    qtdPorPagina,
    mudarQtdPorPagina,
    pagina: paginaEfetiva,
    irParaPagina: setPagina,
    totalPaginas,
    popupAberto,
    abrirPopup: () => setPopupAberto(true),
    fecharPopup: () => setPopupAberto(false),
    itensFiltrados,
    itensExibidos,
    dataInicio,
    setDataInicio,
    dataFim,
    setDataFim,
  };
}
