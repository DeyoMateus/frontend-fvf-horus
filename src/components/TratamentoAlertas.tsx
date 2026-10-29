import { useState } from "react";
import {
  corrigirHoraPontoAlerta,
  liberarRelogioAlerta,
  tratarAlerta,
  tratarAlertasEmLote,
} from "../api/alertas";
import type { AlertaJornada } from "../api/types";

// Rodada 322: tratamento de alertas unificado (sem "marcar visto"). Os
// mesmos componentes servem ao painel geral de alertas e à ficha do
// motorista, e como os dois gravam no mesmo alerta, tratar em um lugar dá
// baixa no outro.

export type FiltroTratamento = "TODOS" | "NAO_TRATADOS" | "TRATADOS";

export function alertaPodeTratarEmLote(a: AlertaJornada): boolean {
  return (
    !a.tratadoEm &&
    a.severidade !== "CRITICO" &&
    a.tipo !== "RELOGIO_PONTO_RECUSADO"
  );
}

export function aplicarFiltroTratamento(
  alertas: AlertaJornada[],
  filtro: FiltroTratamento,
): AlertaJornada[] {
  if (filtro === "NAO_TRATADOS") return alertas.filter((a) => !a.tratadoEm);
  if (filtro === "TRATADOS") return alertas.filter((a) => !!a.tratadoEm);
  return alertas;
}

function mensagemDeErro(erro: unknown, padrao: string): string {
  const msg = (erro as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : padrao;
}

/** Só um filtro por vez: marcar um desmarca o outro; nenhum marcado = todos. */
export function FiltrosTratamento({
  valor,
  onMudar,
}: {
  valor: FiltroTratamento;
  onMudar: (v: FiltroTratamento) => void;
}) {
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={valor === "NAO_TRATADOS"}
          onChange={(e) => onMudar(e.target.checked ? "NAO_TRATADOS" : "TODOS")}
        />{" "}
        Só não tratados
      </label>
      <label>
        <input
          type="checkbox"
          checked={valor === "TRATADOS"}
          onChange={(e) => onMudar(e.target.checked ? "TRATADOS" : "TODOS")}
        />{" "}
        Só tratados
      </label>
    </>
  );
}

