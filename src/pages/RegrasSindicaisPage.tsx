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
import { DuracaoInput } from "../components/DuracaoInput";
import { minParaHoras } from "../utils/formatarDuracao";
import { FeriadosPage } from "./FeriadosPage";
import type {
  CategoriaTransporteSindical,
  Empresa,
  RegraSindical,
  BancoHorasTipo,
  FonteFeriado,
  TratamentoFeriado,
} from "../api/types";
import { CampoTextoExpansivel } from "../components/CampoTextoExpansivel";

const REGRA_PADRAO: RegraSindicalInput = {
  nome: "",
  categoriaTransporte: "RODOVIARIO",
  toleranciaMarcacaoMin: 0,
  limiteJornadaNormalMin: 480,
  limiteHoraExtraFaixa1Min: 120,
  limiteHoraExtraDiariaMaxMin: 120,
  percentualHoraExtra1: "50",
  percentualHoraExtra2: "70",
  percentualAdicionalNoturno: "20",
  duracaoMinutoNoturnoMin: "60",
  intervaloRefeicaoMinimoMin: 60,
  percentualHoraEspera: "30",
  bancoHorasAtivo: false,
  janelaNoturnaInicioMin: 1320,
  janelaNoturnaFimMin: 300,
  prorrogacaoNoturna: true,
  declaracaoRespaldoCct: false,
  bancoHorasTipo: "SEM_BANCO",
  bancoHorasFator: 1,
  feriadoFonte: "BASE_DA_EMPRESA",
};

