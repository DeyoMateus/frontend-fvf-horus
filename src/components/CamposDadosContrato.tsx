import { useEffect, useState } from "react";
import { listarHorariosContratuais } from "../api/dadosContrato";
import type {
  ContratoMotoristaInput,
  HorarioContratual,
} from "../api/dadosContrato";
import type { Motorista } from "../api/types";

function hhmm(min: number | null | undefined): string {
  if (min == null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Cargos disponíveis no cadastro de motorista (seleção, não texto livre). Novos cargos entram aqui. */
export const CARGOS_MOTORISTA: readonly string[] = ["Motorista"];

export interface ValoresContrato {
  dataAdmissao: string;
  cargo: string;
  matricula: string;
  matriculaEsocial: string;
  horarioContratualId: string;
}

export const CONTRATO_VAZIO: ValoresContrato = {
  dataAdmissao: "",
  cargo: "",
  matricula: "",
  matriculaEsocial: "",
  horarioContratualId: "",
};

export function contratoDoMotorista(m: Motorista): ValoresContrato {
  return {
    dataAdmissao: (m.dataAdmissao ?? "").slice(0, 10),
    cargo: m.cargo ?? "",
    matricula: m.matricula ?? "",
    matriculaEsocial: m.matriculaEsocial ?? "",
    horarioContratualId: m.horarioContratualId ?? "",
  };
}

export function contratoParaPayload(v: ValoresContrato): ContratoMotoristaInput {
  return {
    dataAdmissao: v.dataAdmissao || null,
    cargo: v.cargo.trim() || null,
    matricula: v.matricula.trim() || null,
    matriculaEsocial: v.matriculaEsocial.trim() || null,
    horarioContratualId: v.horarioContratualId || null,
  };
}

export function contratoPreenchido(v: ValoresContrato): boolean {
  return Boolean(
    v.dataAdmissao ||
      v.cargo.trim() ||
      v.matricula.trim() ||
      v.matriculaEsocial.trim() ||
      v.horarioContratualId,
  );
}

/**
 * Dados de contrato do motorista (admissão, cargo, matrícula, horário
 * contratual), exigidos no espelho de ponto e no AEJ (Portaria 671, art. 84).
 * Pedido do usuário: ficam só no cadastro de novo motorista e na edição do
 * cadastro, não mais na tela de detalhes. Componente controlado: quem usa
 * guarda os valores e salva junto com o restante do formulário.
 */
export function CamposDadosContrato({
  valores,
  onChange,
  empresaId,
}: {
  valores: ValoresContrato;
  onChange: (v: ValoresContrato) => void;
  empresaId?: string | null;
}) {
  const [horarios, setHorarios] = useState<HorarioContratual[]>([]);

  useEffect(() => {
    let ativo = true;
    if (!empresaId) {
      setHorarios([]);
      return;
    }
    listarHorariosContratuais(empresaId)
      .then((h) => {
        if (ativo) setHorarios(h);
      })
      .catch(() => {
        if (ativo) setHorarios([]);
      });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  function set<K extends keyof ValoresContrato>(k: K, v: string) {
    onChange({ ...valores, [k]: v });
  }

  const rotulo = { marginTop: 8, display: "block" } as const;

  return (
    <>
      <h4 style={{ marginBottom: 4 }}>Dados de contrato</h4>
      <p style={{ fontSize: 13, marginTop: 0 }}>
        Aparecem no espelho de ponto e no arquivo AEJ (Portaria 671, art. 84).
      </p>
      <label style={rotulo}>Data de admissão</label>
      <input
        type="date"
        value={valores.dataAdmissao}
        onChange={(e) => set("dataAdmissao", e.target.value)}
      />
      <label style={rotulo}>Cargo / função</label>
      <select
        value={valores.cargo}
        onChange={(e) => set("cargo", e.target.value)}
      >
        <option value="">Selecione...</option>
        {CARGOS_MOTORISTA.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        {/* Cadastro antigo com texto livre: mantém o valor visível para não apagá-lo sem querer. */}
        {valores.cargo && !CARGOS_MOTORISTA.includes(valores.cargo) && (
          <option value={valores.cargo}>{valores.cargo}</option>
        )}
      </select>
      <label style={rotulo}>Matrícula</label>
      <input
        maxLength={40}
        value={valores.matricula}
        onChange={(e) => set("matricula", e.target.value)}
      />
      <label style={rotulo}>Matrícula no eSocial</label>
      <input
        maxLength={40}
        value={valores.matriculaEsocial}
        onChange={(e) => set("matriculaEsocial", e.target.value)}
      />
      <label style={rotulo}>Horário contratual</label>
      <select
        value={valores.horarioContratualId}
        onChange={(e) => set("horarioContratualId", e.target.value)}
      >
        <option value="">Usar o horário padrão da empresa</option>
        {horarios
          .filter((h) => h.ativo || h.id === valores.horarioContratualId)
          .map((h) => (
            <option key={h.id} value={h.id}>
              {h.codigo} — {h.tipoJornada}
              {h.padraoEmpresa ? " (padrão da empresa)" : ""}
              {h.entradaMin != null && h.saidaMin != null
                ? ` (${hhmm(h.entradaMin)} às ${hhmm(h.saidaMin)})`
                : ""}
            </option>
          ))}
      </select>
      <small style={{ display: "block" }}>
        Os horários são cadastrados na tela Empresas. Sem escolha aqui, vale o
        horário padrão da empresa.
      </small>
    </>
  );
}
