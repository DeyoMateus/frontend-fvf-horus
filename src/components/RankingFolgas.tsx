import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  FolgaDashboard,
  ItemFolgaDashboard,
} from "../api/folgaDashboard";
import { baixarCsvTabela, imprimirTabela } from "../utils/exportarTabelaModal";
import { ListaEmPopup } from "./ListaEmPopup";
import { Paginador } from "./Paginador";
import { PaginacaoPopup } from "./PaginacaoPopup";
import { HistoricoFolgasMotorista } from "./HistoricoFolgasMotorista";

type Qtd = 10 | 20 | 50 | 100;

const ROTULO_SITUACAO: Record<ItemFolgaDashboard["situacao"], string> = {
  URGENTE: "Urgente: sem folga na janela",
  ACIMA_DO_LIMITE: "Acima do limite",
  VENCIDA: "Folga vencida",
  EM_DIA: "Em dia",
  MARCADA: "Folga marcada",
  SEM_REGRA: "Sem regra configurada",
};
const COR_SITUACAO: Record<ItemFolgaDashboard["situacao"], string> = {
  URGENTE: "#7f1d1d",
  ACIMA_DO_LIMITE: "#b91c1c",
  VENCIDA: "#b45309",
  EM_DIA: "#15803d",
  MARCADA: "#1d4ed8",
  SEM_REGRA: "#6b7280",
};

function fmtDia(iso: string | null): string {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}

const CABECALHOS = [
  "Posição",
  "Motorista",
  "Folgas vencidas",
  "Dias trabalhados",
  "Empresa",
  "CNPJ",
  "Regra de folga",
  "Dias para ter direito à folga",
  "Janela de busca de folga (dias)",
  "Limite de folgas vencidas (atenção)",
  "Situação",
  "Última folga",
  "Próxima folga marcada",
];

function linha(m: ItemFolgaDashboard): string[] {
  return [
    String(m.posicao),
    m.nome,
    String(m.folgasVencidas),
    String(m.diasTrabalhados),
    m.empresa,
    m.empresaCnpj,
    m.regraNome ?? "",
    m.diasParaFolga === null ? "" : String(m.diasParaFolga),
    m.diasParaFolga === null ? "" : String(m.janelaDias),
    m.limiteFolgasVencidas === null ? "" : String(m.limiteFolgasVencidas),
    ROTULO_SITUACAO[m.situacao],
    fmtDia(m.ultimaFolga),
    fmtDia(m.proximaFolga),
  ];
}

/**
 * Rodada 275: ranking dos motoristas que mais precisam de folga (mais dias
 * sem folga primeiro). 10 linhas por vez; "100 por vez" abre numa janela
 * separada, como as outras listas do painel. Exporta em Excel e PDF
 * (impressão), sempre a lista inteira, não só a página.
 */
export function RankingFolgas({ dados }: { dados: FolgaDashboard }) {
  const [qtd, setQtd] = useState<Qtd>(10);
  const [pagina, setPagina] = useState(1);
  const [seletor, setSeletor] = useState(false);
  const [historico, setHistorico] = useState<ItemFolgaDashboard | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const [params] = useSearchParams();

  // Vindo do sininho (?secao=ranking), rola até o ranking.
  useEffect(() => {
    if (params.get("secao") === "ranking") {
      raiz.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [params]);

  const lista = dados.ranking;
  const totalPaginas = Math.max(1, Math.ceil(lista.length / qtd));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = useMemo(
    () => lista.slice((paginaAtual - 1) * qtd, paginaAtual * qtd),
    [lista, paginaAtual, qtd],
  );
  const todasLinhas = useMemo(() => lista.map(linha), [lista]);

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
      <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
        Mostrar{" "}
        <select
          value={qtd}
          onChange={(e) => {
            setQtd(Number(e.target.value) as Qtd);
            setPagina(1);
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>{" "}
        por vez
      </label>
      {totalPaginas > 1 && (
        <Paginador
          pagina={paginaAtual}
          totalPaginas={totalPaginas}
          onMudarPagina={setPagina}
          onAbrirSeletor={() => setSeletor(true)}
          sufixo={`(${lista.length} motoristas)`}
        />
      )}
      {seletor && (
        <PaginacaoPopup
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          onSelecionarPagina={setPagina}
          onFechar={() => setSeletor(false)}
        />
      )}
    </div>
  );

  const tabela = (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Motorista</th>
          <th>Folgas vencidas</th>
          <th>Dias trabalhados</th>
          <th>Empresa / CNPJ</th>
          <th>Situação</th>
          <th>Última folga</th>
        </tr>
      </thead>
      <tbody>
        {visiveis.map((m) => (
          <tr key={m.motoristaId}>
            <td>{m.posicao}</td>
            <td>
              <button
                type="button"
                className="link-button"
                title="Ver o histórico de folgas deste motorista"
                onClick={() => setHistorico(m)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#1d4ed8",
                  textDecoration: "underline",
                  cursor: "pointer",
                  font: "inherit",
                  width: "auto",
                  height: "auto",
                }}
              >
                {m.nome}
              </button>
            </td>
            <td>
              {m.folgasVencidas}
              {m.limiteFolgasVencidas !== null &&
                ` (limite ${m.limiteFolgasVencidas})`}
            </td>
            <td>
              {m.diasTrabalhados}
              {m.diasParaFolga !== null && ` de ${m.diasParaFolga}`}
            </td>
            <td>
              {m.empresa}
              <div style={{ fontSize: 11 }}>{m.empresaCnpj}</div>
            </td>
            <td style={{ color: COR_SITUACAO[m.situacao], fontWeight: 600 }}>
              {ROTULO_SITUACAO[m.situacao]}
            </td>
            <td>{fmtDia(m.ultimaFolga) || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="card" ref={raiz} id="ranking-folgas" data-tour="folgas-ranking">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div>
          <strong>Ranking de folgas</strong>
          <div style={{ fontSize: 12 }}>
            Quem está há mais tempo sem folga aparece primeiro.
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Apoio ao planejamento das folgas, calculado com os registros e as regras
            cadastradas. Confira cada caso antes de decidir; a lista não aponta, por si
            só, descumprimento de norma.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            disabled={lista.length === 0}
            onClick={() =>
              void baixarCsvTabela(
                "ranking-de-folgas.xlsx",
                CABECALHOS,
                todasLinhas,
                { titulo: "Ranking de folgas" },
              )
            }
          >
            Baixar Excel
          </button>
          <button
            type="button"
            className="secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            disabled={lista.length === 0}
            onClick={() =>
              imprimirTabela(
                "Ranking de folgas",
                "Motoristas ordenados por dias sem folga",
                CABECALHOS,
                todasLinhas,
              )
            }
          >
            Baixar PDF
          </button>
        </div>
      </div>

      {historico && (
        <HistoricoFolgasMotorista
          motorista={historico}
          onFechar={() => setHistorico(null)}
        />
      )}

      {lista.length === 0 ? (
        <p style={{ fontSize: 13 }}>Nenhum motorista para classificar agora.</p>
      ) : (
        <ListaEmPopup
          ativo={qtd === 100}
          titulo="Ranking de folgas"
          onFechar={() => {
            setQtd(50);
            setPagina(1);
          }}
        >
          {barra}
          {tabela}
        </ListaEmPopup>
      )}
    </div>
  );
}
