import { FormEvent, useEffect, useState } from "react";
import { listEmpresas, vincularRegraSindical } from "../api/empresas";
import {
  createRegraSindical,
  desativarRegraSindical,
  listRegrasSindicais,
  updateRegraSindical,
} from "../api/regrasSindicais";
import type { RegraSindicalInput } from "../api/regrasSindicais";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmProvider";
import { FeriadosPage } from "./FeriadosPage";
import type {
  CategoriaTransporteSindical,
  Empresa,
  RegraSindical,
} from "../api/types";

const REGRA_PADRAO: RegraSindicalInput = {
  nome: "",
  categoriaTransporte: "RODOVIARIO",
  toleranciaMarcacaoMin: 0,
  limiteJornadaNormalMin: 480,
  limiteHoraExtraFaixa1Min: 120,
  percentualHoraExtra1: "50",
  percentualHoraExtra2: "70",
  percentualAdicionalNoturno: "20",
  duracaoMinutoNoturnoMin: "60",
  primeiroPeriodoDescansoMinimoMin: 180,
  intervaloRefeicaoMinimoMin: 60,
  percentualHoraEspera: "30",
  bancoHorasAtivo: false,
};

/**
 * Cadastro de Convenções/Acordos Coletivos (CCT/ACT) do setor de
 * transporte , pelo "Negociado sobre o Legislado" (Art. 611-A da CLT),
 * o que o sindicato da base territorial negociou costuma valer sobre a
 * regra geral, então nada disso pode ficar fixo no sistema. Cada regra
 * pertence ao grupo (empresa-mãe) e é vinculada aos CNPJs que ela cobre
 * , uma mesma convenção pode cobrir vários CNPJs da mesma base.
 *
 * Isto alimenta a apuração de jornada (categorização de horas e alertas
 * de desvio) , não calcula folha de pagamento completa nem gera
 * holerite pronto (ver disclaimer no PDF de apuração).
 */
