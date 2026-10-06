import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { baixarIndicadoresCsv, getIndicadoresPainel } from "../api/indicadores";
import type {
  IndicadoresDiaTendencia,
  IndicadoresPainel,
} from "../api/indicadores";
import { listMotoristas } from "../api/motoristas";
import type { Motorista } from "../api/types";
import { minParaHoras } from "../utils/formatarDuracao";
import { ModalDetalheTendencia, type PontoClicado } from "./TendenciaCharts";
import { baixarCsvTabela } from "../utils/exportarTabelaModal";
import { RankingCompletoPopup } from "./RankingCompletoPopup";
import { dataLocalIso } from '../utils/mascaras';

/**
 * "Indicadores" (Rodada 36, banco de horas na Rodada 37) , acompanhamento
 * de horas, horas extras, adicional noturno, ociosidade, banco de horas e
 * alertas, filtrável por motorista/indicador/todos. Pensado como um
 * analista de operação pensaria: onde está o excesso (extra/noturno), onde
 * está a ineficiência (% de espera sobre o total trabalhado) e onde está o
 * risco (alertas, sobretudo os de risco de fraude).
 *
 * Restrição explícita do usuário: SOMENTE horas/contagens, NUNCA valor
 * em R$ , a empresa fornece ao RH as horas completas e separadas, e o
 * RH decide o que paga e quanto fora da plataforma. Por isso não
 * existe nenhum campo de valor/hora nesta tela nem no backend.
 *
 * Rodada 72 , pedido do usuário: "separe o fechamento de ponto e
 * extração de relatório da parte de indicadores... leve os
 * indicadores e métricas para aba do painel". Antes esse conteúdo
 * inteiro vivia dentro de `IndicadoresPage.tsx` (nav "Fechamento"),
 * junto do botão de Fechamento (PDF) e das Solicitações de ajuste ,
 * misturando "fechar a folha e extrair relatório" com "acompanhar
 * métricas". Agora é seu próprio componente, embutido dentro do
 * Painel (`DashboardPage.tsx`), mesmo padrão já usado ali pra
 * `AlertasJornadaPage`/`AuditoriaPage` (uma seção com borda separando,
 * não uma aba nova no menu). `IndicadoresPage.tsx` ficou só com o
 * fechamento/extração de relatório e as solicitações de ajuste.
 *
 * Período padrão: início do mês corrente até hoje (acumulado do mês)
 * , pedido explícito do usuário, mesmo espírito do painel principal.
 */

type ChaveIndicador =
  | "todos"
  | "horas"
  | "extras"
  | "noturno"
  | "espera"
  | "indefinido"
  | "bancoHoras"
  | "alertas";

// Rodada 100 , pedido do usuário: opção de minimizar os gráficos do
// Painel, deixando só os cartões de indicador visíveis (a seção
// "Evolução ao longo do período" é a mais pesada visualmente da tela ,
// quem só quer bater o olho nos números não precisa rolar por todos os
// gráficos). Preferência persistida como a da sidebar (Layout.tsx) ,
// mesma chave de localStorage com fallback silencioso se indisponível.
const CHAVE_GRAFICOS_MINIMIZADOS = "fvfhorus.painelGraficosMinimizados";

function hoje(): string {
  return dataLocalIso(new Date());
}
function inicioDoMes(): string {
  const d = new Date();
  return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
}
function diasAtras(qtd: number): string {
  return new Date(Date.now() - qtd * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
// Pedido do usuário: mesmos atalhos de 7/30/90 dias do Painel de
// operação (TendenciaCharts/DashboardPage), além do período
// início/fim já existente nesta tela.
const OPCOES_PERIODO_RAPIDO = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];
// Rodada 130 , mesmos atalhos, mas com 60 dias (o padrão desta seção
// específica) no lugar.
const OPCOES_PERIODO_EVOLUCAO = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 60, rotulo: "60 dias" },
  { dias: 90, rotulo: "90 dias" },
];
function formatarDiaCurto(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}
function idGrafico(chave: ChaveIndicador): string {
  return `indicadores-grafico-${chave}`;
}

function CartaoIndicador({
  titulo,
  valor,
  subtitulo,
  cor,
  onClick,
  descricao,
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
  cor?: string;
  onClick?: () => void;
  // Rodada 113 — pedido do usuário: passar o mouse sobre o indicador
  // explica o que ele representa e quais alertas ele agrupa.
  descricao?: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "14px 18px",
        minWidth: 160,
        flex: "1 1 160px",
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={
        descricao
          ? onClick
            ? `${descricao} (clique para ver a evolução no período)`
            : descricao
          : onClick
            ? "Clique para ver a evolução deste indicador no período"
            : undefined
      }
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#000000",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: cor ?? "#111827",
          lineHeight: 1.3,
        }}
      >
        {valor}
      </div>
      {subtitulo && (
        <div style={{ fontSize: 12, color: "#000000" }}>{subtitulo}</div>
      )}
    </div>
  );
}

