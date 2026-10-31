import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  atualizarHorarioContratual,
  criarHorarioContratual,
  listarHorariosContratuais,
} from "../api/dadosContrato";
import type { HorarioContratual, OrigemJornadaDiaria } from "../api/dadosContrato";
import { listRegrasSindicais } from "../api/regrasSindicais";
import type { Empresa, RegraSindical } from "../api/types";

const ROTULO_ORIGEM: Record<OrigemJornadaDiaria, string> = {
  CONTRATO: "Contrato individual",
  CCT: "Convenção coletiva (CCT)",
  ACT: "Acordo coletivo (ACT)",
  REFERENCIA_LEGAL: "Referência legal (8 h)",
};

function hhmm(min: number | null | undefined): string {
  if (min == null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function minDeHhmm(v: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}
function horasParaMin(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 60) : undefined;
}
function minParaHoras(min: number | null | undefined): string {
  return min == null ? "" : String(Math.round((min / 60) * 100) / 100).replace(".", ",");
}
function msg(e: unknown, padrao: string) {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return padrao;
}

const LIVRE = "Jornada livre";
const FIXA = "Jornada fixa";

/**
 * Rodada 609: cadastro dos horarios contratuais NA EMPRESA (CNPJ), nao no motorista.
 * O contrato e igual para todos; a empresa trabalha com jornada livre (sem entrada/saida fixas),
 * respeitando o descanso minimo de 11 h entre jornadas (CLT art. 66), conferido na apuracao.
 * Um horario marcado como "padrao da empresa" vale para todo motorista sem horario proprio.
 * Aviso: a jornada contratual maior que o limite normal da regra sindical vira hora extra (CLT art. 619).
 */
export function HorariosContratuaisCard({ empresas }: { empresas: Empresa[] }) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const empresa = empresas.find((e) => e.id === empresaId);
  const [horarios, setHorarios] = useState<HorarioContratual[]>([]);
  const [regras, setRegras] = useState<RegraSindical[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState(LIVRE);
  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [intervalo, setIntervalo] = useState("0");
  const [semanal, setSemanal] = useState("44");
  const [diaria, setDiaria] = useState("");
  const [origem, setOrigem] = useState<OrigemJornadaDiaria | "">("");
  const [padrao, setPadrao] = useState(false);
  const [formAberto, setFormAberto] = useState(false);

  const limiteColetivoMin = regras.find((r) => r.id === empresa?.regraSindicalId)?.limiteJornadaNormalMin;

  async function carregar() {
    if (!empresaId) return;
    try {
      setHorarios(await listarHorariosContratuais(empresaId));
    } catch {
      setHorarios([]);
    }
  }
  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);
  useEffect(() => {
    listRegrasSindicais().then(setRegras).catch(() => setRegras([]));
  }, []);

  function limpar() {
    setEditandoId(null);
    setCodigo("");
    setTipo(LIVRE);
    setEntrada("");
    setSaida("");
    setIntervalo("0");
    setSemanal("44");
    setDiaria("");
    setOrigem("");
    setPadrao(horarios.length === 0);
  }

  function abrirNovo() {
    limpar();
    setPadrao(horarios.length === 0);
    setFormAberto(true);
  }

  function editar(h: HorarioContratual) {
    setEditandoId(h.id);
    setCodigo(h.codigo);
    setTipo(h.entradaMin == null && h.saidaMin == null ? LIVRE : FIXA);
    setEntrada(hhmm(h.entradaMin));
    setSaida(hhmm(h.saidaMin));
    setIntervalo(String(h.intervaloMin));
    setSemanal(minParaHoras(h.cargaSemanalMin));
    setDiaria(minParaHoras(h.jornadaDiariaMin));
    setOrigem(h.jornadaDiariaOrigem ?? "");
    setPadrao(!!h.padraoEmpresa);
    setFormAberto(true);
    setOk(null);
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    const livre = tipo === LIVRE;
    const diariaMin = horasParaMin(diaria);
    const semanalMin = horasParaMin(semanal);
    if (semanalMin == null) {
      setErro("Informe a carga semanal em horas.");
      return;
    }
    try {
      if (editandoId) {
        await atualizarHorarioContratual(editandoId, {
          tipoJornada: tipo,
          entradaMin: livre ? null : (minDeHhmm(entrada) ?? null),
          saidaMin: livre ? null : (minDeHhmm(saida) ?? null),
          intervaloMin: Number(intervalo) || 0,
          cargaSemanalMin: semanalMin,
          jornadaDiariaMin: diariaMin ?? null,
          jornadaDiariaOrigem: diariaMin != null && origem ? origem : null,
          padraoEmpresa: padrao,
        });
        setOk("Horário atualizado.");
      } else {
        await criarHorarioContratual(empresaId, {
          codigo: codigo.trim(),
          tipoJornada: tipo,
          entradaMin: livre ? undefined : minDeHhmm(entrada),
          saidaMin: livre ? undefined : minDeHhmm(saida),
          intervaloMin: Number(intervalo) || 0,
          cargaSemanalMin: semanalMin,
          jornadaDiariaMin: diariaMin,
          jornadaDiariaOrigem: diariaMin != null && origem ? origem : undefined,
          padraoEmpresa: padrao,
        });
        setOk("Horário criado.");
      }
      setFormAberto(false);
      limpar();
      await carregar();
    } catch (ex) {
      setErro(msg(ex, "Não foi possível salvar o horário."));
    }
  }

  async function alternarAtivo(h: HorarioContratual) {
    setErro(null);
    try {
      await atualizarHorarioContratual(h.id, { ativo: !h.ativo });
      await carregar();
    } catch (ex) {
      setErro(msg(ex, "Não foi possível alterar o horário."));
    }
  }

  async function tornarPadrao(h: HorarioContratual) {
    setErro(null);
    try {
      await atualizarHorarioContratual(h.id, { padraoEmpresa: true });
      await carregar();
    } catch (ex) {
      setErro(msg(ex, "Não foi possível definir o padrão."));
    }
  }

  const avisoColetivo =
    limiteColetivoMin != null && horasParaMin(diaria) != null && (horasParaMin(diaria) as number) > limiteColetivoMin;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Horário contratual da empresa</h3>
      <p style={{ fontSize: 13 }}>
        O contrato vale para todos os motoristas do CNPJ. A empresa trabalha com jornada livre: não há horário fixo de
        entrada e saída, só a duração da jornada e o descanso mínimo de 11 h entre jornadas (conferido na apuração). O
        horário marcado como padrão vale para todo motorista que não tiver horário próprio.
      </p>
      {empresas.length > 1 && (
        <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.razaoSocial} ({e.cnpj})
            </option>
          ))}
        </select>
      )}
      {erro && <p className="error-text">{erro}</p>}
      {ok && <p style={{ color: "#166534", fontSize: 13 }}>{ok}</p>}

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Tipo</th>
            <th>Jornada diária</th>
            <th>Origem</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {horarios.map((h) => {
            const excede =
              limiteColetivoMin != null && h.jornadaDiariaMin != null && h.jornadaDiariaMin > limiteColetivoMin;
            return (
              <tr key={h.id}>
                <td>{h.codigo}</td>
                <td>
                  {h.tipoJornada}
                  {h.entradaMin != null && h.saidaMin != null ? ` (${hhmm(h.entradaMin)} às ${hhmm(h.saidaMin)})` : ""}
                </td>
                <td>
                  {h.jornadaDiariaMin != null ? `${minParaHoras(h.jornadaDiariaMin)} h` : "não informada"}
                  {excede && (
                    <div className="error-text" style={{ fontSize: 12 }}>
                      Maior que o limite normal da regra sindical ({minParaHoras(limiteColetivoMin)} h). Com CCT/ACT
                      menor, vale o coletivo (CLT art. 619); o excedente é hora extra.
                    </div>
                  )}
                </td>
                <td>{h.jornadaDiariaOrigem ? ROTULO_ORIGEM[h.jornadaDiariaOrigem] : "—"}</td>
                <td>
                  {h.padraoEmpresa ? <strong>Padrão da empresa</strong> : h.ativo ? "Ativo" : "Inativo"}
                  {h.padraoEmpresa && !h.ativo ? " (inativo)" : ""}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="secondary" onClick={() => editar(h)}>
                    Editar
                  </button>{" "}
                  {!h.padraoEmpresa && h.ativo && (
                    <button type="button" className="secondary" onClick={() => void tornarPadrao(h)}>
                      Tornar padrão
                    </button>
                  )}{" "}
                  {!h.padraoEmpresa && (
                    <button type="button" className="secondary" onClick={() => void alternarAtivo(h)}>
                      {h.ativo ? "Desativar" : "Ativar"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {horarios.length === 0 && (
            <tr>
              <td colSpan={6}>Nenhum horário cadastrado. Sem horário, o AEJ oficial não é gerado.</td>
            </tr>
          )}
        </tbody>
      </table>

      {!formAberto && (
        <button type="button" onClick={abrirNovo} style={{ marginTop: 8 }}>
          Novo horário
        </button>
      )}

      {formAberto && (
        <form onSubmit={salvar} style={{ display: "grid", gap: 6, maxWidth: 480, marginTop: 12 }}>
          <h4 style={{ margin: 0 }}>{editandoId ? "Editar horário" : "Novo horário"}</h4>
          <label>Código (aparece no espelho e no AEJ)</label>
          <input maxLength={20} value={codigo} onChange={(e) => setCodigo(e.target.value)} required disabled={!!editandoId} />
          <label>Tipo de jornada</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value={LIVRE}>Jornada livre (sem horário fixo; respeita 11 h de descanso entre jornadas)</option>
            <option value={FIXA}>Jornada fixa (com entrada e saída)</option>
          </select>
          {tipo !== LIVRE && (
            <>
              <label>Entrada (hh:mm)</label>
              <input value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="08:00" />
              <label>Saída (hh:mm)</label>
              <input value={saida} onChange={(e) => setSaida(e.target.value)} placeholder="18:00" />
              <label>Intervalo (minutos)</label>
              <input inputMode="numeric" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} />
            </>
          )}
          <label>Carga semanal (horas)</label>
          <input inputMode="decimal" value={semanal} onChange={(e) => setSemanal(e.target.value)} required />
          <label>Jornada diária contratual (horas)</label>
          <input inputMode="decimal" value={diaria} onChange={(e) => setDiaria(e.target.value)} placeholder="ex.: 8 ou 7,33" />
          {avisoColetivo && (
            <p className="error-text" style={{ fontSize: 12, margin: 0 }}>
              Maior que o limite normal da regra sindical vinculada ({minParaHoras(limiteColetivoMin)} h). Se a CCT/ACT
              tiver jornada menor, vale o coletivo (CLT art. 619) e o excedente é hora extra.
            </p>
          )}
          <label>Origem da jornada diária</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value as OrigemJornadaDiaria | "")} required={!!diaria.trim()}>
            <option value="">Selecione</option>
            {(Object.keys(ROTULO_ORIGEM) as OrigemJornadaDiaria[]).map((o) => (
              <option key={o} value={o}>
                {ROTULO_ORIGEM[o]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDiaria("8");
              setOrigem("REFERENCIA_LEGAL");
            }}
          >
            Usar a referência legal de 8 h (contrato e coletivo omissos)
          </button>
          <label>
            <input type="checkbox" checked={padrao} onChange={(e) => setPadrao(e.target.checked)} /> Padrão da empresa
            (vale para todo motorista sem horário próprio)
          </label>
          <small>
            Se o contrato for menor que o coletivo, vale o contrato; se for maior, vale o coletivo; entre acordo e
            convenção, vale o acordo. A jornada diária é obrigatória para gerar o AEJ oficial e o sistema não a preenche
            sozinho.
          </small>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">{editandoId ? "Salvar" : "Criar horário"}</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setFormAberto(false);
                limpar();
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
