import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { IndicadoresMotorista } from "../api/indicadores";
import { minParaHoras } from "../utils/formatarDuracao";
import { baixarCsvTabela, travarRolagemFundo } from "../utils/exportarTabelaModal";

/**
 * Rodada 338: colunas da tabela "Por motorista" (as mesmas na tela e no
 * relatório completo), conforme o indicador escolhido.
 */
export interface FiltroColunasPorMotorista {
  horas: boolean;
  extras: boolean;
  noturno: boolean;
  espera: boolean;
  bancoHoras: boolean;
  alertas: boolean;
}

export interface ColunaPorMotorista {
  titulo: string;
  texto: (m: IndicadoresMotorista) => string;
}

export function colunasPorMotorista(
  mostrar: FiltroColunasPorMotorista,
): ColunaPorMotorista[] {
  const colunas: ColunaPorMotorista[] = [];
  if (mostrar.horas) {
    colunas.push({ titulo: "Direção", texto: (m) => minParaHoras(m.direcaoMin) });
    colunas.push({ titulo: "Espera", texto: (m) => minParaHoras(m.esperaMin) });
  }
  if (mostrar.extras) {
    colunas.push({ titulo: "Extras", texto: (m) => minParaHoras(m.extraMin) });
    colunas.push({
      titulo: "% extra/direção",
      texto: (m) => `${m.percentualExtraSobreDirecao}%`,
    });
  }
  if (mostrar.noturno) {
    colunas.push({ titulo: "Noturno", texto: (m) => minParaHoras(m.noturnoMin) });
  }
  if (mostrar.espera) {
    colunas.push({
      titulo: "% ociosidade",
      texto: (m) => `${m.percentualEsperaSobreTotal}%`,
    });
  }
  if (mostrar.bancoHoras) {
    colunas.push({
      titulo: "Banco de horas (saldo)",
      texto: (m) => (m.bancoHoras.ativo ? minParaHoras(m.bancoHoras.saldoMin) : ","),
    });
  }
  if (mostrar.alertas) {
    colunas.push({
      titulo: "Alertas (crít./atenção/integridade)",
      texto: (m) =>
        `${m.alertas.criticos} / ${m.alertas.atencao} / ${m.alertas.riscoFraude}`,
    });
  }
  return colunas;
}

/** Popup com TODOS os motoristas do período (a tela mostra só um recorte), com download em Excel. */
export function PorMotoristaCompletoPopup({
  motoristas,
  colunas,
  subtitulo,
  onFechar,
}: {
  motoristas: IndicadoresMotorista[];
  colunas: ColunaPorMotorista[];
  subtitulo?: string;
  onFechar: () => void;
}) {
  useEffect(() => travarRolagemFundo(), []);

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
          width: "min(980px, 94vw)",
          maxHeight: "82vh",
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
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: 15 }}>Por motorista , relatório completo</strong>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={motoristas.length === 0}
              onClick={() =>
                baixarCsvTabela(
                  "por-motorista-relatorio-completo.xlsx",
                  ["Motorista", ...colunas.map((c) => c.titulo)],
                  motoristas.map((m) => [m.nome, ...colunas.map((c) => c.texto(m))]),
                  {
                    titulo: "Por motorista , relatório completo",
                    subtitulo: subtitulo ?? null,
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
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>

        {motoristas.length === 0 ? (
          <p style={{ fontSize: 13, color: "#000000" }}>
            Nenhum motorista com dados no período.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                {colunas.map((c) => (
                  <th key={c.titulo}>{c.titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {motoristas.map((m) => (
                <tr key={m.motoristaId}>
                  <td>
                    <Link to={`/motoristas/${m.motoristaId}`} onClick={onFechar}>
                      {m.nome}
                    </Link>
                  </td>
                  {colunas.map((c) => (
                    <td key={c.titulo}>{c.texto(m)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
