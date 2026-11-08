import { useEffect, useState } from "react";
import {
  corrigirHoraPontoAjudante,
  listarAlertasPontoAjudantes,
  tratarAlertaPontoAjudante,
} from "../api/ajudantes";
import type { AlertaPontoAjudante } from "../api/ajudantes";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "./ControlesListaPaginada";

/**
 * Rodada 668: fila do gestor com os pontos do ajudante batidos com divergência de relógio.
 * O ponto foi aceito normalmente. O gestor confirma o horário ("Salvar tratamento") ou corrige a
 * hora: a correção entra como ajuste em linha paralela e o ponto original continua guardado.
 */
const ROTULO_EVENTO: Record<string, string> = {
  INICIO_JORNADA: "Início de jornada",
  INICIO_DESCANSO: "Início de descanso",
  FIM_DESCANSO: "Fim de descanso",
  FIM_JORNADA: "Fim de jornada",
};
const ROTULO_SINAL: Record<string, string> = {
  RELOGIO_RETROCEDIDO: "hora anterior ao ponto anterior",
  RELOGIO_ADIANTADO: "relógio adiantado",
  RELOGIO_MONOTONICO_DIVERGENTE: "relógio mexido entre dois pontos",
  POSICAO_MARCADA_COMO_FALSA: "localização possivelmente alterada",
};

function mensagemDeErro(erro: unknown, padrao: string): string {
  const msg = (erro as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : padrao;
}

/** ISO (UTC) -> valor do campo datetime-local, no fuso do navegador. */
function paraCampoDataHora(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Tratamento({
  alerta,
  onConcluido,
  onErro,
}: {
  alerta: AlertaPontoAjudante;
  onConcluido: () => void | Promise<void>;
  onErro: (m: string) => void;
}) {
  const [observacao, setObservacao] = useState("");
  const [horario, setHorario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const obs = observacao.trim();

  async function executar(acao: () => Promise<unknown>, erroPadrao: string) {
    setSalvando(true);
    try {
      await acao();
      await onConcluido();
    } catch (e) {
      onErro(mensagemDeErro(e, erroPadrao));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
        Anote o que foi apurado (obrigatório para tratar):
      </label>
      <textarea
        maxLength={400}
        rows={2}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        style={{ width: "100%", maxWidth: 640 }}
      />
      <div style={{ marginTop: 6 }}>
        <button
          disabled={salvando || obs.length < 3}
          onClick={() =>
            void executar(
              () => tratarAlertaPontoAjudante(alerta.id, obs),
              "Não foi possível registrar o tratamento.",
            )
          }
        >
          {salvando ? "Salvando…" : "Salvar tratamento"}
        </button>
      </div>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
        <p style={{ fontSize: 13, margin: "0 0 6px" }}>
          Se o horário estiver errado, informe a hora correta: o ponto original continua guardado e
          o ajuste com a hora correta passa a valer no espelho, com a sua anotação (mínimo de 10
          caracteres). A hora precisa ficar entre o ponto anterior e o seguinte do ajudante.
        </p>
        <p style={{ fontSize: 13, margin: "0 0 4px" }}>
          Horário informado pelo aparelho:{" "}
          <strong>{new Date(alerta.horarioInformado).toLocaleString("pt-BR")}</strong>
        </p>
        {alerta.horaProvavel ? (
          <p style={{ fontSize: 13, margin: "0 0 6px" }}>
            Horário provável estimado pelo sistema (
            {alerta.horaProvavelFonte === "GPS"
              ? "pela hora do GPS"
              : "pelo tempo que o aparelho ficou ligado desde o toque"}
            ): <strong>{new Date(alerta.horaProvavel).toLocaleString("pt-BR")}</strong>{" "}
            <button
              type="button"
              className="secondary"
              style={{ fontSize: 12 }}
              onClick={() => setHorario(paraCampoDataHora(alerta.horaProvavel as string))}
            >
              Usar este horário
            </button>
          </p>
        ) : (
          <p style={{ fontSize: 13, margin: "0 0 6px" }}>
            O sistema não conseguiu estimar um horário provável para este ponto. Informe a hora
            correta abaixo.
          </p>
        )}
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
          onClick={() => {
            const instante = new Date(horario);
            if (Number.isNaN(instante.getTime())) return;
            void executar(
              () => corrigirHoraPontoAjudante(alerta.id, instante.toISOString(), obs),
              "Não foi possível corrigir a hora deste ponto.",
            );
          }}
        >
          Corrigir hora do ponto
        </button>
      </div>
    </div>
  );
}

export function AlertasPontoAjudante() {
  const [alertas, setAlertas] = useState<AlertaPontoAjudante[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pag = useListaPaginada(alertas, (a) => a.createdAt, { qtdInicial: 10 });

  async function carregar() {
    try {
      setAlertas(await listarAlertasPontoAjudantes(false));
    } catch {
      setAlertas([]);
    }
  }
  useEffect(() => {
    void carregar();
  }, []);

  if (alertas.length === 0) return null;

  return (
    <div className="card" style={{ borderLeft: "4px solid #b45309" }}>
      <h3 style={{ marginTop: 0 }}>Pontos de ajudantes com divergência de relógio</h3>
      <p style={{ fontSize: 13, marginTop: -8 }}>
        O ponto foi registrado normalmente. Confira o horário com o ajudante e, se preciso, corrija
        a hora. O ponto original nunca é alterado: a correção entra à parte.
      </p>
      {erro && <p className="error-text">{erro}</p>}
      <ControlesListaPaginada
        ordem={pag.ordem}
        onAlternarOrdem={pag.alternarOrdem}
        qtdPorPagina={pag.qtdPorPagina}
        onMudarQtdPorPagina={pag.mudarQtdPorPagina}
        pagina={pag.pagina}
        totalPaginas={pag.totalPaginas}
        popupAberto={pag.popupAberto}
        onAbrirPopup={pag.abrirPopup}
        onFecharPopup={pag.fecharPopup}
        onSelecionarPagina={pag.irParaPagina}
        tituloPopup="Pontos de ajudantes com divergência de relógio"
      >
        <ul style={{ fontSize: 13 }}>
          {pag.itensExibidos.map((a) => (
            <li key={a.id} style={{ marginBottom: 8 }}>
              <strong>{a.ajudanteNome}</strong> , {ROTULO_EVENTO[a.tipoEvento] ?? a.tipoEvento} às{" "}
              {new Date(a.horarioInformado).toLocaleString("pt-BR")} (
              {a.flags.map((f) => ROTULO_SINAL[f] ?? f).join("; ")}){" "}
              <button
                type="button"
                className="secondary"
                style={{ fontSize: 12 }}
                onClick={() => setAberto(aberto === a.id ? null : a.id)}
              >
                {aberto === a.id ? "Fechar" : "Tratar"}
              </button>
              {aberto === a.id && (
                <Tratamento
                  alerta={a}
                  onErro={setErro}
                  onConcluido={async () => {
                    setErro(null);
                    setAberto(null);
                    await carregar();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </ControlesListaPaginada>
    </div>
  );
}