/** Observação + salvar (+ correção de hora quando o alerta é de relógio adulterado). */
export function FormularioTratamentoAlerta({
  alerta,
  onConcluido,
  onErro,
}: {
  alerta: AlertaJornada;
  onConcluido: () => void | Promise<void>;
  onErro: (mensagem: string) => void;
}) {
  const [observacao, setObservacao] = useState("");
  const [horario, setHorario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ehRelogio = alerta.tipo === "RELOGIO_PONTO_RECUSADO";
  const ehPontoComFlag = alerta.tipo === "PONTO_ACEITO_COM_FLAG";
  const obs = observacao.trim();

  async function salvar() {
    if (obs.length < 3) return;
    setSalvando(true);
    try {
      await tratarAlerta(alerta.id, obs);
      await onConcluido();
    } catch (e) {
      onErro(
        mensagemDeErro(
          e,
          "Não foi possível registrar o tratamento deste alerta.",
        ),
      );
    } finally {
      setSalvando(false);
    }
  }

  async function corrigirHora() {
    if (obs.length < 10 || !horario) return;
    const instante = new Date(horario);
    if (Number.isNaN(instante.getTime())) return;
    setSalvando(true);
    try {
      await corrigirHoraPontoAlerta(
        alerta.motoristaId,
        alerta.id,
        instante.toISOString(),
        obs,
      );
      await onConcluido();
    } catch (e) {
      onErro(
        mensagemDeErro(e, "Não foi possível corrigir a hora deste ponto."),
      );
    } finally {
      setSalvando(false);
    }
  }

  async function liberarRelogio() {
    if (obs.length < 10 || !horario) return;
    const instante = new Date(horario);
    if (Number.isNaN(instante.getTime())) return;
    setSalvando(true);
    try {
      await liberarRelogioAlerta(
        alerta.motoristaId,
        alerta.id,
        instante.toISOString(),
        obs,
      );
      await onConcluido();
    } catch (e) {
      onErro(
        mensagemDeErro(
          e,
          "Não foi possível liberar o aparelho deste motorista.",
        ),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
        Anote o que foi apurado (obrigatório para tratar), por exemplo:
        "conferido, odômetro correto, foi falso positivo de ordem de chegada" ou
        "corrigido via Tratamento de Ponto de dd/mm":
      </label>
      <textarea
        maxLength={400}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        rows={2}
        style={{ width: "100%", maxWidth: 640 }}
      />
      <div style={{ marginTop: 6 }}>
        {!ehRelogio && (
          <button disabled={salvando || obs.length < 3} onClick={salvar}>
            {salvando ? "Salvando…" : "Salvar tratamento"}
          </button>
        )}
        {ehPontoComFlag && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p style={{ fontSize: 13, margin: "0 0 6px" }}>
              Se o horário do ponto estiver errado, informe a hora correta: o
              ponto original continua guardado e o ajuste com a hora correta
              passa a valer nos cálculos, com a sua anotação (mínimo de 10
              caracteres). A hora precisa ficar entre o ponto anterior e o
              seguinte do motorista. Se o horário estiver certo, use apenas
              "Salvar tratamento".
            </p>
            <label style={{ fontSize: 13 }}>
              Hora correta do ponto:{" "}
              <input
                type="datetime-local"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </label>{" "}
            <button
              disabled={salvando || !horario || obs.length < 10}
              onClick={corrigirHora}
            >
              Corrigir hora do ponto
            </button>
          </div>
        )}
        {ehRelogio && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <p style={{ fontSize: 13, margin: "0 0 6px" }}>
              O ponto que o motorista tentou bater foi recusado por causa do
              relógio do aparelho e não foi gravado. Informe a hora REAL desse
              ponto: o sistema lança um ajuste novo com essa hora e a sua
              anotação, e libera o aparelho. Os pontos já registrados não são
              alterados. A hora precisa ser igual ou menor do que a hora que o
              aparelho mostrava, não pode passar do momento em que o servidor
              recusou o ponto e tem de respeitar a ordem dos pontos e ajustes
              do motorista. A anotação acima (mínimo de 10 caracteres) é
              obrigatória.
            </p>
            <label style={{ fontSize: 13 }}>
              Hora correta do ponto recusado:{" "}
              <input
                type="datetime-local"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </label>{" "}
            <button
              disabled={salvando || !horario || obs.length < 10}
              onClick={liberarRelogio}
            >
              Lançar ajuste e liberar aparelho
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Barra do tratamento coletivo: aparece quando há alertas não críticos marcados. */
export function BarraTratamentoEmLote({
  idsSelecionados,
  onLimpar,
  onConcluido,
  onErro,
}: {
  idsSelecionados: string[];
  onLimpar: () => void;
  onConcluido: (aviso: string) => void | Promise<void>;
  onErro: (mensagem: string) => void;
}) {
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  if (idsSelecionados.length === 0) return null;
  const obs = observacao.trim();

  async function confirmar() {
    if (obs.length < 3) return;
    setSalvando(true);
    try {
      const r = await tratarAlertasEmLote(idsSelecionados, obs);
      setObservacao("");
      const partes = [`${r.tratados.length} alerta(s) tratado(s).`];
      if (r.recusados.length > 0) {
        partes.push(
          `${r.recusados.length} não pôde(ram) ser tratado(s): ${r.recusados[0].motivo}`,
        );
      }
      await onConcluido(partes.join(" "));
    } catch (e) {
      onErro(
        mensagemDeErro(e, "Não foi possível tratar os alertas selecionados."),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="card"
      style={{ marginBottom: 12, background: "#f9fafb", padding: "10px 14px" }}
    >
      <strong style={{ fontSize: 13 }}>
        {idsSelecionados.length} alerta(s) selecionado(s) para tratar juntos
      </strong>
      <div style={{ fontSize: 12, margin: "4px 0" }}>
        A mesma anotação vale para todos. Alertas críticos não entram aqui, são
        tratados um a um.
      </div>
      <textarea
        maxLength={400}
        rows={2}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="Anote o que foi apurado (obrigatório)"
        style={{ width: "100%", maxWidth: 640 }}
      />
      <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
        <button disabled={salvando || obs.length < 3} onClick={confirmar}>
          {salvando
            ? "Salvando…"
            : `Tratar ${idsSelecionados.length} selecionado(s)`}
        </button>
        <button type="button" className="secondary" onClick={onLimpar}>
          Limpar seleção
        </button>
      </div>
    </div>
  );
}