function dataCurta(v?: string | null): string | undefined {
  return v ? v.slice(0, 10) : undefined;
}

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
      limiteHoraExtraDiariaMaxMin: regra.limiteHoraExtraDiariaMaxMin ?? 120,
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
      intervaloRefeicaoMinimoMin: regra.intervaloRefeicaoMinimoMin,
      percentualHoraEspera: regra.percentualHoraEspera,
      acordoColetivo: regra.acordoColetivo ?? false,
      numeroMediador: regra.numeroMediador ?? undefined,
      sindicato: regra.sindicato ?? undefined,
      dataBase: regra.dataBase ?? undefined,
      janelaNoturnaInicioMin: regra.janelaNoturnaInicioMin ?? 1320,
      janelaNoturnaFimMin: regra.janelaNoturnaFimMin ?? 300,
      prorrogacaoNoturna: regra.prorrogacaoNoturna ?? true,
      cctVigenciaInicio: dataCurta(regra.cctVigenciaInicio),
      cctVigenciaFim: dataCurta(regra.cctVigenciaFim),
      cctDocumentoRef: regra.cctDocumentoRef ?? undefined,
      declaracaoRespaldoCct: regra.declaracaoRespaldoCct ?? false,
      bancoHorasTipo: regra.bancoHorasTipo ?? "SEM_BANCO",
      bancoHorasFator:
        regra.bancoHorasFator !== undefined ? Number(regra.bancoHorasFator) : 1,
      feriadoTratamento: regra.feriadoTratamento ?? undefined,
      feriadoFonte: regra.feriadoFonte ?? "BASE_DA_EMPRESA",
      folgaDomingoACadaSemanas: regra.folgaDomingoACadaSemanas ?? undefined,
      marcoAdi5322Data: dataCurta(regra.marcoAdi5322Data),
      marcoAdi5322Referencia: regra.marcoAdi5322Referencia ?? undefined,
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
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setErroForm(
        (Array.isArray(m) ? m.join(" ") : m) ??
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
        (categorização de horas extras, adicional noturno, banco de horas etc.),
        o sistema não calcula a folha de pagamento completa.
      </p>

      {usuario?.papel === "ADMIN" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {editandoId ? "Editar regra" : "Nova regra sindical"}
          </h3>
          <form onSubmit={onSubmit}>
            <label>Nome da convenção</label>
            <CampoTextoExpansivel
              maxLength={200}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="ex.: Sindicato Rodoviário de SP - Base 2026/2027"
              required
            />

            <label>Sindicato</label>
            <input
              maxLength={120}
              value={form.sindicato ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, sindicato: e.target.value || undefined }))
              }
            />
            <label>Data-base da categoria</label>
            <input
              maxLength={40}
              value={form.dataBase ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, dataBase: e.target.value || undefined }))
              }
            />
            <label>
              <input
                type="checkbox"
                checked={form.acordoColetivo ?? false}
                onChange={(e) =>
                  setForm((f) => ({ ...f, acordoColetivo: e.target.checked }))
                }
              />{" "}
              Regra vem de convenção ou acordo coletivo registrado
            </label>
            <label>Número do registro no Mediador</label>
            <input
              maxLength={60}
              value={form.numeroMediador ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  numeroMediador: e.target.value || undefined,
                }))
              }
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
                <label>Tolerância de marcação (máximo de 5 minutos, CLT art. 58, §1º). Ainda não aplicada ao cálculo</label>
                <DuracaoInput
                  valorMin={form.toleranciaMarcacaoMin ?? 0}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, toleranciaMarcacaoMin: v ?? 0 }))
                  }
                />
              </div>
              <div>
                <label>Jornada normal antes de virar extra</label>
                <DuracaoInput
                  valorMin={form.limiteJornadaNormalMin ?? 480}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, limiteJornadaNormalMin: v ?? 480 }))
                  }
                />
              </div>

              <div>
                <label>Limite da 1ª faixa de hora extra</label>
                <DuracaoInput
                  valorMin={form.limiteHoraExtraFaixa1Min ?? 120}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      limiteHoraExtraFaixa1Min: v ?? 120,
                    }))
                  }
                />
              </div>
              <div>
                <label>Máximo de horas extras por dia</label>
                <DuracaoInput
                  valorMin={form.limiteHoraExtraDiariaMaxMin ?? 120}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      limiteHoraExtraDiariaMaxMin: Math.min(v ?? 120, 240),
                    }))
                  }
                />
                <p style={{ fontSize: 12, marginTop: 2 }}>
                  Padrão 2h; a convenção pode permitir até 4h. O alerta crítico
                  de direção dispara em jornada normal + este máximo.
                </p>
              </div>
              <div>
                <label>% hora extra (1ª faixa)</label>
                <input
                  type="number"
                  step="0.01"
                  min={50}
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
                  min={50}
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
                <label>Alerta do banco de horas ao acumular (opcional)</label>
                <DuracaoInput
                  opcional
                  valorMin={form.bancoHorasLimiteAlertaMin ?? undefined}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, bancoHorasLimiteAlertaMin: v }))
                  }
                />
              </div>

              <div>
                <label>Intervalo de refeição, mínimo</label>
                <DuracaoInput
                  valorMin={form.intervaloRefeicaoMinimoMin ?? 60}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      intervaloRefeicaoMinimoMin: v ?? 60,
                    }))
                  }
                />
              </div>

              <div>
                <label>Adicional de espera previsto em CCT (informativo, não entra no cálculo)</label>
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

              <div style={{ gridColumn: "1 / -1" }}>
                <h4 style={{ margin: "8px 0 0" }}>Trabalho noturno</h4>
                <p style={{ color: "#000000", fontSize: 12, marginTop: 2 }}>
                  Padrão da CLT: das 22h às 5h, hora de 52min30s e adicional
                  mínimo de 20%. Valores diferentes só valem com respaldo em
                  convenção ou acordo coletivo (documento e declaração abaixo).
                </p>
              </div>
              <div>
                <label>Início da janela noturna</label>
                <DuracaoInput
                  valorMin={form.janelaNoturnaInicioMin ?? 1320}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, janelaNoturnaInicioMin: v ?? 1320 }))
                  }
                />
              </div>
              <div>
                <label>Fim da janela noturna</label>
                <DuracaoInput
                  valorMin={form.janelaNoturnaFimMin ?? 300}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, janelaNoturnaFimMin: v ?? 300 }))
                  }
                />
              </div>
              <div>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={form.prorrogacaoNoturna ?? true}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        prorrogacaoNoturna: e.target.checked,
                      }))
                    }
                  />
                  Prorrogação do horário noturno após as 5h
                </label>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <h4 style={{ margin: "8px 0 0" }}>Respaldo na convenção</h4>
              </div>
              <div>
                <label>Vigência da convenção, início</label>
                <input
                  type="date"
                  value={form.cctVigenciaInicio ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cctVigenciaInicio: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label>Vigência da convenção, fim</label>
                <input
                  type="date"
                  value={form.cctVigenciaFim ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cctVigenciaFim: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label>Referência do documento (registro no MTE, cláusula)</label>
                <input
                  type="text"
                  maxLength={300}
                  value={form.cctDocumentoRef ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cctDocumentoRef: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={form.declaracaoRespaldoCct ?? false}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        declaracaoRespaldoCct: e.target.checked,
                      }))
                    }
                  />
                  Declaro que os valores desta regra que diferem do padrão legal
                  têm respaldo no documento acima
                </label>
                {(Number(form.duracaoMinutoNoturnoMin ?? 60) !== 52.5 ||
                  (form.janelaNoturnaInicioMin ?? 1320) !== 1320 ||
                  (form.janelaNoturnaFimMin ?? 300) !== 300 ||
                  Number(form.percentualAdicionalNoturno ?? 20) < 20) && (
                  <p style={{ color: "#000000", fontSize: 12, marginTop: 2 }}>
                    Atenção: esta regra difere do padrão da CLT para o trabalho
                    noturno (hora de 52min30s, janela das 22h às 5h, adicional
                    de pelo menos 20%). Informe o documento, a vigência e marque
                    a declaração, ou o servidor pode recusar o cadastro.
                  </p>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <h4 style={{ margin: "8px 0 0" }}>Banco de horas e feriados</h4>
              </div>
              <div>
                <label>Tipo de banco de horas</label>
                <select
                  value={form.bancoHorasTipo ?? "SEM_BANCO"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bancoHorasTipo: e.target.value as BancoHorasTipo,
                    }))
                  }
                >
                  <option value="SEM_BANCO">Sem banco de horas</option>
                  <option value="INDIVIDUAL">
                    Individual (compensação em até 6 meses)
                  </option>
                  <option value="COLETIVO">
                    Coletivo (acordo ou convenção, até 12 meses)
                  </option>
                  <option value="MENSAL">Compensação no mesmo mês</option>
                </select>
              </div>
              <div>
                <label>Fator de conversão do crédito</label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  value={form.bancoHorasFator ?? 1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bancoHorasFator: e.target.value
                        ? Number(e.target.value)
                        : 1,
                    }))
                  }
                />
              </div>
              <div>
                <label>Tratamento do trabalho em feriado</label>
                <select
                  value={form.feriadoTratamento ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      feriadoTratamento: e.target.value
                        ? (e.target.value as TratamentoFeriado)
                        : undefined,
                    }))
                  }
                >
                  <option value="">Não definido</option>
                  <option value="PAGAR_DOBRO">Pagar em dobro</option>
                  <option value="LANCAR_NO_BANCO">Lançar no banco de horas</option>
                  <option value="EXIGIR_FOLGA_COMPENSATORIA">
                    Exigir folga compensatória
                  </option>
                </select>
              </div>
              <div>
                <label>Calendário de feriados usado</label>
                <select
                  value={form.feriadoFonte ?? "BASE_DA_EMPRESA"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      feriadoFonte: e.target.value as FonteFeriado,
                    }))
                  }
                >
                  <option value="BASE_DA_EMPRESA">Cidade-base da empresa</option>
                  <option value="LOCAL_DA_OPERACAO">Local da operação</option>
                </select>
              </div>
              <div>
                <label>Folga em domingo a cada quantas semanas (opcional)</label>
                <input
                  type="number"
                  min={1}
                  value={form.folgaDomingoACadaSemanas ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      folgaDomingoACadaSemanas: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="definido pela convenção"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <h4 style={{ margin: "8px 0 0" }}>
                  Marco da modulação da ADI 5322
                </h4>
                <p style={{ color: "#000000", fontSize: 12, marginTop: 2 }}>
                  Em branco, vale a data padrão do sistema (12/07/2023). Se a
                  empresa adotar outra data, registre a referência da decisão.
                </p>
              </div>
              <div>
                <label>Data do marco</label>
                <input
                  type="date"
                  value={form.marcoAdi5322Data ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      marcoAdi5322Data: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label>Referência da decisão (ata, publicação)</label>
                <input
                  type="text"
                  maxLength={300}
                  value={form.marcoAdi5322Referencia ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      marcoAdi5322Referencia: e.target.value || undefined,
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
                  <td>{minParaHoras(r.limiteJornadaNormalMin)}</td>
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
            style={{ cursor: "pointer", color: "#000", fontWeight: 600 }}
          >
            O que é o "padrão legal geral"? (clique para ver os valores)
          </summary>
          <div style={{ marginTop: 8, color: "#000", lineHeight: 1.6 }}>
            <p style={{ margin: "4px 0" }}>
              <strong>Padrão do sistema, sem regra sindical vinculada.</strong>{" "}
              Os limites de direção e de jornada podem ser sobrescritos por
              CCT/ACT registrada. O descanso de 11h entre jornadas não pode ser
              reduzido nem fracionado. Valores que não vêm da lei estão
              indicados como parâmetro do sistema:
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
                crítico em 5h. São parâmetros do sistema, não valores da lei. O
                tempo de espera conta como tempo à disposição (CLT art. 235-C,
                §1º). A referência de 5h é do art. 11, §5º, da Lei 11.442/2007,
                usada na cobrança contra o contratante.
              </li>
              <li>
                Descanso entre jornadas (interjornada): mínimo de 11h (CLT art.
                66 / Lei 13.103). Vale sempre, sem exceção. Se o motorista
                encerrou por engano e reabriu, o RH trata o alerta e registra que
                foi a mesma jornada (a decisão fica na trilha de auditoria).
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
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Como funcionam os feriados</h3>
          <p style={{ fontSize: 13, color: "#000", lineHeight: 1.6, margin: "4px 0" }}>
            O sistema reconhece o domingo sozinho, mas não conhece os feriados,
            porque eles mudam de cidade para cidade. Por isso, cada feriado que
            a empresa aceita precisa ser cadastrado abaixo, com data e descrição.
          </p>
          <p style={{ fontSize: 13, color: "#000", lineHeight: 1.6, margin: "4px 0" }}>
            Ao cadastrar, escolha se o feriado é "pago como domingo/feriado" (as
            horas trabalhadas nesse dia recebem o percentual diferenciado da
            convenção coletiva escolhida acima) ou apenas informativo. Se deixar o
            CNPJ em branco, o feriado vale para todos os CNPJs do grupo.
          </p>
        </div>
        <FeriadosPage />
      </div>
    </div>
  );
}
