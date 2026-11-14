import { FormEvent, useEffect, useState } from "react";
import { ParametroInativo } from "../components/ParametroInativo";
import {
  listEmpresas,
  vincularRegraSindical,
  historicoRegraSindical,
  type VinculoRegraHistorico,
} from "../api/empresas";
import {
  createRegraSindical,
  desativarRegraSindical,
  listRegrasSindicais,
  updateRegraSindical,
  listarVersoesRegraSindical,
  type VersaoRegraSindical,
} from "../api/regrasSindicais";
import type { RegraSindicalInput } from "../api/regrasSindicais";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmProvider";
import { DuracaoInput } from "../components/DuracaoInput";
import { minParaHoras } from "../utils/formatarDuracao";
import { FeriadosPage } from "./FeriadosPage";
import { ConfiguracaoApuracaoAba } from "../components/ConfiguracaoApuracaoAba";
import { AbasTopo, useAbaAtiva, type AbaDef } from "../components/AbasTopo";
import { DicaAoPassar } from "../components/DicaAoPassar";

const ABAS_REGRAS: AbaDef[] = [
  { id: "regras", rotulo: "Regras sindicais (CCT/ACT)" },
  { id: "feriados", rotulo: "Feriados" },
  { id: "apuracao", rotulo: "Apuração e banco de horas" },
];
import type {
  CategoriaTransporteSindical,
  Empresa,
  RegraSindical,
  FonteFeriado,
  TratamentoFeriado,
} from "../api/types";
import { CampoTextoExpansivel } from "../components/CampoTextoExpansivel";
import { avisoVigenciaCct } from "../utils/vigenciaCct";

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
  intervaloEntreJornadasMin: 660,
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
  const aba = useAbaAtiva(ABAS_REGRAS);
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const [regras, setRegras] = useState<RegraSindical[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vigenciaVinculo, setVigenciaVinculo] = useState("");
  const [historico, setHistorico] = useState<Record<string, VinculoRegraHistorico[] | undefined>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<RegraSindicalInput>(REGRA_PADRAO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  // Rodada 588: data de inicio de vigencia da alteracao (vazio = hoje) e historico de versoes.
  const [vigenciaEdicao, setVigenciaEdicao] = useState("");
  const [versoes, setVersoes] = useState<VersaoRegraSindical[] | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  // Rodada 483: campos reprovados pela API (ficam em vermelho no formulario).
  const [camposComErro, setCamposComErro] = useState<string[]>([]);
  // Campo obrigatorio vazio (validacao do navegador): depois da 1a tentativa de salvar, fica vermelho.
  const [tentouSalvar, setTentouSalvar] = useState(false);

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
      refeicaoFracionamentoPermitido: regra.refeicaoFracionamentoPermitido ?? false,
      refeicaoFracionamentoClausula: regra.refeicaoFracionamentoClausula ?? undefined,
      intervaloEntreJornadasMin: regra.intervaloEntreJornadasMin ?? 660,
      repousoSemanalMinimoH: regra.repousoSemanalMinimoH ?? null,
      dsrMinimoH: regra.dsrMinimoH ?? null,
      viagemLongaDias: regra.viagemLongaDias ?? null,
      jornadaAbertaAlertaH: regra.jornadaAbertaAlertaH ?? null,
      compensacaoFeriadoDias: regra.compensacaoFeriadoDias ?? null,
      percentualDomingoFeriadoSemCompensacao:
        regra.percentualDomingoFeriadoSemCompensacao != null
          ? Number(regra.percentualDomingoFeriadoSemCompensacao)
          : null,
      percentualAdicionalInterjornada:
        regra.percentualAdicionalInterjornada != null
          ? Number(regra.percentualAdicionalInterjornada)
          : 50,
      incideReflexoDsrInterjornada: regra.incideReflexoDsrInterjornada ?? true,
      interjornadaNoBancoPermitida: regra.interjornadaNoBancoPermitida ?? false,
      bancoGuarda: regra.bancoGuarda ?? "fictos",
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
    setVigenciaEdicao("");
    setVersoes(null);
    setForm(REGRA_PADRAO);
    setCamposComErro([]);
    setTentouSalvar(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);
    setCamposComErro([]);
    try {
      if (editandoId) {
        try {
          await updateRegraSindical(editandoId, form, false, vigenciaEdicao || undefined);
        } catch (err) {
          const d = (
            err as { response?: { status?: number; data?: { codigo?: string; message?: string } } }
          )?.response;
          if (d?.status === 409 && d.data?.codigo === "REGRA_RETROATIVA") {
            const ok = await confirm(d.data.message ?? "Confirmar alteração da regra?");
            if (!ok) return;
            await updateRegraSindical(editandoId, form, true, vigenciaEdicao || undefined);
          } else {
            throw err;
          }
        }
      } else {
        await createRegraSindical(form);
      }
      onCancelarEdicao();
      await carregar();
    } catch (err) {
      const dados = (
        err as {
          response?: {
            data?: { message?: string | string[]; campos?: string[] };
          };
        }
      )?.response?.data;
      const m = dados?.message;
      setCamposComErro(Array.isArray(dados?.campos) ? dados.campos : []);
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
    const vigenciaInicio = vigenciaVinculo || undefined;
    try {
      await vincularRegraSindical(empresaId, regraSindicalId || null, { vigenciaInicio });
    } catch (e) {
      const d = (e as { response?: { status?: number; data?: { codigo?: string; message?: string } } })
        ?.response;
      if (d?.status === 409 && d.data?.codigo === "REGRA_RETROATIVA") {
        if (
          await confirm(
            d.data.message ??
              "A data é anterior a hoje: as jornadas daquele dia em diante passam a ser calculadas com esta regra. Confirmar?",
          )
        ) {
          await vincularRegraSindical(empresaId, regraSindicalId || null, {
            vigenciaInicio,
            confirmarRetroatividade: true,
          });
        }
      } else {
        throw e;
      }
    }
    await carregar();
    // Historico ja aberto desta empresa: recarrega.
    if (historico[empresaId]) {
      setHistorico((h) => ({ ...h, [empresaId]: undefined }));
      await alternarHistorico(empresaId, true);
    }
  }

  async function alternarHistorico(empresaId: string, forcar = false) {
    if (historico[empresaId] && !forcar) {
      setHistorico((h) => ({ ...h, [empresaId]: undefined }));
      return;
    }
    const lista = await historicoRegraSindical(empresaId);
    setHistorico((h) => ({ ...h, [empresaId]: lista }));
  }

  return (
    <div>
      <AbasTopo abas={ABAS_REGRAS} />
      {aba === "regras" && (
      <>
      <h2>
        Regras sindicais (CCT/ACT)
        <DicaAoPassar label="Sobre as regras sindicais">
          Convenções e acordos coletivos do setor de transporte, por
          sindicato/base territorial. Vale sobre a regra geral da CLT em vários
          pontos (Art. 611-A). Cadastre uma regra por convenção e vincule aos
          CNPJs que ela cobre. Os parâmetros alimentam a apuração de jornada
          (categorização de horas extras, adicional noturno, banco de horas
          etc.), o sistema não calcula a folha de pagamento completa.
        </DicaAoPassar>
      </h2>

      {usuario?.papel === "ADMIN" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {editandoId ? "Editar regra" : "Nova regra sindical"}
          </h3>
          <form onSubmit={onSubmit} onInvalidCapture={() => setTentouSalvar(true)}>
            <label>Nome da convenção</label>
            <CampoTextoExpansivel name="nome"
              maxLength={200}
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="ex.: Sindicato Rodoviário de SP - Base 2026/2027"
              required
            />

            <label>Sindicato</label>
            <input
              name="sindicato"
              maxLength={120}
              value={form.sindicato ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sindicato: e.target.value || undefined,
                }))
              }
            />
            <label>Data-base da categoria</label>
            <input
              name="dataBase"
              maxLength={40}
              value={form.dataBase ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  dataBase: e.target.value || undefined,
                }))
              }
            />
            <label>
              <input
                name="acordoColetivo"
                type="checkbox"
                checked={form.acordoColetivo ?? false}
                onChange={(e) =>
                  setForm((f) => ({ ...f, acordoColetivo: e.target.checked }))
                }
              />{" "}
              Regra vem de convenção ou acordo coletivo registrado
            </label>
            <label>
              Número do registro no Mediador
              {form.acordoColetivo
                ? " (obrigatório para acordo/convenção)"
                : ""}
            </label>
            <input
              name="numeroMediador"
              maxLength={60}
              required={form.acordoColetivo ?? false}
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
              name="categoriaTransporte"
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
                <label>
                  Tolerância de marcação (até 5 minutos por marcação,
                  observado o máximo de 10 minutos no total diário). Aplicada
                  ao extra do dia
                </label>
                <DuracaoInput
                  name="toleranciaMarcacaoMin"
                  valorMin={form.toleranciaMarcacaoMin ?? 0}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, toleranciaMarcacaoMin: v ?? 0 }))
                  }
                />
              </div>
              <div>
                <label>Jornada normal antes de virar extra</label>
                <DuracaoInput
                  name="limiteJornadaNormalMin"
                  valorMin={form.limiteJornadaNormalMin ?? 480}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, limiteJornadaNormalMin: v ?? 480 }))
                  }
                />
              </div>

              <div>
                <label>Limite da 1ª faixa de hora extra</label>
                <DuracaoInput
                  name="limiteHoraExtraFaixa1Min"
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
                  name="limiteHoraExtraDiariaMaxMin"
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
                  name="percentualHoraExtra1"
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
                  name="percentualHoraExtra2"
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
                  name="percentualHoraExtraDomingoFeriado"
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
                  name="percentualAdicionalNoturno"
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
                  name="duracaoMinutoNoturnoMin"
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
                <p style={{ color: "#000000", fontSize: 12, marginTop: 2 }}>
                  <strong>Banco de horas:</strong> o regime, o fator, o teto e a ativação do banco de horas
                  ficam na aba "Apuração e banco de horas" (ao lado de Feriados). Escolhendo um regime lá, a hora
                  extra apurada passa a ser tratada como crédito no banco, a compensar em folga ou pagar de acordo
                  com a lei/CCT. Sem regime, a hora extra continua só apurada e paga direto.
                </p>
              </div>
              <div>
                <label>
                  Prazo de expiração do banco de horas (meses, opcional; só encurta o prazo legal do regime da empresa)
                <ParametroInativo campo="bancoHorasPrazoExpiracaoMeses" /></label>
                <input
                  name="bancoHorasPrazoExpiracaoMeses"
                  type="number"
                  min={1}
                  value={form.bancoHorasPrazoExpiracaoMeses ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bancoHorasPrazoExpiracaoMeses: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="ex.: 3, 6 ou 12"
                />
              </div>
              <div>
                <label>Alerta do banco de horas ao acumular (opcional)</label>
                <DuracaoInput
                  name="bancoHorasLimiteAlertaMin"
                  opcional
                  valorMin={form.bancoHorasLimiteAlertaMin ?? undefined}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, bancoHorasLimiteAlertaMin: v }))
                  }
                />
              </div>

              <div>
                <label>Intervalo de refeição, mínimo<ParametroInativo campo="intervaloRefeicaoMinimoMin" /></label>
                <DuracaoInput
                  name="intervaloRefeicaoMinimoMin"
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
                <label>
                  <input
                    name="refeicaoFracionamentoPermitido"
                    type="checkbox"
                    checked={form.refeicaoFracionamentoPermitido ?? false}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        refeicaoFracionamentoPermitido: e.target.checked,
                      }))
                    }
                  />{" "}
                  Convenção coletiva permite fracionar a refeição
                </label>
                <small>
                  Desmarcado por padrão: a refeição conta em um único período. Marque só com acordo ou convenção
                  coletiva registrada (informe o número do Mediador acima). Marcado, a soma dos períodos de refeição
                  da jornada vale para o mínimo (ex.: 2 períodos de 30 min); só contam os períodos de pelo menos 30 minutos. Refeição menor que 1 hora também exige
                  acordo ou convenção, e nunca pode ser menor que 30 minutos.
                </small>
                {form.refeicaoFracionamentoPermitido && (
                  <div>
                    <label>Cláusula da convenção que autoriza o fracionamento e suas condições</label>
                    <textarea
                      name="refeicaoFracionamentoClausula"
                      rows={3}
                      maxLength={600}
                      placeholder="Ex.: Cláusula 12ª — fica autorizado fracionar a refeição em 2 períodos de no mínimo 30 minutos cada."
                      value={form.refeicaoFracionamentoClausula ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          refeicaoFracionamentoClausula: e.target.value || undefined,
                        }))
                      }
                    />
                    <small>
                      A convenção ou acordo precisa citar e autorizar expressamente o fracionamento, com as condições.
                      Texto genérico como "conforme a lei" não basta numa fiscalização.
                    </small>
                  </div>
                )}
              </div>

              <div>
                <label>Descanso mínimo entre jornadas (mínimo 11:00)</label>
                <DuracaoInput
                  name="intervaloEntreJornadasMin"
                  valorMin={form.intervaloEntreJornadasMin ?? 660}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      intervaloEntreJornadasMin: Math.max(660, v ?? 660),
                    }))
                  }
                />
                <small>
                  Uma jornada só termina depois deste tempo sem trabalho. A CCT
                  pode aumentar, nunca reduzir abaixo de 11 h. Vale para o
                  holerite, o dashboard e os alertas.
                </small>
              </div>

              <div>
                <label>Repouso semanal, duração em horas (opcional)</label>
                <input
                  name="repousoSemanalMinimoH"
                  type="number"
                  min={1}
                  max={168}
                  value={form.repousoSemanalMinimoH ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      repousoSemanalMinimoH: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
                <small>
                  Vazio = padrão do sistema (35 h: 24 h de repouso e 11 h de
                  descanso), sujeito a parecer jurídico. Informe 24 se a regra
                  for só o repouso semanal. Alimenta o alerta de repouso
                  semanal.
                </small>
              </div>

              <div>
                <label>
                  DSR, horas corridas sem jornada na semana (opcional)
                </label>
                <input
                  name="dsrMinimoH"
                  type="number"
                  min={1}
                  max={168}
                  value={form.dsrMinimoH ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dsrMinimoH: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
                <small>
                  Vazio = 24 h. Define quantas horas seguidas sem jornada contam
                  como DSR na semana. Alimenta o alerta e o relatório de DSR;
                  não altera pagamento.
                </small>
              </div>

              <div>
                <label>Viagem longa a partir de quantos dias (opcional)</label>
                <input
                  name="viagemLongaDias"
                  type="number"
                  min={1}
                  max={60}
                  value={form.viagemLongaDias ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      viagemLongaDias: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
                <small>
                  Vazio = 7 dias. Define quando o alerta de repouso semanal é de
                  viagem longa.
                </small>
              </div>

              <div>
                <label>
                  Alerta de jornada esquecida aberta, em horas (opcional)
                </label>
                <input
                  name="jornadaAbertaAlertaH"
                  type="number"
                  min={8}
                  max={48}
                  value={form.jornadaAbertaAlertaH ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      jornadaAbertaAlertaH: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
                <small>
                  Vazio = 16 horas. Depois desse tempo sem fim de jornada o
                  sistema alerta; ele nunca encerra a jornada sozinho.
                </small>
              </div>

              <div>
                <label>
                  Prazo para compensar domingo/feriado, em dias (opcional)
                </label>
                <input
                  name="compensacaoFeriadoDias"
                  type="number"
                  min={1}
                  max={62}
                  value={form.compensacaoFeriadoDias ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      compensacaoFeriadoDias: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
                <small>
                  Vazio = mesma semana (segunda a domingo). Só preencha com
                  previsão em CCT/ACT ou banco de horas. Por ora alimenta apenas
                  o relatório em modo sombra.
                </small>
              </div>

              <div>
                <label>% domingo/feriado sem compensação (opcional)</label>
                <input
                  name="percentualDomingoFeriadoSemCompensacao"
                  type="number"
                  step="0.01"
                  min={0}
                  max={300}
                  value={form.percentualDomingoFeriadoSemCompensacao ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualDomingoFeriadoSemCompensacao: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                />
                <small>
                  Vazio = 100 (tratamento em dobro quando devido, sem
                  compensação válida), sujeito a parecer. Só alimenta o
                  relatório em modo sombra; não altera pagamento.
                </small>
              </div>

              <div>
                <label>Adicional da interjornada suprimida (%)</label>
                <input
                  name="percentualAdicionalInterjornada"
                  type="number"
                  step="0.01"
                  min={50}
                  max={300}
                  value={form.percentualAdicionalInterjornada ?? 50}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentualAdicionalInterjornada: e.target.value
                        ? Number(e.target.value)
                        : 50,
                    }))
                  }
                />
                <small>
                  Padrão 50 (parâmetro do sistema; o tratamento financeiro
                  segue a legislação e a orientação aplicável), sujeito a parecer.
                  Incide sobre as horas que faltaram para completar o descanso
                  de 11 h. Hoje só aparece no relatório em modo sombra; não
                  altera pagamento.
                </small>
              </div>

              <div>
                <label>
                  <input
                    name="incideReflexoDsrInterjornada"
                    type="checkbox"
                    checked={form.incideReflexoDsrInterjornada ?? true}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        incideReflexoDsrInterjornada: e.target.checked,
                      }))
                    }
                  />{" "}
                  Interjornada suprimida reflete no DSR
                </label>
                <small>
                  Marcado por padrão (natureza salarial, com os reflexos de hora
                  extra). Desmarque só se a CCT disser o contrário. Sujeito a
                  parecer.
                </small>
              </div>

              <div>
                <label>
                  <input
                    name="interjornadaNoBancoPermitida"
                    type="checkbox"
                    checked={form.interjornadaNoBancoPermitida ?? false}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        interjornadaNoBancoPermitida: e.target.checked,
                      }))
                    }
                  />{" "}
                  Convenção coletiva permite compensar a interjornada pelo banco
                  de horas
                  <ParametroInativo campo="interjornadaNoBancoPermitida" />
                </label>
                <small>
                  Desmarcado por padrão: a supressão do descanso entre
                  jornadas é registrada separadamente, em evento próprio, fora
                  do banco de horas; o tratamento financeiro segue a legislação
                  e a orientação aplicável. Marque só com acordo ou convenção
                  coletiva registrada (informe o número do Mediador acima) que
                  preveja a compensação. Isso não afasta o período mínimo de
                  descanso exigido.
                </small>
              </div>

              <div>
                <label>
                  Adicional de espera previsto em CCT (informativo, não entra no
                  cálculo)
                <ParametroInativo campo="percentualHoraEspera" /></label>
                <input
                  name="percentualHoraEspera"
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
                  Trabalho noturno: referência legal das 22h às 5h, com
                  adicional mínimo de 20% e aplicação da hora noturna reduzida
                  (52min30s), observadas as regras legais e coletivas
                  aplicáveis. Período, percentual ou critério diferente exige
                  identificação do fundamento jurídico e validação do
                  instrumento (documento e declaração abaixo); a configuração
                  não pode afastar direitos legalmente assegurados.
                </p>
              </div>
              <div>
                <label>Início da janela noturna</label>
                <DuracaoInput
                  name="janelaNoturnaInicioMin"
                  valorMin={form.janelaNoturnaInicioMin ?? 1320}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      janelaNoturnaInicioMin: v ?? 1320,
                    }))
                  }
                />
              </div>
              <div>
                <label>Fim da janela noturna</label>
                <DuracaoInput
                  name="janelaNoturnaFimMin"
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
                    name="prorrogacaoNoturna"
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
                <label>Vigência da convenção, início<ParametroInativo campo="cctVigenciaInicio" /></label>
                <input
                  name="cctVigenciaInicio"
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
                <label>Vigência da convenção, fim<ParametroInativo campo="cctVigenciaFim" /></label>
                <input
                  name="cctVigenciaFim"
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
                <label>
                  Referência do documento (registro no MTE, cláusula)
                <ParametroInativo campo="cctDocumentoRef" /></label>
                <input
                  name="cctDocumentoRef"
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
                    name="declaracaoRespaldoCct"
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
                  <ParametroInativo campo="declaracaoRespaldoCct" />
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
                <label>Unidade do banco de horas</label>
                <select
                  name="bancoGuarda"
                  value={form.bancoGuarda ?? "fictos"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bancoGuarda: e.target.value as "fictos" | "reais",
                    }))
                  }
                >
                  <option value="fictos">
                    Horas fictas (hora noturna reduzida)
                  </option>
                  <option value="reais">Horas reais (relógio)</option>
                </select>
                <small>
                  Padrão: horas fictas, as mesmas pagas no holerite. Em "reais"
                  o banco credita só o tempo de relógio. Sujeito a parecer
                  jurídico.
                </small>
              </div>
              <div>
                <label>Tratamento do trabalho em feriado<ParametroInativo campo="feriadoTratamento" /></label>
                <select
                  name="feriadoTratamento"
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
                  <option value="LANCAR_NO_BANCO">
                    Lançar no banco de horas
                  </option>
                  <option value="EXIGIR_FOLGA_COMPENSATORIA">
                    Exigir folga compensatória
                  </option>
                </select>
              </div>
              <p style={{ fontSize: 13, margin: "4px 0 0" }}>
                Os feriados pagos são os cadastrados na tela Feriados (para o grupo todo ou só para um CNPJ). O
                sistema não consulta calendário de cidade: vale o que a empresa cadastrar.
              </p>
              <div>
                <label>
                  Folga em domingo a cada quantas semanas (opcional; gera aviso quando nenhum domingo ficou livre)
                <ParametroInativo campo="folgaDomingoACadaSemanas" /></label>
                <input
                  name="folgaDomingoACadaSemanas"
                  type="number"
                  min={1}
                  value={form.folgaDomingoACadaSemanas ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      folgaDomingoACadaSemanas: e.target.value
                        ? Number(e.target.value)
                        : null,
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
                <label>Data do marco<ParametroInativo campo="marcoAdi5322Data" /></label>
                <input
                  name="marcoAdi5322Data"
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
                <label>Referência da decisão (ata, publicação)<ParametroInativo campo="marcoAdi5322Referencia" /></label>
                <input
                  name="marcoAdi5322Referencia"
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

            {tentouSalvar && (
              <style>
                {`form input:invalid, form textarea:invalid, form select:invalid {border:2px solid #d32f2f !important;background:#fdecea !important;}`}
              </style>
            )}
            {camposComErro.length > 0 && (
              <style>
                {camposComErro
                  .filter((c) => /^[A-Za-z0-9_]+$/.test(c))
                  .map(
                    (c) =>
                      `[name="${c}"]{border:2px solid #d32f2f !important;background:#fdecea !important;}`,
                  )
                  .join("\n")}
              </style>
            )}
            {editandoId && (
              <div style={{ marginTop: 12 }}>
                <label>
                  Data de início de vigência desta alteração
                  <input
                    type="date"
                    value={vigenciaEdicao}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setVigenciaEdicao(e.target.value)}
                  />
                </label>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0" }}>
                  Em branco = vale a partir de hoje. Data passada é retroativa e pede confirmação;
                  períodos já fechados não mudam (diferença vai como ajuste complementar na folha).
                  Data futura ainda não é suportada.
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => setVersoes(await listarVersoesRegraSindical(editandoId))}
                >
                  Ver histórico de versões
                </button>
                {versoes && (
                  <table style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>Versão</th>
                        <th>Vigência desde</th>
                        <th>Registrada em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versoes.map((v) => (
                        <tr key={v.id}>
                          <td>{v.versao}</td>
                          <td>{dataCurta(v.vigenciaInicio)}</td>
                          <td>{new Date(v.createdAt).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
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
                  <td>
                    {r.ativo ? "Ativa" : "Desativada"}
                    {(() => {
                      const aviso = avisoVigenciaCct(r.cctVigenciaFim);
                      return aviso ? (
                        <div
                          role="alert"
                          style={{
                            fontSize: 12,
                            marginTop: 4,
                            color: aviso.nivel === "VENCIDA" ? "#b91c1c" : "#b45309",
                          }}
                        >
                          {aviso.texto}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {(r.empresas ?? []).map((e) => e.razaoSocial).join(", ") ||
                      "--"}
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
                  <td colSpan={8} style={{ color: "#000000" }}>
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
                Direção contínua: aviso a partir de 5 horas; alerta crítico em
                5 horas e 30 minutos. Referência legal para transporte
                rodoviário de cargas. A pausa de 30 minutos dentro de cada 6
                horas de condução pode ser fracionada.
              </li>
              <li>
                Jornada diária de trabalho: referência normal de 8 horas. A
                prorrogação pode alcançar até 2 horas extraordinárias, podendo
                chegar a 4 horas mediante previsão em convenção ou acordo
                coletivo. O sistema considera o tempo de trabalho computável, e
                não apenas o tempo de direção. Sem regra coletiva específica
                cadastrada, o padrão de referência considera 10 horas diárias
                de trabalho, respeitadas as demais condições legais.
              </li>
              <li>
                Tempo de espera: avisos informativos e operacionais a partir
                dos limites cadastrados pela empresa. Após o julgamento da ADI
                5322, o tempo de espera integra a jornada de trabalho e deve
                permanecer registrado em sua categoria própria. A referência de
                5 horas corresponde ao prazo legal relacionado à carga e
                descarga no transporte rodoviário de cargas, utilizado para
                identificar eventual cobrança contra o contratante do frete.
                Não representa limite máximo de espera do empregado.
              </li>
              <li>
                Descanso entre jornadas: mínimo de 11 horas consecutivas.
                Quando o período realizado for inferior, o tempo suprimido será
                registrado em evento próprio, separado das horas efetivamente
                trabalhadas e do banco de horas. O tratamento financeiro deverá
                observar a legislação e a orientação aplicável ao caso. Se o motorista
                encerrou por engano e reabriu, o RH trata o alerta e registra
                que foi a mesma jornada (a decisão fica na trilha de auditoria).
              </li>
            </ul>
            <p style={{ margin: "4px 0" }}>
              <strong>
                Só vale quando NÃO há regra sindical vinculada ao CNPJ
              </strong>{" "}
              (vincular uma regra substitui os valores abaixo pelos que você
              cadastrar nela):
            </p>
            <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>
              <li>
                Jornada normal do motorista profissional: 8 horas diárias,
                conforme a legislação específica da categoria. A prorrogação
                deve respeitar os limites legais e as condições previstas no
                instrumento coletivo aplicável.
              </li>
              <li>
                Hora extraordinária: adicional mínimo legal de 50%, podendo a
                convenção ou o acordo coletivo estabelecer percentual superior.
                O sistema registra os minutos e não calcula o valor monetário.
              </li>
              <li>
                Trabalho noturno: referência legal das 22h às 5h, com adicional
                mínimo de 20% e aplicação da hora noturna reduzida, observadas
                as regras legais e coletivas aplicáveis.
              </li>
              <li>
                Domingo e feriado: sem regra coletiva vinculada, o sistema
                utiliza como referência a legislação geral. O trabalho em
                domingo ou feriado sem compensação válida poderá gerar
                tratamento em dobro. A apuração depende da escala, da
                existência de folga compensatória e das condições do
                instrumento coletivo.
              </li>
            </ul>
            <p style={{ margin: "4px 0", fontSize: 12, fontStyle: "italic" }}>
              Nota: o percentual de 70% para a segunda faixa de horas
              extraordinárias é um parâmetro padrão do sistema, e não um
              percentual legal obrigatório. A convenção ou o acordo coletivo
              pode prever percentuais diferentes. O sistema apenas classifica
              os minutos conforme a parametrização cadastrada. Os demais valores acima refletem a legislação
              geral (CLT/Lei 13.103), mas nenhuma configuração deste sistema
              substitui a orientação de um advogado trabalhista para o seu caso
              específico.
            </p>
          </div>
        </details>
        <label>
          Vale a partir de (vazio = hoje). Cada jornada usa a regra vigente no
          dia em que começou; períodos anteriores mantêm a regra da época.
        </label>
        <input
          type="date"
          value={vigenciaVinculo}
          onChange={(e) => setVigenciaVinculo(e.target.value)}
          style={{ maxWidth: 200, marginBottom: 8 }}
        />
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
                  </select>{" "}
                  <button type="button" onClick={() => alternarHistorico(emp.id)}>
                    {historico[emp.id] ? "Ocultar histórico" : "Histórico"}
                  </button>
                  {historico[emp.id] && (
                    <ul style={{ fontSize: 13, margin: "6px 0 0" }}>
                      {historico[emp.id]!.length === 0 && <li>Sem histórico registrado.</li>}
                      {historico[emp.id]!.map((h) => (
                        <li key={h.id}>
                          a partir de {h.vigenciaInicio.split("-").reverse().join("/")}:{" "}
                          {h.regraSindicalId ? (h.nome ?? "regra removida") : "Padrão legal (sem regra)"}
                          {h.motivo ? ` (${h.motivo})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
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

      </>
      )}

      {aba === "feriados" && (
      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Como funcionam os feriados</h3>
          <p
            style={{
              fontSize: 13,
              color: "#000",
              lineHeight: 1.6,
              margin: "4px 0",
            }}
          >
            O sistema reconhece o domingo sozinho, mas não conhece os feriados,
            porque eles mudam de cidade para cidade. Por isso, cada feriado que
            a empresa aceita precisa ser cadastrado abaixo, com data e
            descrição.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#000",
              lineHeight: 1.6,
              margin: "4px 0",
            }}
          >
            Ao cadastrar, escolha se o feriado é "pago como domingo/feriado" (as
            horas trabalhadas nesse dia recebem o percentual diferenciado da
            convenção coletiva escolhida acima) ou apenas informativo. Se deixar
            o CNPJ em branco, o feriado vale para todos os CNPJs do grupo.
          </p>
        </div>
        <FeriadosPage />
      </div>
      )}

      {aba === "apuracao" && <ConfiguracaoApuracaoAba podeAlterar={usuario?.papel === "ADMIN"} />}
    </div>
  );
}
