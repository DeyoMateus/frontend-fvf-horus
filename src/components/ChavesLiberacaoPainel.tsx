import { useState } from "react";
import { AxiosError } from "axios";
import { atualizarChaveLiberacaoSuperAdmin } from "../api/superAdmin";
import type { ChaveLiberacaoEstado } from "../api/types";

/**
 * Rodada 415 (Fase 8): chaves de liberação de UMA empresa. Cada funcionalidade nova entra
 * desligada e é ligada aqui, uma empresa por vez, com motivo (vai para a auditoria).
 * Comece por uma empresa-piloto e só ligue as demais depois de validar.
 */
export function ChavesLiberacaoPainel({
  empresaId,
  nome,
  chaves,
  onAlterado,
  onFechar,
}: {
  empresaId: string;
  nome: string;
  chaves: ChaveLiberacaoEstado[];
  onAlterado: () => void;
  onFechar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function alternar(c: ChaveLiberacaoEstado) {
    setErro(null);
    setAviso(null);
    if (motivo.trim().length < 10) {
      setErro("Escreva o motivo (mínimo de 10 caracteres) antes de mudar uma chave.");
      return;
    }
    setOcupada(c.chave);
    try {
      await atualizarChaveLiberacaoSuperAdmin(empresaId, {
        chave: c.chave,
        ligada: !c.ligada,
        motivo: motivo.trim(),
      });
      setAviso(`"${c.rotulo}" ${c.ligada ? "desligada" : "ligada"}.`);
      onAlterado();
    } catch (ex) {
      const m = ex instanceof AxiosError ? ex.response?.data?.message : null;
      setErro(Array.isArray(m) ? String(m[0]) : typeof m === "string" ? m : "Não foi possível alterar.");
    } finally {
      setOcupada(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
      <h4 style={{ margin: 0 }}>Chaves de liberação: {nome}</h4>
      <label>Motivo da mudança (mín. 10 caracteres, vai para a auditoria)</label>
      <input maxLength={400} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <table>
        <thead>
          <tr><th>Funcionalidade</th><th>Situação</th><th></th></tr>
        </thead>
        <tbody>
          {chaves.map((c) => (
            <tr key={c.chave}>
              <td>
                <strong>{c.rotulo}</strong>
                <div style={{ fontSize: 12 }}>{c.descricao}</div>
              </td>
              <td>{c.ligada ? "Ligada" : "Desligada"}</td>
              <td>
                <button
                  type="button"
                  className="secondary"
                  disabled={ocupada !== null || (c.ligada && c.naoDesliga)}
                  title={c.ligada && c.naoDesliga ? "Não desliga depois de ligada" : undefined}
                  onClick={() => void alternar(c)}
                >
                  {c.ligada ? "Desligar" : "Ligar"}
                </button>
              </td>
            </tr>
          ))}
          {chaves.length === 0 && <tr><td colSpan={3}>Nenhuma chave disponível.</td></tr>}
        </tbody>
      </table>
      {erro && <p className="error-text">{erro}</p>}
      {aviso && <p role="status">{aviso}</p>}
      <div>
        <button type="button" className="secondary" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}