export function RegrasSindicaisPage() {
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const [regras, setRegras] = useState<RegraSindical[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<RegraSindicalInput>(REGRA_PADRAO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [rs, emps] = await Promise.all([
        listRegrasSindicais(),
        listEmpresas(),
      ]);
      setRegras(rs);
      setEmpresas(emps);
      setErro(null);
    } catch {
      setErro("Não foi possível carregar as regras sindicais.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.grupoId]);

  function onEditar(regra: RegraSindical) {
    setEditandoId(regra.id);
    setForm({
      nome: regra.nome,
      categoriaTransporte: regra.categoriaTransporte,
      toleranciaMarcacaoMin: regra.toleranciaMarcacaoMin,
      limiteJornadaNormalMin: regra.limiteJornadaNormalMin,
      limiteHoraExtraFaixa1Min: regra.limiteHoraExtraFaixa1Min,
      percentualHoraExtra1: regra.percentualHoraExtra1,
      percentualHoraExtra2: regra.percentualHoraExtra2,
      percentualHoraExtraDomingoFeriado:
        regra.percentualHoraExtraDomingoFeriado ?? undefined,
      percentualAdicionalNoturno: regra.percentualAdicionalNoturno,
      duracaoMinutoNoturnoMin: regra.duracaoMinutoNoturnoMin,
      bancoHorasAtivo: regra.bancoHorasAtivo,
      bancoHorasPrazoExpiracaoMeses:
        regra.bancoHorasPrazoExpiracaoMeses ?? undefined,
      bancoHorasLimiteAlertaMin: regra.bancoHorasLimiteAlertaMin ?? undefined,
      primeiroPeriodoDescansoMinimoMin: regra.primeiroPeriodoDescansoMinimoMin,
      intervaloRefeicaoMinimoMin: regra.intervaloRefeicaoMinimoMin,
      percentualHoraEspera: regra.percentualHoraEspera,
      percentualHoraEsperaRefeicao:
        regra.percentualHoraEsperaRefeicao ?? undefined,
      ativo: regra.ativo,
    });
  }

  function onCancelarEdicao() {
    setEditandoId(null);
    setForm(REGRA_PADRAO);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);
    try {
      if (editandoId) {
        await updateRegraSindical(editandoId, form);
      } else {
        await createRegraSindical(form);
      }
      onCancelarEdicao();
      await carregar();
    } catch {
      setErroForm(
        "Não foi possível salvar (confira os campos, principalmente o nome).",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function onDesativar(id: string) {
    if (
      !(await confirm(
        "Desativar esta regra? Ela deixa de valer pra novas apurações (CNPJs vinculados voltam ao padrão legal geral), mas o histórico já gerado com ela não muda.",
        { perigo: true, textoConfirmar: "Desativar" },
      ))
    ) {
      return;
    }
    await desativarRegraSindical(id);
    await carregar();
  }

  async function onVincularCnpj(empresaId: string, regraSindicalId: string) {
    await vincularRegraSindical(empresaId, regraSindicalId || null);
    await carregar();
  }

  return (
    <div>
      <h2>Regras sindicais (CCT/ACT)</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Convenções e acordos coletivos do setor de transporte, por
        sindicato/base territorial. Vale sobre a regra geral da CLT em vários
        pontos (Art. 611-A). Cadastre uma regra por convenção e vincule aos
        CNPJs que ela cobre. Os parâmetros alimentam a apuração de jornada
        (categorização de horas extras, adicional noturno, banco de horas etc.);
        o sistema não calcula a folha de pagamento completa nem entrega o
        holerite pronto.
      </p>

      {usuario?.papel === "ADMIN" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {editandoId ? "Editar regra" : "Nova regra sindical"}
          </h3>
          <form onSubmit={onSubmit}>
            <label>Nome da convenção</label>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="ex.: Sindicato Rodoviário de SP - Base 2026/2027"
              required
            />

            <label>Categoria de transporte</label>
            <select
              value={form.categoriaTransporte}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  categoriaTransporte: e.target
                    .value as CategoriaTransporteSindical,
                }))
              }
            >
              <option value="RODOVIARIO">
                Rodoviário (interestadual/longa distância)
              </option>
              <option value="URBANO">
                Urbano (curta distância/entrega urbana)
              </option>
            </select>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label>Tolerância de marcação (minutos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.toleranciaMarcacaoMin ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      toleranciaMarcacaoMin: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label>Jornada normal antes de virar extra (minutos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.limiteJornadaNormalMin ?? 480}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      limiteJornadaNormalMin: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <label>Limite da 1ª faixa de hora extra (minutos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.limiteHoraExtraFaixa1Min ?? 120}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      limiteHoraExtraFaixa1Min: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label>% hora extra (1ª faixa)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.percentualHoraExtra1 ?? "50"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualHoraExtra1: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label>% hora extra (demais horas)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.percentualHoraExtra2 ?? "70"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualHoraExtra2: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label>% hora extra domingo/feriado em viagem (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.percentualHoraExtraDomingoFeriado ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualHoraExtraDomingoFeriado:
                        e.target.value || undefined,
                    }))
                  }
                />
              </div>

              <div>
                <label>% adicional noturno</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.percentualAdicionalNoturno ?? "20"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualAdicionalNoturno: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label>Duração da "hora noturna" (minutos reais)</label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  max={60}
                  value={form.duracaoMinutoNoturnoMin ?? "60"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      duracaoMinutoNoturnoMin: e.target.value,
                    }))
                  }
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.bancoHorasAtivo ?? false}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bancoHorasAtivo: e.target.checked,
                      }))
                    }
                  />
                  Banco de horas ativo
                </label>
                <p style={{ color: "#000000", fontSize: 12, marginTop: 2 }}>
                  Quando ligado, a hora extra apurada dos motoristas desta
                  convenção passa a ser tratada como crédito no banco de horas
                  (aba Indicadores), a compensar em folga ou pagar de acordo com
                  a lei/CCT. O gestor registra a compensação/pagamento na ficha
                  do motorista. Desligado (padrão): hora extra continua só
                  apurada/paga direto, como sempre foi.
                </p>
              </div>
              <div>
                <label>
                  Prazo de expiração do banco de horas (meses, opcional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.bancoHorasPrazoExpiracaoMeses ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bancoHorasPrazoExpiracaoMeses: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="ex.: 3, 6 ou 12"
                />
              </div>
              <div>
                <label>
                  Alerta do banco de horas ao acumular (minutos, opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.bancoHorasLimiteAlertaMin ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bancoHorasLimiteAlertaMin: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>

              <div>
                <label>1º período de descanso, mínimo (minutos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.primeiroPeriodoDescansoMinimoMin ?? 180}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      primeiroPeriodoDescansoMinimoMin: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <label>Intervalo de refeição, mínimo (minutos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.intervaloRefeicaoMinimoMin ?? 60}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      intervaloRefeicaoMinimoMin: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <label>% sobre salário-hora para espera</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.percentualHoraEspera ?? "30"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualHoraEspera: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label>% para espera durante refeição (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.percentualHoraEsperaRefeicao ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualHoraEsperaRefeicao: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>

            {erroForm && <p className="error-text">{erroForm}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : editandoId
                    ? "Salvar alterações"
                    : "Cadastrar regra"}
              </button>
              {editandoId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={onCancelarEdicao}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Jornada normal</th>
                <th>Extra 1ª/demais</th>
                <th>Adic. noturno</th>
                <th>Banco de horas</th>
                <th>Status</th>
                <th>CNPJs vinculados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td>
                    {r.categoriaTransporte === "RODOVIARIO"
                      ? "Rodoviário"
                      : "Urbano"}
                  </td>
                  <td>{(r.limiteJornadaNormalMin / 60).toFixed(1)}h</td>
                  <td>
                    {r.percentualHoraExtra1}% / {r.percentualHoraExtra2}%
                  </td>
                  <td>{r.percentualAdicionalNoturno}%</td>
                  <td>{r.bancoHorasAtivo ? "Ativo" : "Desligado"}</td>
                  <td>{r.ativo ? "Ativa" : "Desativada"}</td>
                  <td style={{ fontSize: 12 }}>
                    {(r.empresas ?? []).map((e) => e.razaoSocial).join(", ") ||
                      ","}
                  </td>
                  <td>
                    {usuario?.papel === "ADMIN" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => onEditar(r)}>
                          Editar
                        </button>
                        {r.ativo && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => onDesativar(r.id)}
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {regras.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ color: "#000000" }}>
                    Nenhuma regra sindical cadastrada. Os CNPJs seguem o padrão
                    legal geral (CLT/Lei 13.103).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Vincular CNPJ a uma regra</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Escolha, para cada CNPJ do grupo, qual convenção coletiva se aplica.
          Sem regra escolhida, o CNPJ usa o padrão legal geral. Veja o que isso
          significa na prática logo abaixo.
        </p>

        <details style={{ margin: "8px 0 16px", fontSize: 13 }}>
          <summary
            style={{ cursor: "pointer", color: "#374151", fontWeight: 600 }}
          >
            O que é o "padrão legal geral"? (clique para ver os valores)
          </summary>
          <div style={{ marginTop: 8, color: "#4b5563", lineHeight: 1.6 }}>
            <p style={{ margin: "4px 0" }}>
              <strong>Sempre vale, com ou sem regra sindical vinculada</strong>{" "}
              (não é possível desligar nem sobrescrever por convenção): são os
              limites de segurança do motor de jornada:
            </p>
            <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
              <li>
                Direção contínua: aviso a partir de 5h, crítico em 5h30 (Lei
                13.103).
              </li>
              <li>
                Jornada de direção total no dia: aviso a partir de 8h, crítico
                em 10h, somando 8h regulares + 2h extras (Lei 13.103).
              </li>
              <li>
                Tempo de espera: informativo a partir de 3h, aviso em 4h45,
                crítico em 5h (Lei 13.103, art. 235-C).
              </li>
              <li>
                Descanso entre jornadas (interjornada): mínimo de 11h (CLT art.
                66 / Lei 13.103). Só se aplica quando a jornada anterior já
                tinha cumprido as 8h de direção (ou mais, com hora extra) ,
                se a jornada anterior ficou incompleta (ex.: motorista
                encerrou por engano e reabriu), a nova jornada conta como
                complemento dela e não gera esse alerta.
              </li>
            </ul>
            <p style={{ margin: "4px 0" }}>
              <strong>
                Só vale quando NÃO há regra sindical vinculada ao CNPJ
              </strong>{" "}
              (vincular uma regra substitui estes três abaixo pelos valores que
              você cadastrar nela):
            </p>
            <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
              <li>
                Jornada normal antes de virar hora extra: 8h/dia (CLT art. 58).
              </li>
              <li>
                Hora extra: 50% na 1ª faixa (até 2h extras), mínimo legal
                garantido pela CF/CLT art. 7º, XVI.
              </li>
              <li>Adicional noturno (22h–5h): 20% (CLT art. 73).</li>
            </ul>
            <p style={{ margin: "4px 0", fontSize: 12, fontStyle: "italic" }}>
              Atenção: o percentual de 70% para a 2ª faixa de hora extra
              (visível no formulário de cadastro de regra) é um valor padrão de
              sistema, não uma exigência legal fixa. A CLT só garante o mínimo
              de 50% para qualquer hora extra; percentuais maiores costumam vir
              de convenção coletiva, por isso o sistema deixa esse número
              editável por regra. Os demais valores acima refletem a legislação
              geral (CLT/Lei 13.103), mas nenhuma configuração deste sistema
              substitui a orientação de um advogado trabalhista para o seu caso
              específico.
            </p>
          </div>
        </details>
        <table>
          <thead>
            <tr>
              <th>CNPJ</th>
              <th>Razão social</th>
              <th>Regra sindical aplicada</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.cnpj}</td>
                <td>{emp.razaoSocial}</td>
                <td>
                  <select
                    value={emp.regraSindicalId ?? ""}
                    onChange={(e) => onVincularCnpj(emp.id, e.target.value)}
                    disabled={
                      usuario?.papel !== "ADMIN" && usuario?.papel !== "GESTOR"
                    }
                  >
                    <option value="">Padrão legal geral</option>
                    {regras
                      .filter((r) => r.ativo)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nome}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "#000000" }}>
                  Nenhum CNPJ cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <FeriadosPage />
      </div>
    </div>
  );
}
