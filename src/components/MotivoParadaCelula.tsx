import { useState } from "react";
import { corrigirMotivoDaParada } from "../api/correcaoParada";
import { ROTULO_MOTIVO_PARADA } from "../api/types";
import type { MotivoParada, RegistroJornada } from "../api/types";
import { mensagemDoErro } from "../utils/mensagemDoErro";

const MOTIVOS = Object.keys(ROTULO_MOTIVO_PARADA) as MotivoParada[];

/**
 * Motivo da parada na linha do registro. Mostra o motivo vigente (a correção mais recente, se houver)
 * e, no início da parada, deixa o gestor corrigir o motivo com justificativa. O registro original e o
 * hash não mudam, e o motivo não altera a apuração: a parada conta na jornada em qualquer motivo.
 */
export function MotivoParadaCelula({
  registro: r,
  motoristaId,
  onCorrigido,
}: {
  registro: RegistroJornada;
  motoristaId: string;
  onCorrigido: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoParada>("OUTRO");
  const [observacao, setObservacao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!r.motivoParada) return null;
  const vigente = r.motivoParadaVigente ?? r.motivoParada;
  const observacaoVigente = r.motivoParadaCorrigido ? r.observacaoParadaVigente : r.observacao;
  const inicio = r.tipoEvento === "INICIO_PARADA";

  function abrir() {
    setMotivo(vigente);
    setObservacao(observacaoVigente ?? "");
    setJustificativa("");
    setErro(null);
    setAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await corrigirMotivoDaParada(motoristaId, r.id, {
        motivoNovo: motivo,
        observacao: motivo === "OUTRO" && observacao.trim() ? observacao.trim() : undefined,
        justificativa: justificativa.trim(),
      });
      setAberto(false);
      onCorrigido();
    } catch (err) {
      setErro(mensagemDoErro(err, "Não foi possível corrigir o motivo."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ fontSize: 11 }}>
      {ROTULO_MOTIVO_PARADA[vigente]}
      {inicio && observacaoVigente ? `: ${observacaoVigente}` : ""}
      {r.motivoParadaCorrigido && (
        <span title={`Motivo informado na marcação: ${ROTULO_MOTIVO_PARADA[r.motivoParada]}`}> (corrigido pelo gestor)</span>
      )}
      {inicio && !aberto && (
        <>
          {" "}
          <button type="button" className="botao-link-externo" onClick={abrir}>
            Corrigir motivo
          </button>
        </>
      )}
      {inicio && aberto && (
        <form onSubmit={salvar} style={{ display: "grid", gap: 6, marginTop: 6, maxWidth: 320 }}>
          <select value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoParada)}>
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {ROTULO_MOTIVO_PARADA[m]}
              </option>
            ))}
          </select>
          {motivo === "OUTRO" && (
            <input
              value={observacao}
              maxLength={50}
              placeholder="Observação (até 50 caracteres)"
              onChange={(e) => setObservacao(e.target.value)}
            />
          )}
          <textarea
            value={justificativa}
            rows={2}
            maxLength={500}
            required
            placeholder="Por que o motivo estava errado? (mínimo de 10 caracteres)"
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <span style={{ color: "#555" }}>
            O registro original fica guardado e não muda a jornada nem o pagamento.
          </span>
          {erro && <span style={{ color: "#b91c1c" }}>{erro}</span>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={salvando || justificativa.trim().length < 10}>
              {salvando ? "Salvando..." : "Salvar correção"}
            </button>
            <button type="button" disabled={salvando} onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
