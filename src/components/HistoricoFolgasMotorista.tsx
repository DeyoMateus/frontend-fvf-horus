import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarAutorrelatosFolga } from "../api/autorrelatoFolga";
import { listarFolgasConcedidas, ROTULO_STATUS_FOLGA } from "../api/folgaConcedida";
import { travarRolagemFundo } from "../utils/exportarTabelaModal";
import { dataCalendarioBr } from "../utils/mascaras";
import { FolgasLista } from "./FolgasLista";
import type { LinhaFolga } from "./FolgasLista";
import type { ItemFolgaDashboard } from "../api/folgaDashboard";

interface Registro {
  id: string;
  data: string;
  tipo: "Concedida pelo RH" | "Autorrelatada";
  /** Situação extra da folga concedida (não realizada / retirada). */
  situacao?: string;
  vermelho?: boolean;
  detalhe: string;
  por: string;
}

const DIA_MS = 86_400_000;

/**
 * Rodada 277: janela aberta ao clicar num motorista do ranking de folgas.
 * Mostra quantas folgas ele teve ao longo do tempo (concedidas pelo RH e
 * autorrelatadas), o maior intervalo entre folgas e a lista completa com
 * busca por período e exportação em Excel/PDF.
 */
export function HistoricoFolgasMotorista({
  motorista,
  onFechar,
}: {
  motorista: ItemFolgaDashboard;
  onFechar: () => void;
}) {
  const [registros, setRegistros] = useState<Registro[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => travarRolagemFundo(), []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarFolgasConcedidas(motorista.motoristaId),
      listarAutorrelatosFolga(motorista.motoristaId),
    ])
      .then(([concedidas, autorrelatadas]) => {
        if (cancelado) return;
        setRegistros([
          ...concedidas.map(
            (f): Registro => ({
              id: `c-${f.id}`,
              data: f.data,
              tipo: "Concedida pelo RH",
              situacao:
                f.status === "CONCEDIDA" ? undefined : ROTULO_STATUS_FOLGA[f.status],
              vermelho: f.status === "NAO_REALIZADA",
              detalhe: f.motivo ?? "",
              por: f.concedidaPorUsuario?.nome ?? "",
            }),
          ),
          ...autorrelatadas.map(
            (f): Registro => ({
              id: `a-${f.id}`,
              data: f.data,
              tipo: "Autorrelatada",
              detalhe: f.observacao ?? "",
              por: "Motorista",
            }),
          ),
        ]);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o histórico de folgas.");
      });
    return () => {
      cancelado = true;
    };
  }, [motorista.motoristaId]);

  const resumo = useMemo(() => {
    if (!registros) return null;
    const concedidas = registros.filter(
      (r) => r.tipo === "Concedida pelo RH" && !r.situacao,
    );
    const autorrelatadas = registros.filter((r) => r.tipo === "Autorrelatada").length;
    // Folga não realizada / retirada não conta como folga tirada.
    const dias = [
      ...new Set(
        registros.filter((r) => !r.situacao).map((r) => r.data.slice(0, 10)),
      ),
    ].sort();
    let maiorIntervalo = 0;
    for (let i = 1; i < dias.length; i++) {
      const d =
        (new Date(dias[i]).getTime() - new Date(dias[i - 1]).getTime()) /
          DIA_MS -
        1;
      if (d > maiorIntervalo) maiorIntervalo = d;
    }
    return {
      concedidas: concedidas.length,
      autorrelatadas,
      diasDistintos: dias.length,
      maiorIntervalo,
      primeira: dias[0] ?? null,
      ultima: dias[dias.length - 1] ?? null,
    };
  }, [registros]);

  const linhas: LinhaFolga[] = (registros ?? []).map((r) => ({
    id: r.id,
    data: r.data,
    cor: r.vermelho ? "#b91c1c" : undefined,
    celulas: [
      dataCalendarioBr(r.data),
      r.situacao ? `${r.tipo}: ${r.situacao}` : r.tipo,
      r.detalhe,
      r.por,
    ],
  }));

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
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(820px, 94vw)",
          maxHeight: "86vh",
          overflow: "auto",
          padding: 20,
          margin: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: 15 }}>
            Histórico de folgas: {motorista.nome}
          </strong>
          <div style={{ display: "flex", gap: 6 }}>
            <Link
              to={`/motoristas/${motorista.motoristaId}`}
              style={{ fontSize: 12 }}
              onClick={onFechar}
            >
              Abrir ficha do motorista
            </Link>
            <button
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>

        {erro && <p className="error-text">{erro}</p>}
        {!erro && !registros && <p>Carregando...</p>}

        {resumo && (
          <>
            <div
              style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "8px 0 12px" }}
            >
              {[
                ["Folgas concedidas", String(resumo.concedidas)],
                ["Folgas autorrelatadas", String(resumo.autorrelatadas)],
                ["Dias de folga distintos", String(resumo.diasDistintos)],
                [
                  "Maior intervalo entre folgas",
                  resumo.diasDistintos > 1
                    ? `${resumo.maiorIntervalo} dia${resumo.maiorIntervalo === 1 ? "" : "s"}`
                    : "—",
                ],
                [
                  "Dias sem folga agora",
                  String(motorista.diasTrabalhados),
                ],
              ].map(([rotulo, valor]) => (
                <div
                  key={rotulo}
                  className="card"
                  style={{ padding: "10px 14px", flex: "1 1 130px", margin: 0 }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {rotulo}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{valor}</div>
                </div>
              ))}
            </div>
            <FolgasLista
              titulo="Histórico de folgas"
              subtituloArquivo={motorista.nome}
              cabecalhos={["Data da folga", "Tipo", "Motivo / observação", "Registrada por"]}
              linhas={linhas}
              vazio="Este motorista ainda não tem folga registrada."
              qtdInicial={10}
            />
          </>
        )}
      </div>
    </div>
  );
}
