import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  atualizarContratoMotorista,
  criarHorarioContratual,
  listarHorariosContratuais,
} from "../api/dadosContrato";
import type { HorarioContratual } from "../api/dadosContrato";
import type { Motorista } from "../api/types";

function hhmm(min: number | null | undefined): string {
  if (min == null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function minDeHhmm(v: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
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
 * espelho e no AEJ (admissão, cargo, matrícula, horário contratual). ADMIN cria
 * os horários da empresa; ADMIN e GESTOR vinculam ao motorista.
 */
export function DadosContratoCard({
  motorista,
  podeCriarHorario,
  onSalvo,
}: {
  motorista: Motorista;
  podeCriarHorario: boolean;
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

  const [novo, setNovo] = useState(false);
  const [hCodigo, setHCodigo] = useState("");
  const [hTipo, setHTipo] = useState("Jornada fixa");
  const [hEntrada, setHEntrada] = useState("08:00");
  const [hSaida, setHSaida] = useState("18:00");
  const [hIntervalo, setHIntervalo] = useState("60");
  const [hSemanal, setHSemanal] = useState("44");

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

  async function criarHorario(e: FormEvent) {
    e.preventDefault();
    if (!motorista.empresaId) return;
    setErro(null);
    try {
      const h = await criarHorarioContratual(motorista.empresaId, {
        codigo: hCodigo.trim(),
        tipoJornada: hTipo.trim(),
        entradaMin: minDeHhmm(hEntrada),
        saidaMin: minDeHhmm(hSaida),
        intervaloMin: Number(hIntervalo) || 0,
        cargaSemanalMin: Math.round(Number(hSemanal.replace(",", ".")) * 60),
      });
      await carregarHorarios();
      setHorarioId(h.id);
      setNovo(false);
      setHCodigo("");
    } catch (ex) {
      setErro(msg(ex, "Não foi possível criar o horário."));
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
          <option value="">Não informado</option>
          {horarios
            .filter((h) => h.ativo || h.id === horarioId)
            .map((h) => (
              <option key={h.id} value={h.id}>
                {h.codigo} — {h.tipoJornada}
                {h.entradaMin != null && h.saidaMin != null
                  ? ` (${hhmm(h.entradaMin)} às ${hhmm(h.saidaMin)})`
                  : ""}
              </option>
            ))}
        </select>
        {erro && <p className="error-text">{erro}</p>}
        {ok && <p style={{ color: "#166534", fontSize: 13 }}>{ok}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          {podeCriarHorario && (
            <button type="button" className="secondary" onClick={() => setNovo((v) => !v)}>
              {novo ? "Fechar" : "Novo horário"}
            </button>
          )}
        </div>
      </form>

      {novo && (
        <form onSubmit={criarHorario} style={{ display: "grid", gap: 6, maxWidth: 480, marginTop: 12 }}>
          <h4 style={{ margin: 0 }}>Novo horário contratual da empresa</h4>
          <label>Código (aparece no espelho e no AEJ)</label>
          <input maxLength={20} value={hCodigo} onChange={(e) => setHCodigo(e.target.value)} required />
          <label>Tipo de jornada</label>
          <input maxLength={60} value={hTipo} onChange={(e) => setHTipo(e.target.value)} required />
          <label>Entrada (hh:mm)</label>
          <input value={hEntrada} onChange={(e) => setHEntrada(e.target.value)} placeholder="08:00" />
          <label>Saída (hh:mm)</label>
          <input value={hSaida} onChange={(e) => setHSaida(e.target.value)} placeholder="18:00" />
          <label>Intervalo (minutos)</label>
          <input inputMode="numeric" value={hIntervalo} onChange={(e) => setHIntervalo(e.target.value)} />
          <label>Carga semanal (horas)</label>
          <input inputMode="decimal" value={hSemanal} onChange={(e) => setHSemanal(e.target.value)} required />
          <button type="submit">Criar horário</button>
        </form>
      )}
    </div>
  );
}
