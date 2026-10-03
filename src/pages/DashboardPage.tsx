import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardDetalhe,
  getDashboardResumo,
  getDashboardTendencia,
} from "../api/dashboard";
import { listAlertasByEmpresa } from "../api/alertas";
import { GraficoTendencia } from "../components/TendenciaCharts";
import { AlertasJornadaPage } from "./AlertasJornadaPage";
import { PainelIndicadores } from "../components/PainelIndicadores";
import {
  baixarCsvTabela,
  imprimirTabela,
  travarRolagemFundo,
} from "../utils/exportarTabelaModal";
import type {
  AlertaJornada,
  CardPainel,
  DashboardDetalheCard,
  DashboardResumo,
  DashboardTendenciaDia,
  TipoAlertaJornada,
} from "../api/types";

const INTERVALO_ATUALIZACAO_MS = 30_000; // "tempo real" o suficiente pra um painel de gestão , não precisa de websocket pra isto

// Pedido explícito do usuário: cards de risco/alertas piscam e pulsam
// quando existe alerta em aberto (não visualizado) há mais de 10
// minutos , chama mais atenção que só o número mudando de cor.
const LIMIAR_PULSAR_MS = 10 * 60 * 1000;

const TIPOS_FRAUDE: TipoAlertaJornada[] = [
  "VELOCIDADE_IMPOSSIVEL_ENTRE_REGISTROS",
  "RELOGIO_DISPOSITIVO_SUSPEITO",
  "SEQUENCIA_JORNADA_MUITO_RAPIDA",
  "ODOMETRO_REGRESSIVO",
  "INTEGRIDADE_DISPOSITIVO_SUSPEITA",
  "OCIOSIDADE_DIRECAO_SUSPEITA",
  // Rodada 87 , mesma categoria (antifraude), evento sincronizado com
  // atraso suspeito demais pra ser só "ficou sem sinal".
  "SINCRONIZACAO_TARDIA_SUSPEITA",
  // Rodada 92 , divergência de relógio confirmada retroativamente
  // contra uma amostra de hora confiável do mesmo boot do aparelho.
  "RELOGIO_DIVERGENTE_DETECTADO_RETROATIVAMENTE",
];

function existeAlertaAbertoHaMuitoTempo(
  alertas: AlertaJornada[],
  filtro: (a: AlertaJornada) => boolean,
): boolean {
  const agora = Date.now();
  return alertas.some(
    (a) =>
      filtro(a) && agora - new Date(a.createdAt).getTime() >= LIMIAR_PULSAR_MS,
  );
}

const ROTULO_TIPO_ALERTA: Record<TipoAlertaJornada, string> = {
  DIRECAO_CONTINUA_PROXIMA_LIMITE: "Direção contínua perto do limite",
  DIRECAO_CONTINUA_EXCEDIDA: "Direção contínua excedida",
  JORNADA_DIRECAO_PROXIMA_LIMITE: "Jornada de direção perto do limite",
  JORNADA_DIRECAO_EXCEDIDA: "Jornada de direção excedida",
  ESPERA_PROXIMA_LIMITE: "Espera perto do limite",
  ESPERA_LIMITE_LEGAL_ATINGIDO: "Limite legal de espera atingido",
  OCIOSIDADE_DIRECAO_SUSPEITA: 'Ociosidade suspeita em "Em direção"',
  VELOCIDADE_IMPOSSIVEL_ENTRE_REGISTROS:
    "Velocidade impossível entre registros",
  RELOGIO_DISPOSITIVO_SUSPEITO: "Relógio do aparelho suspeito",
  SEQUENCIA_JORNADA_MUITO_RAPIDA: "Sequência de batidas muito rápida",
  ODOMETRO_REGRESSIVO: "Odômetro regressivo",
  INTEGRIDADE_DISPOSITIVO_SUSPEITA: "Integridade do aparelho suspeita",
  PONTO_REGISTRADO_EM_DIA_DE_FOLGA: "Ponto batido em dia de folga concedida",
  ENTREGA_FORA_DA_CERCA_VIRTUAL: "Entrega fora da cerca virtual (500m)",
  TEMPO_INDEFINIDO_PROXIMO_LIMITE: "Tempo indefinido (sem etapa escolhida)",
  TEMPO_INDEFINIDO_PROLONGADO:
    "Tempo indefinido prolongado (sem etapa escolhida)",
  DESCANSO_INTERJORNADA_INSUFICIENTE:
    "Descanso entre jornadas abaixo do mínimo legal",
  CTE_EM_ABERTO_SEM_VINCULO_RECENTE:
    "CT-e em aberto sem vínculo recente de direção",
  SINCRONIZACAO_TARDIA_SUSPEITA: "Evento sincronizado com atraso suspeito",
  RELOGIO_DIVERGENTE_DETECTADO_RETROATIVAMENTE:
    "Relógio divergente confirmado após reconectar (retroativo)",
};

