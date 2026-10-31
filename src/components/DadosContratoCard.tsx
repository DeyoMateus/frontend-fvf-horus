import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  atualizarContratoMotorista,
  listarHorariosContratuais,
} from "../api/dadosContrato";
import type { HorarioContratual } from "../api/dadosContrato";
import type { Motorista } from "../api/types";

function hhmm(min: number | null | undefined): string {
  if (min == null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function msg(e: unknown, padrao: string) {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return padrao;
}

/**
 * Rodada 378 (passo 27, interface): dados de contrato do motorista exigidos no
 * espelho e no AEJ (admissão, cargo, matrícula, horário contratual). Os horários
 * são cadastrados na empresa (tela Empresas, rodada 609); aqui o motorista só usa o padrão ou escolhe um horário próprio.
 */
export function DadosContratoCard({
  motorista,
  onSalvo,
}: {
  motorista: Motorista;
  onSalvo: () => void;
}) {
  const [horarios, setHorarios] = useState<HorarioContratual[]>([]);
  const [admissao, setAdmissao] = useState((motorista.dataAdmissao ?? "").slice(0, 10));
  const [cargo, setCargo] = useState(motorista.cargo ?? "");
  const [matricula, setMatricula] = useState(motorista.matricula ?? "");
  const [matEsocial, setMatEsocial] = useState(motorista.matriculaEsocial ?? "");
  const [horarioId, setHorarioId] = useState(motorista.horarioContratualId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregarHorarios() {
    if (!motorista.empresaId) return;
    try {
      setHorarios(await listarHorariosContratuais(motorista.empresaId));
    } catch {
      setHorarios([]);
    }
  }
  useEffect(() => {
    void carregarHorarios();
  }, [motorista.empresaId]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setSalvando(true);
    try {
      await atualizarContratoMotorista(motorista.id, {
        dataAdmissao: admissao || null,
        cargo: cargo.trim() || null,
        matricula: matricula.trim() || null,
        matriculaEsocial: matEsocial.trim() || null,
        horarioContratualId: horarioId || null,
      });
      setOk("Dados de contrato salvos.");
      onSalvo();
    } catch (ex) {
      setErro(msg(ex, "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Dados de contrato</h3>
      <p style={{ fontSize: 13 }}>
        Aparecem no espelho de ponto e no arquivo AEJ (Portaria 671, art. 84).
      </p>
      <form onSubmit={salvar} style={{ display: "grid", gap: 6, maxWidth: 480 }}>
        <label>Data de admissão</label>
        <input type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
        <label>Cargo / função</label>
        <input maxLength={80} value={cargo} onChange={(e) => setCargo(e.target.value)} />
        <label>Matrícula</label>
        <input maxLength={40} value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        <label>Matrícula no eSocial</label>
        <input maxLength={40} value={matEsocial} onChange={(e) => setMatEsocial(e.target.value)} />
        <label>Horário contratual</label>
        <select value={horarioId} onChange={(e) => setHorarioId(e.target.value)}>
          <option value="">Usar o horário padrão da empresa</option>
          {horarios
            .filter((h) => h.ativo || h.id === horarioId)
            .map((h) => (
              <option key={h.id} value={h.id}>
                {h.codigo} — {h.tipoJornada}{h.padraoEmpresa ? " (padrão da empresa)" : ""}
                {h.entradaMin != null && h.saidaMin != null
                  ? ` (${hhmm(h.entradaMin)} às ${hhmm(h.saidaMin)})`
                  : ""}
              </option>
            ))}
        </select>
        <small>Os horários são cadastrados na tela Empresas. Sem escolha aqui, vale o horário padrão da empresa.</small>
        {erro && <p className="error-text">{erro}</p>}
        {ok && <p style={{ color: "#166534", fontSize: 13 }}>{ok}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>

    </div>
  );
}