const ALTURA = 160;
const LARGURA = 720;
const MARGEM_ESQ = 36;
const MARGEM_BAIXO = 20;

/**
 * Gráfico de barras diário , usado por direção/espera/extras/noturno/alertas.
 * Aceita valores negativos (banco de horas usa uma linha à parte).
 *
 * Pedido do usuário: esta tela ("Indicadores") não tinha as mesmas
 * interações do Painel de operação , lá, clicar numa barra do gráfico de
 * evolução abre o detalhe (quais motoristas compõem aquele número). Aqui
 * `onClickDia` é opcional porque nem todo indicador desta tela tem um
 * endpoint de detalhe por trás (só direção/espera/indefinido reaproveitam
 * `ModalDetalheTendencia`, ver `PainelIndicadores()` abaixo).
 */
function GraficoBarrasDia({
  dias,
  campo,
  cor,
  sufixo,
  onClickDia,
}: {
  dias: IndicadoresDiaTendencia[];
  campo: keyof IndicadoresDiaTendencia;
  cor: string;
  sufixo: string;
  onClickDia?: (dia: string) => void;
}) {
  const valores = dias.map((d) => Number(d[campo]));
  const max = Math.max(1, ...valores);
  const larguraUtil = LARGURA - MARGEM_ESQ - 10;
  // Mesmo estilo de espaçamento dos gráficos de tendência do painel (TendenciaCharts):
  // cada dia ocupa um "slot" (passoDia) e a barra usa só uma fração dele, para não
  // virar um bloco sólido quando há poucos dias de dados.
  const passoDia = larguraUtil / Math.max(1, dias.length);
  const larguraBarra = Math.max(2, passoDia * 0.6);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      style={{ maxWidth: LARGURA }}
    >
      <line
        x1={MARGEM_ESQ}
        y1={ALTURA - MARGEM_BAIXO}
        x2={LARGURA}
        y2={ALTURA - MARGEM_BAIXO}
        stroke="#e5e7eb"
      />
      {dias.map((d, i) => {
        const v = Number(d[campo]);
        const alturaBarra = ((ALTURA - MARGEM_BAIXO - 10) * v) / max;
        const x = MARGEM_ESQ + i * passoDia + (passoDia - larguraBarra) / 2;
        const y = ALTURA - MARGEM_BAIXO - alturaBarra;
        return (
          <g key={d.dia}>
            <rect
              x={x}
              y={y}
              width={larguraBarra}
              height={alturaBarra}
              fill={cor}
              rx={1}
              style={{ cursor: onClickDia ? "pointer" : undefined }}
              onClick={onClickDia ? () => onClickDia(d.dia) : undefined}
            >
              <title>
                {d.dia}: {sufixo === "h" ? minParaHoras(v) : v}
                {onClickDia ? " (clique para ver o detalhe)" : ""}
              </title>
            </rect>
            {i % Math.ceil(dias.length / 10 || 1) === 0 && (
              <text
                x={x + larguraBarra / 2}
                y={ALTURA - 4}
                fontSize={9}
                fill="#000000"
                textAnchor="middle"
              >
                {formatarDiaCurto(d.dia)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Linha do saldo acumulado de banco de horas , pode ficar negativo, por isso é uma linha (não barra) com um eixo zero visível. */
function GraficoLinhaSaldoBancoHoras({
  dias,
}: {
  dias: IndicadoresDiaTendencia[];
}) {
  const valores = dias.map((d) => d.bancoHorasSaldoAcumuladoMin);
  const maxAbs = Math.max(1, ...valores.map((v) => Math.abs(v)));
  const alturaUtil = ALTURA - MARGEM_BAIXO - 10;
  const meio = MARGEM_BAIXO + alturaUtil / 2;
  const larguraUtil = LARGURA - MARGEM_ESQ - 10;
  const passoX = dias.length > 1 ? larguraUtil / (dias.length - 1) : 0;

  const pontos = dias.map((d, i) => {
    const x = MARGEM_ESQ + i * passoX;
    const y =
      meio - (d.bancoHorasSaldoAcumuladoMin / maxAbs) * (alturaUtil / 2);
    return { x, y, dia: d.dia, valor: d.bancoHorasSaldoAcumuladoMin };
  });
  const linha = pontos.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      style={{ maxWidth: LARGURA }}
    >
      <line
        x1={MARGEM_ESQ}
        y1={meio}
        x2={LARGURA}
        y2={meio}
        stroke="#d1d5db"
        strokeDasharray="3,3"
      />
      <polyline points={linha} fill="none" stroke="#059669" strokeWidth={2} />
      {pontos.map((p, i) => (
        <g key={p.dia}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#059669">
            <title>
              {p.dia}: {minParaHoras(p.valor)}
            </title>
          </circle>
          {i % Math.ceil(pontos.length / 10 || 1) === 0 && (
            <text x={p.x} y={ALTURA - 4} fontSize={9} fill="#000000">
              {formatarDiaCurto(p.dia)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function PainelIndicadores() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [motoristaId, setMotoristaId] = useState<string>("");
  const [indicador, setIndicador] = useState<ChaveIndicador>("todos");
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());
  const [painel, setPainel] = useState<IndicadoresPainel | null>(null);
  // Rodada 99 , pedido do usuário: trocar motorista/período/indicador
  // não pode "piscar" a tela inteira trocando os cartões e gráficos por
  // "Carregando…" (mesmo padrão já usado em outras páginas desde a
  // Rodada 77/99). `carregando` agora só controla a tela cheia da
  // carga INICIAL; `atualizando` é o estado de qualquer busca em
  // andamento (inclusive filtro trocado ou botão "Atualizar"), usado só
  // pra desabilitar botões e trocar o rótulo , nunca esconde o painel
  // já carregado.
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [graficosMinimizados, setGraficosMinimizados] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_GRAFICOS_MINIMIZADOS) === "1";
    } catch {
      return false;
    }
  });

  // Rodada 130 , pedido do usuário: "Evolução ao longo do período" tem
  // que deixar o usuário escolher o período, mas sempre começar
  // mostrando os últimos 60 dias , independente do filtro de
  // início/fim usado pelos cartões de indicador acima (que, por
  // padrão, é só o mês atual, curto demais pra ver uma tendência).
  // Por isso tem seu próprio estado de período e sua própria busca,
  // em vez de reusar `painel.tendenciaDiaria` (que vem presa ao
  // início/fim principal da tela).
  const [inicioEvolucao, setInicioEvolucao] = useState(diasAtras(60));
  const [fimEvolucao, setFimEvolucao] = useState(hoje());
  const [tendenciaDiaria, setTendenciaDiaria] = useState<
    IndicadoresDiaTendencia[]
  >([]);
  const [carregandoEvolucao, setCarregandoEvolucao] = useState(true);
  const scrollAlvo = useRef<ChaveIndicador | null>(null);
  const primeiraCargaFeita = useRef(false);
  // Pedido do usuário: mesma interação de clicar no gráfico pra ver o
  // detalhe do dia que já existe no Painel de operação (TendenciaCharts).
  const [pontoAberto, setPontoAberto] = useState<PontoClicado | null>(null);
  // Pedido do usuário: os rankings de espera/indefinido mostram um
  // recorte ajustável (1 a 10, começando sempre em 5) em vez de sempre
  // os 10 que o backend já devolve, e um popup dedicado com o relatório
  // COMPLETO (todos os motoristas do período, não só o top 10) pra
  // baixar.
  const [limiteRankingEspera, setLimiteRankingEspera] = useState(5);
  const [limiteRankingIndefinido, setLimiteRankingIndefinido] = useState(5);
  const [rankingCompletoAberto, setRankingCompletoAberto] = useState<
    "espera" | "indefinido" | null
  >(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAVE_GRAFICOS_MINIMIZADOS,
        graficosMinimizados ? "1" : "0",
      );
    } catch {
      // localStorage indisponível (modo privado, etc.) , só não persiste a preferência.
    }
  }, [graficosMinimizados]);

  useEffect(() => {
    listMotoristas()
      .then((r) => setMotoristas(r.dados))
      .catch(() => {
        /* seletor fica só com "Todos" , não impede a tela de funcionar */
      });
  }, []);

  // Rodada 73 , pedido do usuário: faltava um botão de "Atualizar"
  // aqui (o painel principal já tinha o dele) , antes só reagia a
  // filtro trocado, sem jeito de forçar uma releitura manual dos
  // mesmos filtros (ex.: depois que um motorista acabou de bater um
  // ponto e o gestor quer ver refletido sem trocar nada no filtro).
  const carregarPainel = useCallback(
    (cancelRef?: { cancelado: boolean }, comCarregamentoTelaCheia = false) => {
      if (comCarregamentoTelaCheia) setCarregando(true);
      setAtualizando(true);
      setErro(null);
      return getIndicadoresPainel(
        new Date(inicio).toISOString(),
        new Date(`${fim}T23:59:59.999Z`).toISOString(),
        motoristaId || undefined,
      )
        .then((r) => {
          if (!cancelRef?.cancelado) setPainel(r);
        })
        .catch(() => {
          if (!cancelRef?.cancelado)
            setErro("Não foi possível carregar os indicadores agora.");
        })
        .finally(() => {
          if (!cancelRef?.cancelado) {
            setCarregando(false);
            setAtualizando(false);
          }
        });
    },
    [inicio, fim, motoristaId],
  );

  useEffect(() => {
    const cancelRef = { cancelado: false };
    void carregarPainel(cancelRef, !primeiraCargaFeita.current);
    primeiraCargaFeita.current = true;
    return () => {
      cancelRef.cancelado = true;
    };
  }, [carregarPainel]);

  // Rodada 130 , busca independente da "Evolução ao longo do período"
  // , mesmo endpoint (não existe um dedicado só pra tendência), mas
  // com o período próprio desta seção, nunca o início/fim principal.
  useEffect(() => {
    const cancelRef = { cancelado: false };
    setCarregandoEvolucao(true);
    getIndicadoresPainel(
      new Date(inicioEvolucao).toISOString(),
      new Date(`${fimEvolucao}T23:59:59.999Z`).toISOString(),
      motoristaId || undefined,
    )
      .then((r) => {
        if (!cancelRef.cancelado) setTendenciaDiaria(r.tendenciaDiaria);
      })
      .catch(() => {
        /* a seção some com a lista vazia; os cartões acima continuam normais */
      })
      .finally(() => {
        if (!cancelRef.cancelado) setCarregandoEvolucao(false);
      });
    return () => {
      cancelRef.cancelado = true;
    };
  }, [inicioEvolucao, fimEvolucao, motoristaId]);

  // Depois que a página (re)renderiza com o gráfico correspondente já
  // no DOM , inclusive quando o clique no card trocou o filtro de
  // indicador e um gráfico que antes não existia acabou de aparecer ,
  // rola até ele suavemente.
  useEffect(() => {
    if (!scrollAlvo.current) return;
    const el = document.getElementById(idGrafico(scrollAlvo.current));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      scrollAlvo.current = null;
    }
  });

  function irParaGrafico(chave: ChaveIndicador) {
    setIndicador(chave);
    setGraficosMinimizados(false); // clicar num cartão precisa mostrar o gráfico correspondente, mesmo se estava minimizado
    scrollAlvo.current = chave;
  }

  const temBancoHoras = (painel?.motoristasComBancoHorasAtivo ?? 0) > 0;

  const mostrar = useMemo(
    () => ({
      horas: indicador === "todos" || indicador === "horas",
      extras: indicador === "todos" || indicador === "extras",
      noturno: indicador === "todos" || indicador === "noturno",
      espera: indicador === "todos" || indicador === "espera",
      indefinido: indicador === "todos" || indicador === "indefinido",
      bancoHoras:
        (indicador === "todos" || indicador === "bancoHoras") && temBancoHoras,
      alertas: indicador === "todos" || indicador === "alertas",
    }),
    [indicador, temBancoHoras],
  );

  // Pedido do usuário: relatório completo (todos os motoristas do
  // período, não só o top 10 do ranking resumido) pro popup dedicado.
  const rankingEsperaCompleto = useMemo(
    () =>
      [...(painel?.motoristas ?? [])]
        .filter((m) => m.esperaMin > 0)
        .sort((a, b) => b.esperaMin - a.esperaMin)
        .map((m) => ({
          motoristaId: m.motoristaId,
          nome: m.nome,
          valorMin: m.esperaMin,
        })),
    [painel],
  );
  const rankingIndefinidoCompleto = useMemo(
    () =>
      [...(painel?.motoristas ?? [])]
        .filter((m) => m.indefinidoMin > 0)
        .sort((a, b) => b.indefinidoMin - a.indefinidoMin)
        .map((m) => ({
          motoristaId: m.motoristaId,
          nome: m.nome,
          valorMin: m.indefinidoMin,
        })),
    [painel],
  );

  async function exportar() {
    setExportando(true);
    try {
      await baixarIndicadoresCsv(
        new Date(inicio).toISOString(),
        new Date(`${fim}T23:59:59.999Z`).toISOString(),
        motoristaId || undefined,
      );
    } catch {
      setErro("Não foi possível gerar o export agora.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <h2>Indicadores de Jornada</h2>
      <p style={{ color: "#000000", marginTop: -8 }}>
        Horas de direção, espera, extras, hora noturna e banco de horas por
        motorista, sem valores em R$. As horas completas e separadas ficam
        disponíveis para o RH decidir o pagamento fora da plataforma.
      </p>

      <div
        className="card"
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <label>
          Início
          <br />
          <input
            type="date"
            value={inicio}
            max={fim}
            onChange={(e) => setInicio(e.target.value)}
          />
        </label>
        <label>
          Fim
          <br />
          <input
            type="date"
            value={fim}
            min={inicio}
            max={hoje()}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          {OPCOES_PERIODO_RAPIDO.map((o) => (
            <button
              key={o.dias}
              type="button"
              className={
                inicio === diasAtras(o.dias) && fim === hoje()
                  ? ""
                  : "secondary"
              }
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => {
                setInicio(diasAtras(o.dias));
                setFim(hoje());
              }}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        <label>
          Motorista
          <br />
          <select
            value={motoristaId}
            onChange={(e) => setMotoristaId(e.target.value)}
          >
            <option value="">Todos os motoristas</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Indicador
          <br />
          <select
            value={indicador}
            onChange={(e) => setIndicador(e.target.value as ChaveIndicador)}
          >
            <option value="todos">Todos os indicadores</option>
            <option value="horas">Horas de direção/espera</option>
            <option value="extras">Horas extras</option>
            <option value="noturno">Hora noturna</option>
            <option value="espera">Tempo de espera (ociosidade)</option>
            <option value="indefinido">
              Tempo indefinido (sem etapa escolhida)
            </option>
            {temBancoHoras && (
              <option value="bancoHoras">Banco de horas</option>
            )}
            <option value="alertas">Alertas</option>
          </select>
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => carregarPainel()} disabled={atualizando}>
            {atualizando ? "Atualizando…" : "Atualizar"}
          </button>
          <button onClick={exportar} disabled={exportando || atualizando}>
            {exportando ? "Gerando…" : "Exportar CSV (RH)"}
          </button>
        </div>
      </div>

      {erro && <p style={{ color: "#b91c1c" }}>{erro}</p>}
      {carregando && <p>Carregando…</p>}

      {!carregando && painel && (
        <>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            {/* Total de horas , junta direção + espera (o tempo trabalhado inteiro), sempre visível
                independente do filtro de indicador, porque é o número-resumo que o gestor procura primeiro. */}
            <CartaoIndicador
              titulo="Total de horas"
              valor={minParaHoras(
                painel.totais.direcaoMin + painel.totais.esperaMin,
              )}
              subtitulo="Direção + espera no período"
              cor="#111827"
              descricao="Soma de todo o tempo com etapa definida como direção ou espera em carga/descarga no período filtrado (não inclui tempo indefinido nem descanso)."
            />
            {mostrar.horas && (
              <>
                <CartaoIndicador
                  titulo="Horas de direção"
                  valor={minParaHoras(painel.totais.direcaoMin)}
                  cor="#2563eb"
                  onClick={() => irParaGrafico("horas")}
                  descricao="Tempo com etapa INICIO_DIRECAO até FIM_DIRECAO no período, somado de todos os motoristas filtrados."
                />
                <CartaoIndicador
                  titulo="Horas de espera"
                  valor={minParaHoras(painel.totais.esperaMin)}
                  cor="#f59e0b"
                  onClick={() => irParaGrafico("espera")}
                  descricao="Tempo parado esperando carga/descarga (etapa ESPERA_CARGA_DESCARGA até o fim dela), somado de todos os motoristas filtrados."
                />
              </>
            )}
            {mostrar.extras && (
              <CartaoIndicador
                titulo="Horas extras"
                valor={minParaHoras(painel.totais.extraMin)}
                subtitulo={`${painel.totais.percentualExtraSobreDirecao}% da direção`}
                cor="#b45309"
                onClick={() => irParaGrafico("extras")}
                descricao="Parte das horas de direção que ultrapassa a jornada normal do motorista no dia, calculada conforme as regras sindicais/CCT vigentes para ele."
              />
            )}
            {mostrar.noturno && (
              <CartaoIndicador
                titulo="Hora noturna"
                valor={minParaHoras(painel.totais.noturnoMin)}
                subtitulo={`${painel.totais.percentualNoturnoSobreDirecao}% da direção`}
                cor="#7c3aed"
                onClick={() => irParaGrafico("noturno")}
                descricao="Parte das horas de direção que caiu no horário noturno (adicional previsto em lei/CCT), somada de todos os motoristas filtrados."
              />
            )}
            {mostrar.espera && (
              <CartaoIndicador
                titulo="Ociosidade (espera)"
                valor={`${painel.totais.percentualEsperaSobreTotal}%`}
                subtitulo="% do tempo trabalhado parado esperando carga/descarga"
                cor="#f59e0b"
                onClick={() => irParaGrafico("espera")}
                descricao="Percentual de tempo de espera sobre o total trabalhado (direção + espera). Sinal de ineficiência operacional, geralmente do lado do cliente/ponto de carga."
              />
            )}
            {mostrar.indefinido && (
              <CartaoIndicador
                titulo="Tempo indefinido"
                valor={minParaHoras(painel.totais.indefinidoMin)}
                subtitulo={`${painel.totais.percentualIndefinidoSobreJornada}% da jornada sem direção, descanso ou espera escolhidos`}
                cor="#ea580c"
                onClick={() => irParaGrafico("indefinido")}
                descricao="Tempo com a jornada aberta sem o motorista ter marcado direção, descanso ou espera no app. Sinal de uso incorreto do app ou de jornada esquecida em aberto."
              />
            )}
            {temBancoHoras &&
              (indicador === "todos" || indicador === "bancoHoras") && (
                <CartaoIndicador
                  titulo="Saldo do banco de horas"
                  valor={minParaHoras(painel.totais.bancoHoras.saldoMin)}
                  subtitulo={`${painel.motoristasComBancoHorasAtivo} motorista(s) com banco ativo`}
                  cor={
                    painel.totais.bancoHoras.saldoMin >= 0
                      ? "#059669"
                      : "#b91c1c"
                  }
                  onClick={() => irParaGrafico("bancoHoras")}
                  descricao="Crédito acumulado de hora extra menos débito já compensado/pago, somado dos motoristas com banco de horas ativo. Negativo significa débito do motorista com a empresa."
                />
              )}
            {mostrar.alertas && (
              <>
                <CartaoIndicador
                  titulo="Alertas críticos"
                  valor={String(painel.totais.alertas.criticos)}
                  cor="#b91c1c"
                  onClick={() => irParaGrafico("alertas")}
                  descricao="Severidade mais alta: o limite legal já foi ultrapassado (ex.: direção contínua, jornada de direção ou espera em carga/descarga acima do máximo). Exige ação imediata."
                />
                <CartaoIndicador
                  titulo="Alertas de atenção"
                  valor={String(painel.totais.alertas.atencao)}
                  cor="#b45309"
                  onClick={() => irParaGrafico("alertas")}
                  descricao="Severidade intermediária: ainda não ultrapassou o limite legal, mas está perto dele, ou merece acompanhamento (ex.: descanso interjornada insuficiente, ociosidade suspeita)."
                />
                <CartaoIndicador
                  titulo="Risco de fraude"
                  valor={String(painel.totais.alertas.riscoFraude)}
                  cor="#7c3aed"
                  onClick={() => irParaGrafico("alertas")}
                  descricao="Alertas de integridade do aparelho/GPS — não são sobre a jornada em si, são sobre a confiabilidade do que foi registrado (localização falsificada, relógio manipulado, odômetro regressivo etc.)."
                />
              </>
            )}
          </div>

          {mostrar.extras && painel.rankingHorasExtras.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>
                Ranking de mais horas extras no período
              </h3>
              <p style={{ color: "#000000", fontSize: 13, marginTop: -6 }}>
                Candidatos a rebalancear rota/escala, pois concentram o maior
                excesso sobre a jornada normal.
              </p>
              <ol>
                {painel.rankingHorasExtras.map((r) => (
                  <li key={r.motoristaId}>
                    {r.nome}: {minParaHoras(r.valorMin)}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(carregandoEvolucao || tendenciaDiaria.length > 0) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Evolução ao longo do período</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    disabled={tendenciaDiaria.length === 0}
                    onClick={() =>
                      baixarCsvTabela(
                        `evolucao-indicadores-${inicioEvolucao}-a-${fimEvolucao}.csv`,
                        [
                          "Dia",
                          "Direção (min)",
                          "Espera (min)",
                          "Extra (min)",
                          "Noturno (min)",
                          "Indefinido (min)",
                          "Alertas",
                          "Banco de horas , saldo acumulado (min)",
                        ],
                        tendenciaDiaria.map((d) => [
                          d.dia,
                          String(d.direcaoMin),
                          String(d.esperaMin),
                          String(d.extraMin),
                          String(d.noturnoMin),
                          String(d.indefinidoMin),
                          String(d.alertas),
                          String(d.bancoHorasSaldoAcumuladoMin),
                        ]),
                      )
                    }
                  >
                    Baixar CSV
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setGraficosMinimizados((atual) => !atual)}
                  >
                    {graficosMinimizados
                      ? "Mostrar gráficos"
                      : "Minimizar gráficos"}
                  </button>
                </div>
              </div>

              {/* Rodada 130 , pedido do usuário: período próprio desta
                  seção, sempre começando nos últimos 60 dias, com
                  jeito de trocar (datas ou atalhos) sem afetar os
                  cartões de indicador acima. */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  margin: "10px 0",
                }}
              >
                <label style={{ fontSize: 12 }}>
                  Início
                  <br />
                  <input
                    type="date"
                    value={inicioEvolucao}
                    max={fimEvolucao}
                    onChange={(e) => setInicioEvolucao(e.target.value)}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  Fim
                  <br />
                  <input
                    type="date"
                    value={fimEvolucao}
                    min={inicioEvolucao}
                    max={hoje()}
                    onChange={(e) => setFimEvolucao(e.target.value)}
                  />
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {OPCOES_PERIODO_EVOLUCAO.map((o) => (
                    <button
                      key={o.dias}
                      type="button"
                      className={
                        inicioEvolucao === diasAtras(o.dias) &&
                        fimEvolucao === hoje()
                          ? ""
                          : "secondary"
                      }
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => {
                        setInicioEvolucao(diasAtras(o.dias));
                        setFimEvolucao(hoje());
                      }}
                    >
                      {o.rotulo}
                    </button>
                  ))}
                </div>
              </div>

              {carregandoEvolucao ? (
                <p style={{ fontSize: 13, color: "#000000" }}>Carregando…</p>
              ) : tendenciaDiaria.length === 0 ? (
                <p style={{ fontSize: 13, color: "#000000" }}>
                  Sem dados no período selecionado.
                </p>
              ) : graficosMinimizados ? (
                <p style={{ fontSize: 13, color: "#000000", marginBottom: 0 }}>
                  Gráficos ocultos. Os cartões acima continuam atualizados.
                  Clique em "Mostrar gráficos" pra ver a evolução diária.
                </p>
              ) : (
                <>
                  {mostrar.horas && (
                    <div
                      id={idGrafico("horas")}
                      style={{ scrollMarginTop: 16 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Horas de direção por dia
                      </p>
                      <GraficoBarrasDia
                        dias={tendenciaDiaria}
                        campo="direcaoMin"
                        cor="#2563eb"
                        sufixo="h"
                        onClickDia={(dia) =>
                          setPontoAberto({
                            dia,
                            indicador: "horasDirecao",
                            rotulo: "Horas de direção",
                          })
                        }
                      />
                    </div>
                  )}
                  {mostrar.espera && (
                    <div
                      id={idGrafico("espera")}
                      style={{ scrollMarginTop: 16, marginTop: 12 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Horas de espera por dia (ociosidade)
                      </p>
                      <GraficoBarrasDia
                        dias={tendenciaDiaria}
                        campo="esperaMin"
                        cor="#f59e0b"
                        sufixo="h"
                        onClickDia={(dia) =>
                          setPontoAberto({
                            dia,
                            indicador: "horasEspera",
                            rotulo: "Horas de espera",
                          })
                        }
                      />
                    </div>
                  )}
                  {mostrar.indefinido && (
                    <div
                      id={idGrafico("indefinido")}
                      style={{ scrollMarginTop: 16, marginTop: 12 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Tempo indefinido por dia (jornada aberta sem direção,
                        descanso ou espera escolhidos)
                      </p>
                      <GraficoBarrasDia
                        dias={tendenciaDiaria}
                        campo="indefinidoMin"
                        cor="#ea580c"
                        sufixo="h"
                        onClickDia={(dia) =>
                          setPontoAberto({
                            dia,
                            indicador: "horasIndefinido",
                            rotulo: "Tempo indefinido",
                          })
                        }
                      />
                    </div>
                  )}
                  {mostrar.extras && (
                    <div
                      id={idGrafico("extras")}
                      style={{ scrollMarginTop: 16, marginTop: 12 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Horas extras por dia
                      </p>
                      <GraficoBarrasDia
                        dias={tendenciaDiaria}
                        campo="extraMin"
                        cor="#b45309"
                        sufixo="h"
                      />
                    </div>
                  )}
                  {mostrar.noturno && (
                    <div
                      id={idGrafico("noturno")}
                      style={{ scrollMarginTop: 16, marginTop: 12 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Hora noturna por dia
                      </p>
                      <GraficoBarrasDia
                        dias={tendenciaDiaria}
                        campo="noturnoMin"
                        cor="#7c3aed"
                        sufixo="h"
                      />
                    </div>
                  )}
                  {mostrar.bancoHoras && (
                    <div
                      id={idGrafico("bancoHoras")}
                      style={{ scrollMarginTop: 16, marginTop: 12 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Saldo acumulado de banco de horas no período (crédito de
                        hora extra − débito de compensação/pagamento)
                      </p>
                      <GraficoLinhaSaldoBancoHoras
                        dias={tendenciaDiaria}
                      />
                    </div>
                  )}
                  {mostrar.alertas && (
                    <div
                      id={idGrafico("alertas")}
                      style={{ scrollMarginTop: 16, marginTop: 12 }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 4,
                        }}
                      >
                        Alertas por dia
                      </p>
                      <GraficoBarrasDia
                        dias={tendenciaDiaria}
                        campo="alertas"
                        cor="#b91c1c"
                        sufixo=""
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {mostrar.indefinido && painel.rankingTempoIndefinido.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  Ranking de mais tempo indefinido (jornada aberta sem escolher
                  etapa)
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12 }}>
                    Mostrar top{" "}
                    <select
                      value={limiteRankingIndefinido}
                      onChange={(e) =>
                        setLimiteRankingIndefinido(Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setRankingCompletoAberto("indefinido")}
                  >
                    Relatório completo
                  </button>
                </div>
              </div>
              <p style={{ color: "#000000", fontSize: 13, marginTop: -6 }}>
                Sinal de que o motorista está deixando a jornada aberta sem
                marcar direção, descanso ou espera. Candidato a orientação sobre
                o uso do app, ou a fechar jornadas esquecidas em aberto. O
                ranking abaixo mostra até 10 motoristas; o relatório completo
                traz todos.
              </p>
              <ol>
                {painel.rankingTempoIndefinido
                  .slice(0, limiteRankingIndefinido)
                  .map((r) => (
                    <li key={r.motoristaId}>
                      {r.nome}: {minParaHoras(r.valorMin)}
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {mostrar.espera && painel.rankingTempoEspera.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  Ranking de mais tempo parado esperando carga/descarga
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ fontSize: 12 }}>
                    Mostrar top{" "}
                    <select
                      value={limiteRankingEspera}
                      onChange={(e) =>
                        setLimiteRankingEspera(Number(e.target.value))
                      }
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setRankingCompletoAberto("espera")}
                  >
                    Relatório completo
                  </button>
                </div>
              </div>
              <p style={{ color: "#000000", fontSize: 13, marginTop: -6 }}>
                Sinal de ineficiência operacional, geralmente do lado do
                cliente/ponto de carga, não do motorista. O ranking abaixo
                mostra até 10 motoristas; o relatório completo traz todos.
              </p>
              <ol>
                {painel.rankingTempoEspera
                  .slice(0, limiteRankingEspera)
                  .map((r) => (
                    <li key={r.motoristaId}>
                      {r.nome}: {minParaHoras(r.valorMin)}
                    </li>
                  ))}
              </ol>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Por motorista</h3>
            {painel.motoristas.length === 0 ? (
              <p style={{ color: "#000000" }}>
                Nenhum motorista com dados no período.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Motorista</th>
                    {mostrar.horas && <th>Direção</th>}
                    {mostrar.horas && <th>Espera</th>}
                    {mostrar.extras && <th>Extras</th>}
                    {mostrar.extras && <th>% extra/direção</th>}
                    {mostrar.noturno && <th>Noturno</th>}
                    {mostrar.espera && <th>% ociosidade</th>}
                    {mostrar.bancoHoras && <th>Banco de horas (saldo)</th>}
                    {mostrar.alertas && <th>Alertas (crít./atenção/fraude)</th>}
                  </tr>
                </thead>
                <tbody>
                  {painel.motoristas.map((m) => (
                    <tr key={m.motoristaId}>
                      <td>
                        <Link to={`/motoristas/${m.motoristaId}`}>
                          {m.nome}
                        </Link>
                      </td>
                      {mostrar.horas && <td>{minParaHoras(m.direcaoMin)}</td>}
                      {mostrar.horas && <td>{minParaHoras(m.esperaMin)}</td>}
                      {mostrar.extras && <td>{minParaHoras(m.extraMin)}</td>}
                      {mostrar.extras && (
                        <td>{m.percentualExtraSobreDirecao}%</td>
                      )}
                      {mostrar.noturno && <td>{minParaHoras(m.noturnoMin)}</td>}
                      {mostrar.espera && (
                        <td>{m.percentualEsperaSobreTotal}%</td>
                      )}
                      {mostrar.bancoHoras && (
                        <td>
                          {m.bancoHoras.ativo
                            ? minParaHoras(m.bancoHoras.saldoMin)
                            : ","}
                        </td>
                      )}
                      {mostrar.alertas && (
                        <td>
                          {m.alertas.criticos} / {m.alertas.atencao} /{" "}
                          {m.alertas.riscoFraude}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {pontoAberto && (
        <ModalDetalheTendencia
          ponto={pontoAberto}
          onFechar={() => setPontoAberto(null)}
        />
      )}

      {rankingCompletoAberto === "espera" && (
        <RankingCompletoPopup
          titulo="Tempo parado esperando carga/descarga"
          itens={rankingEsperaCompleto}
          onFechar={() => setRankingCompletoAberto(null)}
        />
      )}
      {rankingCompletoAberto === "indefinido" && (
        <RankingCompletoPopup
          titulo="Tempo indefinido"
          itens={rankingIndefinidoCompleto}
          onFechar={() => setRankingCompletoAberto(null)}
        />
      )}
    </div>
  );
}
