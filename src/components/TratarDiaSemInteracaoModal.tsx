import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { tratarDiaSemInteracao } from "../api/autorrelatoFolga";
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
      "O motorista não trabalhou e não tinha folga. Fica registrado como falta apurada por você.",
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

        {erro && <p className="error-text">{erro}</p>}

        <div className="confirm-modal-acoes">
          <button type="button" className="secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando || !escolha}>
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
