import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { atualizarRegimeBancoHorasSuperAdmin } from "../api/superAdmin";
import type {
  RegimeBancoHoras,
  RegimeBancoHorasEmpresa,
  RegimeDomingoFeriado,
} from "../api/types";

const ROTULO_REGIME: Record<RegimeBancoHoras, string> = {
  NENHUM: "Nenhum (sem banco de horas)",
  ACORDO_INDIVIDUAL_6M: "Acordo individual (compensação em até 6 meses)",
  CONVENCAO_COLETIVA_12M: "Convenção/acordo coletivo (até 12 meses)",
  COMPENSACAO_NO_MES: "Compensação no mesmo mês",
};
const ROTULO_DOMINGO: Record<RegimeDomingoFeriado, string> = {
  NAO_DEFINIDO: "Não definido",
  DOBRA_NO_BANCO: "Dobra no banco de horas",
  PAGO_NO_HOLERITE: "Pago no holerite",
  COMPENSACAO_1_PARA_1: "Compensação 1 para 1 (folga)",
};

/**
 * Rodada 377 (passo 31, interface): regime do banco de horas e de
 * domingo/feriado de UMA empresa. Só o super admin altera; regime com prazo
 * exige o documento do acordo e o início da vigência (o servidor confere).
 */
export function RegimeBancoHorasForm({
  empresaId,
  nome,
  inicial,
  onSalvo,
  onFechar,
}: {
  empresaId: string;
  nome: string;
  inicial?: RegimeBancoHorasEmpresa;
  onSalvo: () => void;
  onFechar: () => void;
}) {
  const [regime, setRegime] = useState<RegimeBancoHoras>(inicial?.regime ?? "NENHUM");
  const [domingo, setDomingo] = useState<RegimeDomingoFeriado>(inicial?.domingoFeriado ?? "NAO_DEFINIDO");
  const [documento, setDocumento] = useState(inicial?.documento ?? "");
  const [vigencia, setVigencia] = useState(inicial?.vigenciaInicio ?? "");
  const [tetoHoras, setTetoHoras] = useState(inicial?.tetoMin ? String(inicial.tetoMin / 60) : "");
  const [fator, setFator] = useState(String(inicial?.fator ?? 1));
  const [razaoAtivo, setRazaoAtivo] = useState(inicial?.razaoAtivo ?? false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const teto = tetoHoras.trim() ? Math.round(Number(tetoHoras.replace(",", ".")) * 60) : undefined;
      await atualizarRegimeBancoHorasSuperAdmin(empresaId, {
        regime,
        domingoFeriado: domingo,
        documento: documento.trim() || undefined,
        vigenciaInicio: vigencia || undefined,
        tetoMin: teto,
        fator: Number(fator.replace(",", ".")) || 1,
        razaoAtivo,
        motivo: motivo.trim(),
      });
      onSalvo();
    } catch (ex) {
      const m = ex instanceof AxiosError ? ex.response?.data?.message : null;
      setErro(Array.isArray(m) ? String(m[0]) : typeof m === "string" ? m : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} style={{ display: "grid", gap: 8, maxWidth: 560 }}>
      <h4 style={{ margin: 0 }}>Banco de horas: {nome}</h4>
      <label>Regime do banco de horas</label>
      <select value={regime} onChange={(e) => setRegime(e.target.value as RegimeBancoHoras)}>
        {(Object.keys(ROTULO_REGIME) as RegimeBancoHoras[]).map((k) => (
          <option key={k} value={k}>{ROTULO_REGIME[k]}</option>
        ))}
      </select>
      <label>Domingo e feriado</label>
      <select value={domingo} onChange={(e) => setDomingo(e.target.value as RegimeDomingoFeriado)}>
        {(Object.keys(ROTULO_DOMINGO) as RegimeDomingoFeriado[]).map((k) => (
          <option key={k} value={k}>{ROTULO_DOMINGO[k]}</option>
        ))}
      </select>
      {regime !== "NENHUM" && (
        <>
          <label>Documento do acordo (nº do acordo individual ou da CCT/ACT)</label>
          <input maxLength={200} value={documento} onChange={(e) => setDocumento(e.target.value)} />
          <label>Início da vigência</label>
          <input type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
          <label>Teto do saldo, em horas (opcional)</label>
          <input inputMode="decimal" value={tetoHoras} onChange={(e) => setTetoHoras(e.target.value)} />
          <label>Fator de conversão (1 a 3)</label>
          <input inputMode="decimal" value={fator} onChange={(e) => setFator(e.target.value)} />
        </>
      )}
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={razaoAtivo} onChange={(e) => setRazaoAtivo(e.target.checked)} />
        Ativar o razão de lançamentos (use primeiro numa empresa-piloto)
      </label>
      <label>Motivo da alteração (mín. 10 caracteres, vai para a auditoria)</label>
      <input maxLength={400} value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={10} />
      {erro && <p className="error-text">{erro}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        <button type="button" className="secondary" onClick={onFechar}>Cancelar</button>
      </div>
    </form>
  );
}
