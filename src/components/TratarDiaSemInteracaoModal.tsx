import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarPendenciasJustificativa,
  solicitarJustificativaDia,
  tratarDiaSemInteracao,
} from "../api/autorrelatoFolga";
import type { PendenciaJustificativaDia } from "../api/autorrelatoFolga";
import type { TipoTratamentoDiaSemInteracao } from "../api/autorrelatoFolga";

type Escolha = TipoTratamentoDiaSemInteracao | "SEM_SINAL";

const OPCOES: { valor: Escolha; titulo: string; explicacao: string }[] = [
  {
    valor: "FOLGA",
    titulo: "Folga",
    explicacao:
      "O motorista estava de folga (combinado com a empresa). O dia passa a constar como folga concedida.",
  },
  {
    valor: "FALTA",
    titulo: "Falta",
    explicacao:
      "O motorista não trabalhou e não tinha folga. Fica registrado como falta informada por você; a consequência trabalhista deve ser avaliada pela empresa.",
  },
  {
    valor: "ATESTADO",
    titulo: "Atestado ou afastamento",
    explicacao: "Atestado médico, licença ou outro afastamento.",
  },
  {
    valor: "SEM_SINAL",
    titulo: "Sem sinal ou esquecimento",
    explicacao:
      "O motorista trabalhou, mas o ponto não foi registrado (sem sinal, problema no celular ou esquecimento). Você será levado ao Tratamento de ponto para lançar os horários da jornada. O dia sai do radar assim que o ponto for lançado.",
  },
  {
    valor: "OUTRO",
    titulo: "Outro motivo",
    explicacao: "Qualquer outra situação. Descreva o que foi apurado.",
  },
];

function formatarDia(dia: string): string {
  return dia.slice(0, 10).split("-").reverse().join("/");
}

/**
 * Janela do radar "dias sem interação": o gestor escolhe o que
 * aconteceu naquele dia. Folga, falta, atestado e outro registram o
 * tratamento e tiram o dia do radar; "sem sinal ou esquecimento" leva ao
 * Tratamento de ponto (lançar os horários de verdade).
 */
export function TratarDiaSemInteracaoModal({
  motoristaId,
  motoristaNome,
  dia,
  onFechar,
  onTratado,
}: {
  motoristaId: string;
  motoristaNome: string;
  dia: string;
  onFechar: () => void;
  onTratado: () => void;
}) {
  const navigate = useNavigate();
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendencia, setPendencia] = useState<PendenciaJustificativaDia | null>(
    null,
  );
  const [solicitando, setSolicitando] = useState(false);

  useEffect(() => {
    let ativo = true;
    listarPendenciasJustificativa(motoristaId)
      .then((lista) => {
        if (!ativo) return;
        setPendencia(
          lista.find((p) => p.data.slice(0, 10) === dia.slice(0, 10)) ?? null,
        );
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [motoristaId, dia]);

  const prazoAberto =
    !!pendencia &&
    !pendencia.justificadaEm &&
    new Date(pendencia.prazoEm).getTime() > Date.now();
  const faltaBloqueada = escolha === "FALTA" && (!pendencia || prazoAberto);

  async function onSolicitar() {
    setSolicitando(true);
    setErro(null);
    try {
      setPendencia(await solicitarJustificativaDia(motoristaId, dia.slice(0, 10)));
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setErro(
        (Array.isArray(msg) ? msg.join(" ") : msg) ||
          "Não foi possível solicitar a justificativa.",
      );
    } finally {
      setSolicitando(false);
    }
  }

  async function onConfirmar(e: FormEvent) {
    e.preventDefault();
    if (!escolha) {
      setErro("Escolha o que aconteceu neste dia.");
      return;
    }
    if (escolha === "SEM_SINAL") {
      navigate(
        `/motoristas/${motoristaId}?secao=lancar-jornada&data=${dia.slice(0, 10)}`,
      );
      onFechar();
      return;
    }
    if (faltaBloqueada) {
      setErro(
        "Para lançar falta, peça a justificativa ao motorista e aguarde o fim do prazo.",
      );
      return;
    }
    if (observacao.trim().length < 10) {
      setErro("Descreva o que foi apurado (mínimo de 10 caracteres).");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await tratarDiaSemInteracao(motoristaId, {
        data: dia.slice(0, 10),
        tipo: escolha,
        observacao: observacao.trim(),
      });
      onTratado();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setErro(
        (Array.isArray(msg) ? msg.join(" ") : msg) ||
          "Não foi possível tratar este dia. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="confirm-overlay" role="presentation" onClick={onFechar}>
      <form
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Tratar dia sem interação"
        style={{ maxWidth: 560, width: "92vw" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void onConfirmar(e)}
      >
        <h3>
          Tratar {formatarDia(dia)} de {motoristaNome}
        </h3>
        <p>
          Neste dia o motorista não bateu nenhum ponto e não avisou folga. O que
          aconteceu?
        </p>
        <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
          {OPCOES.map((o) => (
            <label
              key={o.valor}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                border:
                  escolha === o.valor
                    ? "2px solid #1d4ed8"
                    : "1px solid #d1d5db",
                borderRadius: 8,
                padding: 8,
                cursor: "pointer",
                fontWeight: 400,
              }}
            >
              <input
                type="radio"
                name="tipo-dia"
                checked={escolha === o.valor}
                onChange={() => {
                  setEscolha(o.valor);
                  setErro(null);
                }}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>{o.titulo}</strong>
                <br />
                <span style={{ fontSize: 12 }}>{o.explicacao}</span>
              </span>
            </label>
          ))}
        </div>

        {escolha && escolha !== "SEM_SINAL" && (
          <>
            <label style={{ textAlign: "left", marginTop: 8 }}>
              O que foi apurado? (mínimo 10 caracteres)
            </label>
            <textarea
              maxLength={400}
              rows={3}
              value={observacao}
              onChange={(e) => {
                setObservacao(e.target.value);
                setErro(null);
              }}
              placeholder="Ex.: confirmado por telefone com o motorista, folga combinada com o supervisor."
            />
          </>
        )}

        {escolha === "FALTA" && (
          <div style={{ textAlign: "left", fontSize: 13, marginTop: 8 }}>
            {!pendencia && (
              <>
                <p>
                  Antes de lançar a falta, o motorista precisa ser avisado e ter
                  3 dias corridos para justificar.
                </p>
                <button
                  type="button"
                  className="secondary"
                  disabled={solicitando}
                  onClick={() => void onSolicitar()}
                >
                  {solicitando ? "Enviando..." : "Pedir justificativa ao motorista"}
                </button>
              </>
            )}
            {pendencia && !pendencia.justificadaEm && (
              <p>
                Justificativa pedida. Prazo até{" "}
                {new Date(pendencia.prazoEm).toLocaleString("pt-BR")}.
                {prazoAberto
                  ? " Aguarde o fim do prazo para lançar a falta."
                  : " O prazo terminou sem resposta."}
              </p>
            )}
            {pendencia?.justificadaEm && (
              <p>
                O motorista respondeu: “{pendencia.justificativa}”. Avalie antes
                de lançar.
              </p>
            )}
          </div>
        )}

        {erro && <p className="error-text">{erro}</p>}

        <div className="confirm-modal-acoes">
          <button type="button" className="secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando || !escolha || faltaBloqueada}>
            {escolha === "SEM_SINAL"
              ? "Ir para o tratamento de ponto"
              : enviando
                ? "Salvando..."
                : "Tratar dia"}
          </button>
        </div>
      </form>
    </div>
  );
}
