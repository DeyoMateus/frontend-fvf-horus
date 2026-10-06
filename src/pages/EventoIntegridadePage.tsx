import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  aceitarDivergenciaIntegridade,
  analisarEventoIntegridade,
} from "../api/registros";
import type { AnaliseEventoIntegridade } from "../api/registros";
import { usePrompt } from "../components/PromptProvider";

function dataHora(v: string | null | undefined): string {
  return v ? new Date(v).toLocaleString("pt-BR") : "-";
}

const caixaHash: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  wordBreak: "break-all",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 4,
  padding: 6,
  margin: "2px 0 8px",
  color: "#000000",
};

/**
 * Rodada 158: tela própria para analisar UM evento da cadeia de
 * integridade (aberta pelo botão "Analisar evento" na lista de
 * divergências do motorista). Somente leitura, exceto o aceite.
 */
export function EventoIntegridadePage() {
  const { motoristaId, sequencial } = useParams();
  const prompt = usePrompt();
  const [analise, setAnalise] = useState<AnaliseEventoIntegridade | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aceitando, setAceitando] = useState(false);

  async function carregar() {
    if (!motoristaId || !sequencial) return;
    setCarregando(true);
    setErro(null);
    try {
      setAnalise(
        await analisarEventoIntegridade(motoristaId, Number(sequencial)),
      );
    } catch {
      setErro("Não foi possível carregar a análise deste evento.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoristaId, sequencial]);

  async function onAceitar() {
    if (!motoristaId || !sequencial) return;
    const motivo = await prompt(
      `Confirma a regularização do evento nº ${sequencial}? Isto não apaga nem altera o evento, só documenta que esta divergência já foi revisada e aceita, com o motivo abaixo.`,
      {
        titulo: "Aceitar/regularizar divergência",
        placeholder: "Motivo (obrigatório)",
        multilinha: true,
        textoConfirmar: "Aceitar",
        validar: (v) => (!v.trim() ? "Informe o motivo." : null),
      },
    );
    if (motivo === null) return;
    setAceitando(true);
    try {
      await aceitarDivergenciaIntegridade(
        motoristaId,
        Number(sequencial),
        motivo.trim(),
      );
      await carregar();
    } finally {
      setAceitando(false);
    }
  }

  const voltar = (
    <Link to={`/motoristas/${motoristaId}`}>← Voltar para o motorista</Link>
  );

  if (carregando) return <p>Carregando...</p>;
  if (erro || !analise)
    return (
      <div>
        <p>{erro ?? "Evento não encontrado."}</p>
        {voltar}
      </div>
    );

  const { evento, verificacao: v } = analise;
  const linha = (rotulo: string, valor: React.ReactNode) => (
    <tr>
      <td style={{ fontWeight: 600, paddingRight: 16, verticalAlign: "top" }}>
        {rotulo}
      </td>
      <td style={{ wordBreak: "break-all" }}>{valor}</td>
    </tr>
  );

  return (
    <div>
      <p>{voltar}</p>
      <h2 style={{ marginTop: 0 }}>
        Evento nº {evento.sequencial} ({evento.tipoEvento})
      </h2>

      <div
        className="card"
        style={{
          background: analise.divergente ? "#fffbeb" : "#f0fdf4",
          borderColor: analise.divergente ? "#fde68a" : "#bbf7d0",
          color: "#000000",
        }}
      >
        <p style={{ margin: "0 0 6px", fontWeight: 700 }}>
          {analise.divergente
            ? analise.aceite
              ? "Divergência regularizada"
              : "Divergência pendente"
            : "Evento íntegro"}
        </p>
        <p style={{ margin: 0, fontSize: 13 }}>{analise.explicacao}</p>
        {analise.aceite ? (
          <p style={{ margin: "8px 0 0", fontWeight: 600, color: "#15803d" }}>
            Regularizado por {analise.aceite.aceitoPorNome} em{" "}
            {dataHora(analise.aceite.aceitoEm)}. Motivo: {analise.aceite.motivo}
          </p>
        ) : (
          analise.divergente && (
            <button
              type="button"
              className="secondary"
              style={{ marginTop: 10, fontSize: 12, padding: "4px 10px" }}
              disabled={aceitando}
              onClick={onAceitar}
            >
              {aceitando
                ? "Regularizando..."
                : "Aceitar/regularizar esta divergência"}
            </button>
          )
        )}
      </div>

      <div className="card" style={{ color: "#000000" }}>
        <h3 style={{ marginTop: 0 }}>Dados do evento</h3>
        <table style={{ fontSize: 13 }}>
          <tbody>
            {linha("Horário do evento", dataHora(evento.timestampEvento))}
            {linha("Lançado em", dataHora(evento.criadoEm))}
            {linha(
              "Localização (GPS)",
              evento.latitude !== null && evento.longitude !== null
                ? `${evento.latitude}, ${evento.longitude}`
                : "Sem GPS",
            )}
            {linha(
              "Precisão do GPS",
              evento.precisaoGpsM !== null ? `${evento.precisaoGpsM} m` : "-",
            )}
            {linha(
              "Fuso (min a leste do UTC)",
              evento.fusoOffsetMin !== null ? evento.fusoOffsetMin : "-",
            )}
            {linha("Observação", evento.observacao || "-")}
            {linha("Aparelho", evento.deviceUuidUsado)}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ color: "#000000" }}>
        <h3 style={{ marginTop: 0 }}>Vizinhança na cadeia</h3>
        <table style={{ fontSize: 13 }}>
          <tbody>
            {linha(
              "Evento anterior",
              analise.anterior
                ? `nº ${analise.anterior.sequencial} (${analise.anterior.tipoEvento}) em ${dataHora(analise.anterior.timestampEvento)}`
                : "Primeiro evento do motorista",
            )}
            {linha(
              "Próximo evento",
              analise.proximo
                ? `nº ${analise.proximo.sequencial} (${analise.proximo.tipoEvento}) em ${dataHora(analise.proximo.timestampEvento)}`
                : "Último evento do motorista",
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ color: "#000000" }}>
        <h3 style={{ marginTop: 0 }}>Verificação de hashes</h3>
        <p style={{ fontSize: 13, margin: "0 0 8px" }}>
          Encadeamento com o evento anterior:{" "}
          <strong>{v.hashAnteriorConfere ? "confere" : "NÃO confere"}</strong>
          {" · "}
          Hash do próprio evento:{" "}
          <strong>{v.hashConfere ? "confere" : "NÃO confere"}</strong>
        </p>
        <p style={{ fontSize: 12, margin: 0 }}>Hash gravado</p>
        <div style={caixaHash}>{v.hashGravado}</div>
        <p style={{ fontSize: 12, margin: 0 }}>Hash recalculado agora</p>
        <div style={caixaHash}>{v.hashRecalculado}</div>
        <p style={{ fontSize: 12, margin: 0 }}>
          Conteúdo usado no cálculo (payload canônico)
        </p>
        <div style={caixaHash}>{v.payloadCanonico}</div>

        {!v.hashConfere && (
          <>
            <h4 style={{ margin: "12px 0 6px" }}>
              Teste de causa (um campo por vez)
            </h4>
            <p style={{ fontSize: 12, margin: "0 0 6px" }}>
              {v.variacaoQueBate
                ? `O hash gravado passa a bater ${v.variacaoQueBate}. Isso aponta a causa provável: diferença no cálculo, não necessariamente adulteração do conteúdo.`
                : "Nenhuma das variações testadas reproduz o hash gravado. Confira com atenção antes de aceitar."}
            </p>
            <ul style={{ fontSize: 13, margin: 0 }}>
              {v.tentativas.map((t) => (
                <li key={t.descricao}>
                  {t.descricao}: {t.bate ? "BATE" : "não bate"}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