const OPCOES_PERIODO = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

// Pedido do usuário: ao clicar nos atalhos de 7/30/90 dias, os campos de
// "período personalizado" devem se ajustar pra mostrar o intervalo
// equivalente , igual já acontecia em Alertas de jornada , em vez de
// simplesmente ficarem em branco.
function diasAtrasISO(qtd: number): string {
  const d = new Date();
  d.setDate(d.getDate() - qtd);
  return d.toISOString().slice(0, 10);
}
function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const ROTULO_SEVERIDADE: Record<string, string> = {
  CRITICO: "#b91c1c",
  ATENCAO: "#b45309",
  INFO: "#9ca3af",
};

function CartaoMetrica({
  titulo,
  valor,
  cor,
  subtitulo,
  onClick,
  pulsando,
  descricao,
}: {
  titulo: string;
  valor: number | string;
  cor?: string;
  subtitulo?: string;
  onClick?: () => void;
  pulsando?: boolean;
  // Rodada 113 — pedido do usuário: passar o mouse sobre o indicador
  // explica o que ele representa e quais alertas ele agrupa.
  descricao?: string;
}) {
  return (
    <div
      className={`card${pulsando ? " card-pulsando" : ""}`}
      title={
        pulsando
          ? `Alerta em aberto há mais de 10 minutos${descricao ? ` — ${descricao}` : ""}`
          : descricao
            ? onClick
              ? `${descricao} (clique para ver os motoristas)`
              : descricao
            : onClick
              ? "Clique para ver os motoristas"
              : undefined
      }
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
      style={{
        padding: "14px 18px",
        minWidth: 140,
        flex: "1 1 140px",
        cursor: onClick ? "pointer" : undefined,
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
          fontSize: 28,
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

interface EstadoDetalhe {
  card: CardPainel;
  titulo: string;
}

function PainelDetalheCard({
  estado,
  onFechar,
}: {
  estado: EstadoDetalhe;
  onFechar: () => void;
}) {
  const [dados, setDados] = useState<DashboardDetalheCard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    getDashboardDetalhe(estado.card)
      .then((r) => {
        if (!cancelado) setDados(r);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a lista agora.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [estado.card]);

  // Pedido do usuário: travar a rolagem da tela de trás enquanto o popup
  // estiver aberto (o clique de fora já era bloqueado).
  useEffect(() => travarRolagemFundo(), []);

  // Pedido do usuário: poder baixar (CSV) ou imprimir os dados deste
  // popup, a partir do mesmo `dados.itens` já carregado na tela.
  let cabecalhosExportacao: string[] = [];
  let linhasExportacao: string[][] = [];
  if (dados?.tipo === "motoristas") {
    cabecalhosExportacao = ["Motorista", "Detalhe"];
    linhasExportacao = dados.itens.map((m) => [m.nome, m.detalhe ?? ""]);
  } else if (dados?.tipo === "alertas") {
    cabecalhosExportacao = ["Motorista", "Alerta", "Quando"];
    linhasExportacao = dados.itens.map((a) => [
      a.nome,
      ROTULO_TIPO_ALERTA[a.tipo] ?? a.tipo,
      new Date(a.createdAt).toLocaleString("pt-BR"),
    ]);
  }
  const temDadosParaExportar = linhasExportacao.length > 0;

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.35)",
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
          width: "min(560px, 92vw)",
          maxHeight: "80vh",
          overflow: "auto",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <strong style={{ fontSize: 15 }}>{estado.titulo}</strong>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={!temDadosParaExportar}
              onClick={() =>
                baixarCsvTabela(
                  `${estado.titulo}.csv`,
                  cabecalhosExportacao,
                  linhasExportacao,
                )
              }
            >
              Baixar CSV
            </button>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={!temDadosParaExportar}
              onClick={() =>
                imprimirTabela(
                  estado.titulo,
                  null,
                  cabecalhosExportacao,
                  linhasExportacao,
                )
              }
            >
              Imprimir
            </button>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>

        {carregando && (
          <p style={{ fontSize: 13, color: "#000000" }}>Carregando…</p>
        )}
        {erro && <p style={{ fontSize: 13, color: "#b91c1c" }}>{erro}</p>}

        {!carregando && !erro && dados && dados.itens.length === 0 && (
          <p style={{ fontSize: 13, color: "#000000" }}>
            Nenhum motorista nessa condição agora.
          </p>
        )}

        {!carregando &&
          !erro &&
          dados?.tipo === "motoristas" &&
          dados.itens.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((m) => (
                  <tr key={m.motoristaId}>
                    <td>
                      <Link
                        to={`/motoristas/${m.motoristaId}`}
                        onClick={onFechar}
                      >
                        {m.nome}
                      </Link>
                    </td>
                    <td style={{ fontSize: 12, color: "#000000" }}>
                      {m.detalhe ?? ","}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        {!carregando &&
          !erro &&
          dados?.tipo === "alertas" &&
          dados.itens.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Alerta</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {dados.itens.map((a) => (
                  <tr key={a.alertaId}>
                    <td>
                      <Link
                        to={`/motoristas/${a.motoristaId}?secao=alertas-jornada`}
                        onClick={onFechar}
                      >
                        {a.nome}
                      </Link>
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: ROTULO_SEVERIDADE[a.severidade] ?? "#111827",
                      }}
                    >
                      {ROTULO_TIPO_ALERTA[a.tipo] ?? a.tipo}
                    </td>
                    <td style={{ fontSize: 12, color: "#000000" }}>
                      {new Date(a.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

/**
 * Painel de acompanhamento em tempo real (polling a cada 30s, com
 * botão de atualização manual pra quando o gestor não quer esperar) +
 * evolução histórica, pensado pra ficar aberto numa tela da operação:
 * "quantos motoristas estão em quê agora" e "os riscos estão
 * melhorando ou piorando com o tempo". Clicar em qualquer card "Agora"
 * ou "Risco agora" abre a lista de motoristas/alertas por trás daquele
 * número. Complementa (não substitui) a lista de alertas em /alertas,
 * que continua sendo onde o gestor trata cada alerta individualmente.
 */
export function DashboardPage() {
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [tendencia, setTendencia] = useState<DashboardTendenciaDia[]>([]);
  const [periodoDias, setPeriodoDias] = useState(30);
  // Pedido do usuário: além dos atalhos de 7/30/90 dias, poder extrair
  // (ver/baixar) os dados por um período exato que o usuário define.
  // `null` = usando um dos atalhos (periodoDias); preenchido = período
  // personalizado, que manda pro backend em vez de `dias`.
  const [periodoPersonalizadoRascunho, setPeriodoPersonalizadoRascunho] =
    useState<{ desde: string; ate: string }>({ desde: "", ate: "" });
  const [periodoPersonalizado, setPeriodoPersonalizado] = useState<{
    desde: string;
    ate: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizandoManual, setAtualizandoManual] = useState(false);
  const [detalheAberto, setDetalheAberto] = useState<EstadoDetalhe | null>(
    null,
  );
  const [alertasAbertos, setAlertasAbertos] = useState<AlertaJornada[]>([]);

  async function carregarResumo() {
    try {
      setResumo(await getDashboardResumo());
      setErro(null);
    } catch {
      setErro("Não foi possível atualizar o resumo agora.");
    }
  }

  async function carregarAlertasAbertos() {
    try {
      setAlertasAbertos(await listAlertasByEmpresa(true));
    } catch {
      // Sem rede agora , os cards simplesmente não atualizam o "pulsar" neste ciclo.
    }
  }

  async function carregarTendencia() {
    setTendencia(
      await getDashboardTendencia(
        periodoDias,
        periodoPersonalizado ?? undefined,
      ),
    );
  }

  async function atualizarManualmente() {
    setAtualizandoManual(true);
    try {
      await Promise.all([carregarResumo(), carregarTendencia()]);
    } finally {
      setAtualizandoManual(false);
    }
  }

  useEffect(() => {
    carregarResumo().finally(() => setCarregandoInicial(false));
    const intervalo = setInterval(carregarResumo, INTERVALO_ATUALIZACAO_MS);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void carregarAlertasAbertos();
    const intervalo = setInterval(
      carregarAlertasAbertos,
      INTERVALO_ATUALIZACAO_MS,
    );
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getDashboardTendencia(periodoDias, periodoPersonalizado ?? undefined).then(
      setTendencia,
    );
  }, [periodoDias, periodoPersonalizado]);

  function aplicarPeriodoPersonalizado() {
    if (
      !periodoPersonalizadoRascunho.desde ||
      !periodoPersonalizadoRascunho.ate
    ) {
      return;
    }
    setPeriodoPersonalizado({ ...periodoPersonalizadoRascunho });
  }

  function limparPeriodoPersonalizado() {
    setPeriodoPersonalizado(null);
    setPeriodoPersonalizadoRascunho({ desde: "", ate: "" });
  }

  if (carregandoInicial) return <p>Carregando painel…</p>;
  if (!resumo)
    return (
      <p style={{ color: "#b91c1c" }}>
        {erro ?? "Não foi possível carregar o painel."}
      </p>
    );

  const { motoristas, alertas } = resumo;

  function abrir(card: CardPainel, titulo: string) {
    setDetalheAberto({ card, titulo });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h2>Painel da operação</h2>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#000000" }}>
            Atualizado às{" "}
            {new Date(resumo.atualizadoEm).toLocaleTimeString("pt-BR")}
          </span>
          <button
            className="secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={atualizarManualmente}
            disabled={atualizandoManual}
          >
            {atualizandoManual ? "Atualizando…" : "Atualizar agora"}
          </button>
        </div>
      </div>
      {erro && <p style={{ color: "#b45309", fontSize: 13 }}>{erro}</p>}

      <h3
        style={{
          marginTop: 24,
          marginBottom: 8,
          fontSize: 14,
          color: "#000000",
        }}
      >
        Agora
      </h3>
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}
      >
        <CartaoMetrica
          titulo="Motoristas ativos"
          valor={motoristas.totalAtivos}
          onClick={() => abrir("ativos", "Motoristas ativos")}
        />
        <CartaoMetrica
          titulo="Em direção"
          valor={motoristas.emDirecao}
          cor="#2563eb"
          onClick={() => abrir("em-direcao", "Motoristas em direção")}
        />
        <CartaoMetrica
          titulo="Em descanso"
          valor={motoristas.emDescanso}
          onClick={() => abrir("em-descanso", "Motoristas em descanso")}
        />
        <CartaoMetrica
          titulo="Em espera (carga/descarga)"
          valor={motoristas.emEspera}
          cor="#b45309"
          onClick={() =>
            abrir("em-espera", "Motoristas em espera de carga/descarga")
          }
        />
        {/* Rodada 68 , pedido do usuário: "esse tempo... precisa
            direcionar o usuário a escolher alguma ação". Este número já
            existia no backend (jornadaAbertaSemSubEvento) desde antes,
            mas nunca tinha card nenhum aqui , é a contagem, agora
            mesmo, de quem bateu "Início de jornada" (ou fechou uma
            etapa) e ainda não escolheu a próxima. Clicar mostra, por
            motorista, há quanto tempo. */}
        <CartaoMetrica
          titulo="Tempo indefinido (sem etapa escolhida)"
          valor={motoristas.jornadaAbertaSemSubEvento}
          cor={motoristas.jornadaAbertaSemSubEvento > 0 ? "#ea580c" : undefined}
          onClick={() =>
            abrir(
              "jornada-aberta-sem-sub-evento",
              "Motoristas com jornada aberta sem etapa escolhida (tempo indefinido)",
            )
          }
        />
        <CartaoMetrica
          titulo="Sem jornada aberta"
          valor={motoristas.semJornadaAberta}
          onClick={() =>
            abrir("sem-jornada-aberta", "Motoristas sem jornada aberta")
          }
        />
        <CartaoMetrica
          titulo="Nunca bateu ponto"
          valor={motoristas.semNenhumRegistro}
          cor={motoristas.semNenhumRegistro > 0 ? "#b45309" : undefined}
          onClick={() =>
            abrir("sem-nenhum-registro", "Motoristas que nunca bateram ponto")
          }
        />
      </div>

      <h3
        style={{
          marginTop: 24,
          marginBottom: 8,
          fontSize: 14,
          color: "#000000",
        }}
      >
        Risco agora
      </h3>
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}
      >
        <CartaoMetrica
          titulo="Alertas críticos em aberto"
          valor={alertas.abertos.CRITICO}
          cor="#b91c1c"
          pulsando={existeAlertaAbertoHaMuitoTempo(
            alertasAbertos,
            (a) => a.severidade === "CRITICO",
          )}
          onClick={() =>
            abrir("alertas-criticos", "Alertas críticos em aberto")
          }
          descricao="Severidade mais alta: o limite legal já foi ultrapassado (ex.: direção contínua, jornada de direção ou espera em carga/descarga acima do máximo). Exige ação imediata."
        />
        <CartaoMetrica
          titulo="Alertas de atenção em aberto"
          valor={alertas.abertos.ATENCAO}
          cor="#b45309"
          pulsando={existeAlertaAbertoHaMuitoTempo(
            alertasAbertos,
            (a) => a.severidade === "ATENCAO",
          )}
          onClick={() =>
            abrir("alertas-atencao", "Alertas de atenção em aberto")
          }
          descricao="Severidade intermediária: ainda não ultrapassou o limite legal, mas está perto dele, ou merece acompanhamento (ex.: descanso interjornada insuficiente, ociosidade suspeita)."
        />
        <CartaoMetrica
          titulo="Alertas nas últimas 24h"
          valor={alertas.ultimas24h}
          onClick={() => abrir("alertas-24h", "Alertas nas últimas 24h")}
          descricao="Todos os alertas (qualquer severidade) gerados nas últimas 24 horas, abertos ou já resolvidos."
        />
        <CartaoMetrica
          titulo="Risco de fraude (7 dias)"
          valor={alertas.riscoFraudeUltimos7d}
          cor={alertas.riscoFraudeUltimos7d > 0 ? "#b91c1c" : undefined}
          subtitulo="integridade"
          pulsando={existeAlertaAbertoHaMuitoTempo(alertasAbertos, (a) =>
            TIPOS_FRAUDE.includes(a.tipo),
          )}
          onClick={() =>
            abrir("risco-fraude-7d", "Alertas de risco de fraude (7 dias)")
          }
          descricao="Alertas de integridade do aparelho/GPS dos últimos 7 dias — não são sobre a jornada em si, são sobre a confiabilidade do que foi registrado (localização falsificada, relógio manipulado, odômetro regressivo etc.)."
        />
      </div>

      {motoristas.jornadasAbertasHaMuitoTempo.length > 0 && (
        <div
          className="card"
          style={{ borderColor: "#fca5a5", marginBottom: 24 }}
        >
          <strong style={{ color: "#b91c1c" }}>
            Jornadas abertas há muito tempo
          </strong>
          <p style={{ fontSize: 12, color: "#000000", marginTop: 4 }}>
            Início de jornada batido há mais de 16h sem o fim correspondente. O
            motorista pode ter esquecido de encerrar, ou o turno está
            anormalmente longo.
          </p>
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Início da jornada</th>
                <th>Horas em aberto</th>
              </tr>
            </thead>
            <tbody>
              {motoristas.jornadasAbertasHaMuitoTempo.map((j) => (
                <tr key={j.motoristaId}>
                  <td>
                    <Link to={`/motoristas/${j.motoristaId}`}>{j.nome}</Link>
                  </td>
                  <td>{new Date(j.desde).toLocaleString("pt-BR")}</td>
                  <td style={{ color: "#b91c1c", fontWeight: 600 }}>
                    {j.horasAberta}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alertas.topTipos7d.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <strong>Alertas mais frequentes (7 dias)</strong>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {alertas.topTipos7d.map((t) => (
                <tr key={t.tipo}>
                  <td>{ROTULO_TIPO_ALERTA[t.tipo] ?? t.tipo}</td>
                  <td
                    style={{ textAlign: "right", fontWeight: 600, width: 60 }}
                  >
                    {t.quantidade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        {/* Pedido do usuário: extração por período definido pelo usuário,
            além dos atalhos de 7/30/90 dias , campos próximos do gráfico. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <span>Período personalizado:</span>
          <input
            type="date"
            value={periodoPersonalizadoRascunho.desde}
            onChange={(e) =>
              setPeriodoPersonalizadoRascunho((p) => ({
                ...p,
                desde: e.target.value,
              }))
            }
          />
          <span>até</span>
          <input
            type="date"
            value={periodoPersonalizadoRascunho.ate}
            onChange={(e) =>
              setPeriodoPersonalizadoRascunho((p) => ({
                ...p,
                ate: e.target.value,
              }))
            }
          />
          <button
            type="button"
            className="secondary"
            style={{ padding: "4px 10px", fontSize: 12 }}
            onClick={aplicarPeriodoPersonalizado}
          >
            Aplicar
          </button>
          {periodoPersonalizado && (
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={limparPeriodoPersonalizado}
            >
              Limpar
            </button>
          )}
        </div>
        <div>
          {OPCOES_PERIODO.map((o) => (
            <button
              key={o.dias}
              className={
                !periodoPersonalizado && o.dias === periodoDias
                  ? ""
                  : "secondary"
              }
              style={{ marginLeft: 6, padding: "4px 10px", fontSize: 12 }}
              onClick={() => {
                // Limpa o período PERSONALIZADO aplicado (volta a usar o
                // atalho de dias na consulta), mas preenche os campos de
                // data com o intervalo equivalente pra ficar visualmente
                // em dia com o atalho escolhido.
                setPeriodoPersonalizado(null);
                setPeriodoPersonalizadoRascunho({
                  desde: diasAtrasISO(o.dias),
                  ate: hojeISO(),
                });
                setPeriodoDias(o.dias);
              }}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary"
          style={{ padding: "4px 10px", fontSize: 12 }}
          disabled={tendencia.length === 0}
          onClick={() =>
            baixarCsvTabela(
              `evolucao-painel-${periodoPersonalizado ? `${periodoPersonalizado.desde}-a-${periodoPersonalizado.ate}` : `${periodoDias}dias`}.csv`,
              [
                "Dia",
                "Registros",
                "Alertas críticos",
                "Alertas de atenção",
                "Alertas informativos",
                "Risco de fraude",
                "Horas de direção",
                "Horas de espera",
                "Horas indefinido",
              ],
              tendencia.map((d) => [
                d.dia,
                String(d.registros),
                String(d.alertasCritico),
                String(d.alertasAtencao),
                String(d.alertasInfo),
                String(d.riscoFraude),
                String(d.horasDirecao),
                String(d.horasEspera),
                String(d.horasIndefinido),
              ]),
            )
          }
        >
          Baixar CSV
        </button>
      </div>

      <GraficoTendencia dados={tendencia} />

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <AlertasJornadaPage />
      </div>

      {/* Rodada 72 , pedido do usuário: "leve os indicadores e métricas
          para aba do painel... melhor deixar separado". Mesmo padrão
          já usado abaixo pra Alertas/Auditoria , uma seção própria,
          separada por borda, dentro do Painel, sem misturar com o
          fechamento de ponto/extração de relatório (que ficou só em
          "Fechamento" , ver IndicadoresPage.tsx). */}
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <PainelIndicadores />
      </div>

      {detalheAberto && (
        <PainelDetalheCard
          estado={detalheAberto}
          onFechar={() => setDetalheAberto(null)}
        />
      )}
    </div>
  );
}
