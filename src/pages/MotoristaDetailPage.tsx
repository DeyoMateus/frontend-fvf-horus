import { abrirNoMapa } from "../utils/mapa";
import { mensagemDoErro } from "../utils/mensagemDoErro";
import { useFilaDePendencias } from "../components/penMenu";
import { Esqueleto } from "../components/Esqueleto";
import { inicioDoDiaLocalIso, fimDoDiaLocalIso } from "../utils/fusoHorario";
import { RelatorioHorasColaborador } from "../components/RelatorioHorasColaborador";
import { TratamentoPontoColaborador } from "../components/TratamentoPontoColaborador";
import { useAuth } from "../context/AuthContext";
import { dataCalendarioBr, dataLocalIso } from "../utils/mascaras";
import { formatarRegistro, renderizarHorarios, seloFusoMapa } from "../utils/fusoHorario";
import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { usePrompt } from "../components/PromptProvider";
import {
  atualizarCadastroMotorista,
  atualizarStatusMotorista,
  excluirMotorista,
  reativarMotorista,
  rescindirMotorista,
  readmitirMotorista,
  getMotorista,
  listarAlertasIntegridadeDispositivo,
} from "../api/motoristas";
import type { AlertaIntegridadeDispositivo } from "../api/motoristas";
import { revogarDispositivo, statusDispositivo, vincularDispositivo } from "../api/dispositivos";
import {
  atualizarVeiculo,
  listarTrocasVeiculo,
  conferirTrocasVeiculo,
  statusVeiculo,
} from "../api/veiculos";
import type { AtualizarVeiculoInput, TrocaVeiculoAuditoria, VeiculoVinculado } from "../api/veiculos";
import {
  aceitarDivergenciaIntegridade,
  baixarAej,
  baixarAejAssinado,
  AejExigeMotivoError,
  baixarDirecaoEsperaCsv,
  baixarPlanilhaJornada,
  baixarComprovante,
  baixarEspelhoRepP,
  listRegistros,
  listarViagens,
  verificarIntegridade,
} from "../api/registros";
import type { ViagemConsolidada } from "../api/registros";
import { rotuloStatusMotorista, rotuloSeveridade } from "../utils/rotulos";
import { listTratamentos } from "../api/tratamentos";
import { ListaEmPopup } from "../components/ListaEmPopup";
import { Paginador } from "../components/Paginador";
import { PaginacaoPopup } from "../components/PaginacaoPopup";
import { baixarCsvTabela, imprimirTabela } from "../utils/exportarTabelaModal";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { useListaPaginada } from "../hooks/useListaPaginada";
import {
  CamposDadosContrato,
  contratoDoMotorista,
  contratoParaPayload,
  CONTRATO_VAZIO,
} from "../components/CamposDadosContrato";
import type { ValoresContrato } from "../components/CamposDadosContrato";
import { atualizarContratoMotorista } from "../api/dadosContrato";
import { TelefoneInput } from "../components/TelefoneInput";
import { TrilhaMotorista } from "../components/TrilhaMotorista";
import { RescisaoPopup } from "../components/RescisaoPopup";
import { AbasTopo, useAbaAtiva, type AbaDef } from "../components/AbasTopo";
import { listAlertasByMotorista } from "../api/alertas";
import {
  BarraTratamentoEmLote,
  FiltrosTratamento,
  FormularioTratamentoAlerta,
  alertaPodeTratarEmLote,
  aplicarFiltroTratamento,
} from "../components/TratamentoAlertas";
import type { FiltroTratamento } from "../components/TratamentoAlertas";
import { listarAutorrelatosFolga } from "../api/autorrelatoFolga";
import type { AutorrelatoFolga } from "../api/autorrelatoFolga";
import {
  concederFolga,
  listarFolgasConcedidas,
  retirarFolgaConcedida,
  ROTULO_STATUS_FOLGA,
} from "../api/folgaConcedida";
import { useConfirm } from "../components/ConfirmProvider";
import { useToast } from "../components/ToastProvider";
import { FolgasLista } from "../components/FolgasLista";
import { Espera235c11Card } from "../components/Espera235c11Card";
import { listEmpresas } from "../api/empresas";
import type { Empresa } from "../api/types";
import type { FolgaConcedida } from "../api/folgaConcedida";
import { listarDocumentosCargaPorMotorista, statusAtualCargaPorMotorista } from "../api/documentosCarga";
import type { DocumentoCarga, StatusAtualCarga } from "../api/documentosCarga";
import type {
  AlertaJornada,
  DispositivoStatus,
  Motorista,
  RegistroJornada,
  StatusMotorista,
  TratamentoPonto,
  VerificacaoIntegridade,
} from "../api/types";
import { ROTULO_FUNCAO, ROTULO_MOTIVO_PARADA } from "../api/types";
import { CampoTextoExpansivel } from "../components/CampoTextoExpansivel";

function gerarUuid() {
  return crypto.randomUUID();
}

// Pedido do usuário: o gestor tentou corrigir um evento
// problemático pelo campo "Registro de referência", mas esse campo
// nunca preenchia "Horário considerado" , o gestor acabou deixando o
// horário atual (agora) ali, achando que estava corrigindo o registro
// original. Isso NUNCA funciona: TratamentoPonto é aditivo (nunca
// substitui o RegistroJornada original, que é WORM/imutável) , um
// ajuste datado de "agora" só entra no fim da linha do tempo, não
// conserta nada no meio dela. Pré-preencher com o horário do registro
// escolhido dá um ponto de partida correto (o gestor ainda pode
// ajustar minutos pra frente/trás, mas não parte mais de "agora").
type JornadaDoCiclo = {
  inicio: string;
  fim: string;
  emAndamento: boolean;
  totalDirecaoMin: number;
  totalEsperaMin: number;
  totalJornadaMin: number;
};

/**
 * A ficha do motorista em abas no topo (linha do sino). Banco de horas, tratamento
 * de ponto, relatório de horas apuradas e fechamentos de período saíram daqui e ficam só no
 * Fechamento, com seletor de motorista.
 */
const ABAS_MOTORISTA: AbaDef[] = [
  { id: "cadastro", rotulo: "Cadastro" },
  { id: "registros", rotulo: "Registros" },
  { id: "folgas", rotulo: "Folgas" },
  { id: "espera", rotulo: "Espera (§11)" },
  { id: "alertas", rotulo: "Alertas" },
  { id: "trilha", rotulo: "Trilha" },
];

/**
 * `somente`: o Fechamento reaproveita esta tela para mostrar só o tratamento de
 * ponto ou só o relatório de horas apuradas de um motorista escolhido lá.
 */
export function MotoristaDetailPage({
  motoristaId: motoristaIdProp,
  somente,
}: {
  motoristaId?: string;
  somente?: "tratamento" | "relatorio";
} = {}) {
  const { usuario } = useAuth();
  // Usuários do painel (ADMIN e GESTOR) veem localização; o backend audita cada consulta.
  const veLocalizacao =
    usuario?.papel === "ADMIN" || usuario?.papel === "GESTOR";
  const parametrosRota = useParams();
  const motoristaId = motoristaIdProp ?? parametrosRota.motoristaId ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Vindo de um alerta (?secao=alertas-jornada), abre direto a aba Alertas.
  // A ficha abre no que pede atenção. Com alerta pendente deste colaborador, em
  // Alertas; sem alerta, em Registros (o ponto). Cadastro deixa de ser a primeira tela.
  const filaDePendencias = useFilaDePendencias();
  const abaInicial = filaDePendencias.some(
    (i) => i.tipo === "alerta" && i.motoristaId === motoristaId,
  )
    ? "alertas"
    : "registros";
  const abaAtiva = useAbaAtiva(
    ABAS_MOTORISTA,
    searchParams.get("secao") === "alertas-jornada" ? "alertas" : undefined,
    abaInicial,
  );
  const mostrar = (aba: string) => !somente && abaAtiva === aba;
  // Pedido do usuário: vindo de um alerta (sininho, painel de alertas,
  // card "em risco agora" etc.), o clique no nome do motorista deve
  // cair direto na seção de alertas dele, já pronta pra marcar como
  // visto , não no topo genérico da página. O link de origem manda
  // `?secao=alertas-jornada`, aqui só rola a tela até lá quando chegar.
  const secaoAlertasJornadaRef = useRef<HTMLDivElement | null>(null);
  const prompt = usePrompt();

  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [registros, setRegistros] = useState<RegistroJornada[]>([]);
  const [dispositivo, setDispositivo] = useState<DispositivoStatus | null>(
    null,
  );
  const [tratamentos, setTratamentos] = useState<TratamentoPonto[]>([]);
  const [alertas, setAlertas] = useState<AlertaJornada[]>([]);
  // Tratamento de alertas pela ficha do motorista (mesmos
  // alertas do painel geral, então tratar aqui dá baixa lá).
  const [filtroTratamentoAlertas, setFiltroTratamentoAlertas] =
    useState<FiltroTratamento>("TODOS");
  const [alertaExpandidoId, setAlertaExpandidoId] = useState<string | null>(
    null,
  );
  const [alertasSelecionados, setAlertasSelecionados] = useState<string[]>([]);
  const [avisoAlertas, setAvisoAlertas] = useState<string | null>(null);
  const [erroAlertas, setErroAlertas] = useState<string | null>(null);
  // Pedido do usuário: mesmo padrão da Rodada 77
  // (tratamentos de ponto) aplicado aqui , essa lista também não pode
  // crescer sem limite na tela. "Mostrar N por vez" (10/20/50/100) +
  // popup dedicado de paginação quando passar disso.
  const [qtdAlertasPorPagina, setQtdAlertasPorPagina] = useState<
    10 | 20 | 50 | 100
  >(10);
  const [paginaAlertas, setPaginaAlertas] = useState(1);
  const [popupPaginacaoAlertasAberto, setPopupPaginacaoAlertasAberto] =
    useState(false);
  // Popup com as jornadas que compõem o acumulado do ciclo.
  const [cicloAberto, setCicloAberto] = useState<{
    membros: JornadaDoCiclo[];
    destaqueInicio: string;
  } | null>(null);
  const [integridade, setIntegridade] = useState<VerificacaoIntegridade | null>(
    null,
  );
  const [aceitandoDivergencia, setAceitandoDivergencia] = useState<
    number | null
  >(null);
  const [alertasIntegridadeDispositivo, setAlertasIntegridadeDispositivo] =
    useState<AlertaIntegridadeDispositivo[]>([]);
  const [viagens, setViagens] = useState<ViagemConsolidada[]>([]);
  const [folgas, setFolgas] = useState<AutorrelatoFolga[]>([]);
  const [folgasConcedidas, setFolgasConcedidas] = useState<FolgaConcedida[]>(
    [],
  );
  const confirmarAcao = useConfirm();
  const toast = useToast();
  const [statusCarga, setStatusCarga] = useState<StatusAtualCarga | null>(null);
  const [documentosCarga, setDocumentosCarga] = useState<DocumentoCarga[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (carregando) return;
    if (searchParams.get("secao") !== "alertas-jornada") return;
    secaoAlertasJornadaRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [carregando, searchParams]);

  const [baixandoComprovante, setBaixandoComprovante] = useState(false);
  const [baixandoAej, setBaixandoAej] = useState(false);
  const [baixandoAejAssinado, setBaixandoAejAssinado] = useState(false);
  const [avisoAejAssinado, setAvisoAejAssinado] = useState<string | null>(null);
  const [baixandoDirecaoEspera, setBaixandoDirecaoEspera] = useState(false);
  const [baixandoPlanilha, setBaixandoPlanilha] = useState(false);
  const [baixandoEspelhoRepP, setBaixandoEspelhoRepP] = useState(false);
  const [novaDeviceUuid, setNovaDeviceUuid] = useState("");
  const [deviceApiKeyGerada, setDeviceApiKeyGerada] = useState<string | null>(
    null,
  );
  const [vinculando, setVinculando] = useState(false);

  const [veiculo, setVeiculo] = useState<
    VeiculoVinculado | { vinculado: false } | null
  >(null);
  const [trocasVeiculo, setTrocasVeiculo] = useState<TrocaVeiculoAuditoria[]>(
    [],
  );
  // A conferência fica no servidor (vale para todos os gestores);
  // troca nova volta a aparecer.
  const onMarcarTrocasConferidas = () => {
    void conferirTrocasVeiculo(motoristaId)
      .then(() => listarTrocasVeiculo(motoristaId))
      .then(setTrocasVeiculo)
      .catch(() => undefined);
  };
  const trocasPendentes = trocasVeiculo.filter((t) => !t.conferida);
  const [placaForm, setPlacaForm] = useState("");
  const [idRastreadorForm, setIdRastreadorForm] = useState("");
  const [tecnologiaForm, setTecnologiaForm] = useState("");
  const [atualizandoVeiculo, setAtualizandoVeiculo] = useState(false);
  const [erroVeiculo, setErroVeiculo] = useState<string | null>(null);


  const [dataFolga, setDataFolga] = useState("");
  const [motivoFolga, setMotivoFolga] = useState("");
  const [folgaCompensaFeriado, setFolgaCompensaFeriado] = useState(false);
  const [justificativaExcessoFolga, setJustificativaExcessoFolga] = useState("");
  const [pedeJustificativaFolga, setPedeJustificativaFolga] = useState(false);
  const [concedendoFolga, setConcedendoFolga] = useState(false);
  const [erroFolga, setErroFolga] = useState<string | null>(null);

  const [qtdJornadasPorPagina, setQtdJornadasPorPagina] = useState(7);
  const [qtdJornadasExibidas, setQtdJornadasExibidas] = useState(7);

  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [rescisaoAberta, setRescisaoAberta] = useState(false);
  const [readmissaoAberta, setReadmissaoAberta] = useState(false);
  const [erroRescisao, setErroRescisao] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<"id" | "key" | null>(null);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  const [editandoCadastro, setEditandoCadastro] = useState(false);
  const [contratoEdit, setContratoEdit] =
    useState<ValoresContrato>(CONTRATO_VAZIO);
  const [nomeEdit, setNomeEdit] = useState("");
  const [telefoneEdit, setTelefoneEdit] = useState("");
  // CNPJ ao qual o motorista esta vinculado (editavel).
  const [empresasGrupo, setEmpresasGrupo] = useState<Empresa[]>([]);
  const [empresaEdit, setEmpresaEdit] = useState("");
  useEffect(() => {
    listEmpresas()
      .then(setEmpresasGrupo)
      .catch(() => undefined);
  }, []);
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);


  async function onBaixarComprovante() {
    setBaixandoComprovante(true);
    try {
      await baixarComprovante(motoristaId, periodoDosRegistros());
    } finally {
      setBaixandoComprovante(false);
    }
  }

  async function onBaixarPlanilha() {
    setBaixandoPlanilha(true);
    try {
      await baixarPlanilhaJornada(motoristaId, periodoDosRegistros());
    } finally {
      setBaixandoPlanilha(false);
    }
  }

  /** Pede o motivo quando o periodo ja tem AEJ e o conteudo mudou (gera o retificador). */
  async function pedirMotivoRetificacao(mensagem: string): Promise<string | null> {
    return prompt(mensagem, {
      titulo: "AEJ retificador",
      placeholder: "Motivo da retificação (mínimo de 10 caracteres)",
      multilinha: true,
      textoConfirmar: "Gerar retificador",
      validar: (v) => (v.trim().length < 10 ? "Informe o motivo (mínimo de 10 caracteres)." : null),
    });
  }

  async function onBaixarAej() {
    setBaixandoAej(true);
    try {
      let avisos: string[];
      try {
        avisos = await baixarAej(motoristaId, periodoDosRegistros());
      } catch (ex) {
        if (!(ex instanceof AejExigeMotivoError)) throw ex;
        const motivo = await pedirMotivoRetificacao(ex.message);
        if (!motivo) return;
        avisos = await baixarAej(motoristaId, { ...periodoDosRegistros(), motivoRetificacao: motivo });
      }
      setAvisoAejAssinado(avisos.length > 0 ? avisos.join(" ") : null);
    } finally {
      setBaixandoAej(false);
    }
  }

  async function onBaixarAejAssinado() {
    setBaixandoAejAssinado(true);
    setAvisoAejAssinado(null);
    try {
      try {
        setAvisoAejAssinado(await baixarAejAssinado(motoristaId, periodoDosRegistros()));
      } catch (ex) {
        const exige = (ex as { response?: { status?: number; data?: { codigo?: string; message?: string } } })?.response;
        if (exige?.status !== 409 || exige.data?.codigo !== "AEJ_RETIFICACAO_EXIGE_MOTIVO") throw ex;
        const motivo = await pedirMotivoRetificacao(exige.data.message ?? "O conteúdo mudou desde o último AEJ deste período.");
        if (!motivo) return;
        setAvisoAejAssinado(await baixarAejAssinado(motoristaId, { ...periodoDosRegistros(), motivoRetificacao: motivo }));
      }
    } catch (ex) {
      setAvisoAejAssinado(mensagemDoErro(ex, "Não foi possível gerar o AEJ assinado."));
    } finally {
      setBaixandoAejAssinado(false);
    }
  }

  async function onBaixarDirecaoEspera() {
    setBaixandoDirecaoEspera(true);
    try {
      await baixarDirecaoEsperaCsv(motoristaId, periodoDosRegistros());
    } finally {
      setBaixandoDirecaoEspera(false);
    }
  }

  async function onBaixarEspelhoRepP() {
    setBaixandoEspelhoRepP(true);
    try {
      await baixarEspelhoRepP(motoristaId, periodoDosRegistros());
    } finally {
      setBaixandoEspelhoRepP(false);
    }
  }

  function formatarMinutos(min: number) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }

  // Uma linha por dia (não por viagem) , o pedido é ver cada jornada
  // diária separada, com carregamento incremental (padrão: 7 dias mais
  // recentes) em vez do acumulado por viagem. O agrupamento em viagem
  // em si não é mais por gap de tempo , é pelo(s) CT-e que
  // o motorista carrega; cada linha carrega os CT-e da viagem a que
  // pertence, pra mostrar por que ela foi agrupada com as outras.
  const jornadasDiariasOrdenadas = viagens
    .flatMap((v, viagemIndice) =>
      v.jornadas.map((j, idx) => ({
        ...j,
        viagemIndice,
        diaDaViagem: idx + 1,
        totalDiasViagem: v.jornadas.length,
        ctesRelacionados: v.ctesRelacionados,
      })),
    )
    .sort(
      (a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime(),
    );

  // Pedido do usuário: cada linha aqui é uma JORNADA (um
  // par início/fim de jornada), não um "dia" , e é perfeitamente
  // normal (e legalmente relevante) o motorista abrir e fechar jornada
  // mais de uma vez na mesma data-calendário. Antes disso ficava
  // implícito e cada linha parecia um dia duplicado/errado. Agora cada
  // linha da mesma data-calendário recebe um rótulo "1ª/2ª jornada do
  // dia" pra deixar claro que são jornadas DISTINTAS, de propósito, e
  // não um bug de duplicação.
  const ORDINAIS_PT = [
    "1ª",
    "2ª",
    "3ª",
    "4ª",
    "5ª",
    "6ª",
    "7ª",
    "8ª",
    "9ª",
    "10ª",
  ];
  const jornadasPorDataCalendario = new Map<
    string,
    typeof jornadasDiariasOrdenadas
  >();
  for (const j of jornadasDiariasOrdenadas) {
    const dataCalendario = new Date(j.inicio).toLocaleDateString("pt-BR");
    const grupo = jornadasPorDataCalendario.get(dataCalendario) ?? [];
    grupo.push(j);
    jornadasPorDataCalendario.set(dataCalendario, grupo);
  }
  function rotuloJornadaDoDia(
    j: (typeof jornadasDiariasOrdenadas)[number],
  ): string | null {
    const dataCalendario = new Date(j.inicio).toLocaleDateString("pt-BR");
    const grupo = jornadasPorDataCalendario.get(dataCalendario)!;
    if (grupo.length <= 1) return null;
    // grupo já está na mesma ordem (mais recente primeiro) de
    // jornadasDiariasOrdenadas; a "1ª jornada do dia" é a mais antiga.
    const indiceCronologico = grupo.length - 1 - grupo.indexOf(j);
    const ordinal =
      ORDINAIS_PT[indiceCronologico] ?? `${indiceCronologico + 1}ª`;
    return `${ordinal} jornada do dia, de ${grupo.length}`;
  }

  // Ciclo legal = jornadas encadeadas (menos de 11h entre o fim
  // de uma e o início da seguinte). A soma da direção do ciclo é o que
  // dispara os alertas de 8h/10h, então o gestor precisa vê-la.
  const cicloPorJornada = new Map<
    (typeof jornadasDiariasOrdenadas)[number],
    { totalDirecaoMin: number; qtd: number; membros: JornadaDoCiclo[] }
  >();
  {
    const cronologicas = [...jornadasDiariasOrdenadas].reverse();
    let grupoAtual: typeof cronologicas = [];
    const fecharGrupo = () => {
      if (grupoAtual.length === 0) return;
      const info = {
        totalDirecaoMin: grupoAtual.reduce(
          (soma, x) => soma + x.totalDirecaoMin,
          0,
        ),
        qtd: grupoAtual.length,
        membros: grupoAtual,
      };
      for (const x of grupoAtual) cicloPorJornada.set(x, info);
      grupoAtual = [];
    };
    for (const j of cronologicas) {
      // Jornada vazia (aberta e fechada sem direção/espera, até
      // 5 min) não entra no ciclo nem conta como intervalo de descanso.
      if (
        !j.emAndamento &&
        j.totalDirecaoMin === 0 &&
        j.totalEsperaMin === 0 &&
        j.totalJornadaMin <= 5
      )
        continue;
      const anterior = grupoAtual[grupoAtual.length - 1];
      const encadeada =
        anterior &&
        !anterior.emAndamento &&
        new Date(j.inicio).getTime() - new Date(anterior.fim).getTime() <
          11 * 3_600_000;
      if (!encadeada) fecharGrupo();
      grupoAtual.push(j);
    }
    fecharGrupo();
  }

  const jornadasDiariasExibidas = jornadasDiariasOrdenadas.slice(
    0,
    qtdJornadasExibidas,
  );

  // Pedido do usuário: salvar algo nesta tela (lançar um
  // tratamento, anexar evidência, editar cadastro, trocar veículo,
  // vincular/revogar dispositivo etc.) não pode "piscar" a página
  // inteira pro topo. Antes, TODA chamada de `carregarTudo()`
  // (inclusive as de depois de salvar) ligava `carregando`, e o
  // retorno antecipado no fim do componente (`if (carregando ||
  // !motorista) return <Esqueleto />`) desmontava a tela
  // inteira enquanto refazia a busca , o navegador reseta a rolagem
  // pro topo quando o conteúdo desaparece assim. Agora só a carga
  // INICIAL (mount, com `comCarregamentoTelaCheia = true`) passa por
  // essa tela cheia; toda atualização depois de salvar só troca os
  // dados no lugar, sem desmontar nada.
  async function carregarTudo(comCarregamentoTelaCheia = false) {
    if (comCarregamentoTelaCheia) setCarregando(true);
    const [
      m,
      regs,
      disp,
      trats,
      alrs,
      alrsIntegridade,
      viags,
      flgs,
      folgasConc,
      statusCargaAtual,
      docsCarga,
      veic,
      trocasVeic,
    ] = await Promise.all([
      getMotorista(motoristaId),
      listRegistros(motoristaId),
      statusDispositivo(motoristaId),
      listTratamentos(motoristaId),
      listAlertasByMotorista(motoristaId),
      listarAlertasIntegridadeDispositivo(motoristaId),
      listarViagens(motoristaId),
      listarAutorrelatosFolga(motoristaId),
      listarFolgasConcedidas(motoristaId),
      statusAtualCargaPorMotorista(motoristaId),
      listarDocumentosCargaPorMotorista(motoristaId),
      statusVeiculo(motoristaId),
      listarTrocasVeiculo(motoristaId),
    ]);
    setMotorista(m);
    setNomeEdit((atual) => (editandoCadastro ? atual : m.nome));
    setTelefoneEdit((atual) => (editandoCadastro ? atual : (m.telefone ?? "")));
    setRegistros(regs);
    setDispositivo(disp);
    setTratamentos(trats);
    setAlertas(alrs);
    setAlertasIntegridadeDispositivo(alrsIntegridade);
    setViagens(viags);
    setFolgas(flgs);
    setFolgasConcedidas(folgasConc);
    setStatusCarga(statusCargaAtual);
    setDocumentosCarga(docsCarga);
    setVeiculo(veic);
    setTrocasVeiculo(trocasVeic);
    if ("placa" in veic) {
      setPlacaForm((atual) => atual || veic.placa);
      setIdRastreadorForm((atual) => atual || veic.idRastreador || "");
      setTecnologiaForm((atual) => atual || veic.tecnologiaRastreador || "");
    }
    setCarregando(false);
  }

  async function recarregarAlertas(aviso?: string) {
    setAlertaExpandidoId(null);
    setAvisoAlertas(aviso ?? null);
    setErroAlertas(null);
    try {
      const dados = await listAlertasByMotorista(motoristaId);
      setAlertas(dados);
      setAlertasSelecionados((atual) =>
        atual.filter((id) =>
          dados.some((a) => a.id === id && alertaPodeTratarEmLote(a)),
        ),
      );
    } catch {
      setErroAlertas("Não foi possível recarregar os alertas.");
    }
  }

  useEffect(() => {
    carregarTudo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoristaId]);

  async function onVincular(e: FormEvent) {
    e.preventDefault();
    if (!import.meta.env.DEV && !novaDeviceUuid.trim()) return;
    setVinculando(true);
    try {
      const resp = await vincularDispositivo(
        motoristaId,
        // UUID em branco gera um aparelho de teste só em desenvolvimento.
        novaDeviceUuid.trim() || (import.meta.env.DEV ? gerarUuid() : ""),
      );
      setDeviceApiKeyGerada(resp.deviceApiKey);
      setNovaDeviceUuid("");
      await carregarTudo();
    } finally {
      setVinculando(false);
    }
  }

  async function onRevogar() {
    await revogarDispositivo(motoristaId);
    setDeviceApiKeyGerada(null);
    await carregarTudo();
  }

  async function onAtualizarVeiculo(e: FormEvent) {
    e.preventDefault();
    setErroVeiculo(null);
    setAtualizandoVeiculo(true);
    try {
      await atualizarVeiculo(motoristaId, {
        placa: placaForm,
        idRastreador: idRastreadorForm.trim() || undefined,
        tecnologiaRastreador: (tecnologiaForm ||
          undefined) as AtualizarVeiculoInput["tecnologiaRastreador"],
      });
      await carregarTudo();
    } catch (erro) {
      const msg =
        erro instanceof AxiosError
          ? (erro.response?.data as { message?: string | string[] })?.message
          : undefined;
      setErroVeiculo(
        Array.isArray(msg)
          ? msg.join(" ")
          : (msg ?? "Não foi possível salvar (placa em formato inválido)."),
      );
    } finally {
      setAtualizandoVeiculo(false);
    }
  }

  async function onVerificarIntegridade() {
    setIntegridade(await verificarIntegridade(motoristaId));
  }

  async function onAceitarDivergencia(sequencial: number) {
    const motivo = await prompt(
      `Confirma a regularização do evento nº ${sequencial}? Isto não apaga nem altera o evento , só documenta que esta divergência já foi revisada e aceita, com o motivo abaixo.`,
      {
        titulo: "Aceitar/regularizar divergência",
        placeholder: "Motivo (obrigatório)",
        multilinha: true,
        textoConfirmar: "Aceitar",
        validar: (v) => (!v.trim() ? "Informe o motivo." : null),
      },
    );
    if (motivo === null) return;
    setAceitandoDivergencia(sequencial);
    try {
      const resposta = await aceitarDivergenciaIntegridade(
        motoristaId,
        sequencial,
        motivo.trim(),
      );
      if (resposta?.pendente) toast.info(resposta.mensagem);
      setIntegridade(await verificarIntegridade(motoristaId));
    } finally {
      setAceitandoDivergencia(null);
    }
  }

  // Integridade: a lista de divergências não pode crescer sem
  // limite na tela. Por padrão só as PENDENTES; filtro de status e de período
  // (De/Até pelo horário do evento), "mostrar N por vez" (100 abre popup) e
  // exportação do que está filtrado.
  const [filtroStatusDivergencia, setFiltroStatusDivergencia] = useState<
    "PENDENTES" | "REGULARIZADAS" | "TODAS"
  >("PENDENTES");
  const divergenciasPorStatus = (integridade?.divergencias ?? []).filter((d) =>
    filtroStatusDivergencia === "TODAS"
      ? true
      : filtroStatusDivergencia === "PENDENTES"
        ? !d.aceita
        : d.aceita,
  );
  const listaDivergencias = useListaPaginada(
    divergenciasPorStatus,
    (d) => d.timestampEvento,
  );
  const CABECALHOS_RELATORIO_DIVERGENCIAS = [
    "Evento nº",
    "Tipo",
    "Horário do evento",
    "Lançado em",
    "Situação",
    "Regularizado por",
    "Regularizado em",
    "Motivo da regularização",
    "Explicação",
  ];
  function linhasRelatorioDivergencias(): string[][] {
    return listaDivergencias.itensFiltrados.map((d) => [
      String(d.sequencial),
      d.tipoEvento ?? "",
      d.timestampEvento
        ? new Date(d.timestampEvento).toLocaleString("pt-BR")
        : "",
      d.criadoEm ? new Date(d.criadoEm).toLocaleString("pt-BR") : "",
      d.aceita ? "Regularizada" : "Pendente",
      d.aceite?.aceitoPorNome ?? "",
      d.aceite ? new Date(d.aceite.aceitoEm).toLocaleString("pt-BR") : "",
      d.aceite?.motivo ?? "",
      d.explicacao,
    ]);
  }
  function rotuloPeriodoDivergencias() {
    const { dataInicio, dataFim } = listaDivergencias;
    const status =
      filtroStatusDivergencia === "PENDENTES"
        ? "pendentes"
        : filtroStatusDivergencia === "REGULARIZADAS"
          ? "regularizadas"
          : "todas";
    if (!dataInicio && !dataFim) return `${status}, qualquer período`;
    const f = (d: string) =>
      new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
    return `${status}, ${dataInicio ? f(dataInicio) : "início"} a ${dataFim ? f(dataFim) : "hoje"}`;
  }
  function onBaixarCsvDivergencias() {
    baixarCsvTabela(
      `integridade-divergencias-${motorista?.nome ?? motoristaId}.xlsx`.replace(
        /\s+/g,
        "-",
      ),
      CABECALHOS_RELATORIO_DIVERGENCIAS,
      linhasRelatorioDivergencias(),
      {
        titulo: `Integridade da cadeia: divergências - ${motorista?.nome ?? ""}`,
        subtitulo: `Filtro: ${rotuloPeriodoDivergencias()}`,
      },
    );
  }
  function onImprimirDivergencias() {
    imprimirTabela(
      `Integridade da cadeia: divergências - ${motorista?.nome ?? ""}`,
      `Filtro: ${rotuloPeriodoDivergencias()}`,
      CABECALHOS_RELATORIO_DIVERGENCIAS,
      linhasRelatorioDivergencias(),
    );
  }

  // Mais recentes primeiro (mesmo critério da Rodada 77),
  // fatiado pelo "mostrar N por vez".
  // Não tratados sempre primeiro, depois os mais recentes.
  const alertasOrdenados = [
    ...aplicarFiltroTratamento(alertas, filtroTratamentoAlertas),
  ].sort((a, b) => {
    const pa = a.tratadoEm ? 1 : 0;
    const pb = b.tratadoEm ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalPaginasAlertas = Math.max(
    1,
    Math.ceil(alertasOrdenados.length / qtdAlertasPorPagina),
  );
  const paginaAlertasEfetiva = Math.min(paginaAlertas, totalPaginasAlertas);
  const alertasExibidos = alertasOrdenados.slice(
    (paginaAlertasEfetiva - 1) * qtdAlertasPorPagina,
    paginaAlertasEfetiva * qtdAlertasPorPagina,
  );
  const idsSelecionaveisAlertas = alertasExibidos
    .filter(alertaPodeTratarEmLote)
    .map((a) => a.id);

  function onMudarQtdAlertasPorPagina(qtd: 10 | 20 | 50 | 100) {
    setQtdAlertasPorPagina(qtd);
    setPaginaAlertas(1);
  }

  // Pedido do usuário: a tabela "Registros de jornada" não pode
  // crescer sem limite. Filtro de período (De/Até), ordenação, "Mostrar
  // 20/50" e, ao escolher 100, a lista abre num popup separado. Os botões de
  // baixar seguem o mesmo período filtrado.
  const listaRegistros = useListaPaginada(registros, (r) => r.timestampEvento, {
    qtdInicial: 20,
    desempate: (a, b) => a.sequencial - b.sequencial,
  });
  /** Período filtrado em ISO (início do dia / fim do dia no fuso deste computador), ou undefined sem filtro. */
  function periodoDosRegistros() {
    const { dataInicio, dataFim } = listaRegistros;
    if (!dataInicio && !dataFim) return undefined;
    return {
      inicio: dataInicio
        ? inicioDoDiaLocalIso(dataInicio)
        : undefined,
      fim: dataFim
        ? fimDoDiaLocalIso(dataFim)
        : undefined,
    };
  }
  const rotuloPeriodoRegistros =
    listaRegistros.dataInicio || listaRegistros.dataFim
      ? `${listaRegistros.dataInicio ? new Date(`${listaRegistros.dataInicio}T00:00:00`).toLocaleDateString("pt-BR") : "início"} a ${listaRegistros.dataFim ? new Date(`${listaRegistros.dataFim}T00:00:00`).toLocaleDateString("pt-BR") : "hoje"}`
      : "todos os registros";

  function linhaRegistroJornada(r: RegistroJornada) {
    return (
      <tr key={r.id}>
        <td>{r.sequencial}</td>
        <td>
          {r.tipoEvento}
          {/* Motivo (e observação de "Outro") da parada; texto, nunca HTML. */}
          {r.motivoParada && (
            <div style={{ fontSize: 11 }}>
              {ROTULO_MOTIVO_PARADA[r.motivoParada]}
              {r.tipoEvento === "INICIO_PARADA" && r.observacao ? `: ${r.observacao}` : ""}
            </div>
          )}
        </td>
        <td>
          {formatarRegistro(r.timestampEvento, r.fusoOffsetMin)}
          {r.situacaoCalculo === "CORRIGIDO" && r.horaCorrigida && (
            <div style={{ fontSize: 11, color: "#92400e" }}>
              Divergência de relógio. Hora corrigida pelo gestor para{" "}
              {formatarRegistro(r.horaCorrigida, r.fusoOffsetMin)}
            </div>
          )}
          {r.situacaoCalculo === "FORA_DO_CALCULO" && (
            <div style={{ fontSize: 11, color: "#b91c1c" }}>
              Divergência de relógio. Fora dos cálculos até o gestor corrigir
            </div>
          )}
        </td>
        <td style={{ fontSize: 11 }}>{r.deviceUuidUsado}</td>
        <td>
          {r.latitude != null && r.longitude != null ? (
            <>
              <button
                type="button"
                className="botao-link-externo"
                title={`${r.latitude}, ${r.longitude}${r.precisaoGpsM != null ? ` (±${Math.round(Number(r.precisaoGpsM))}m)` : ""}${seloFusoMapa(r.timestampEvento, r.fusoOffsetMin)}`}
                onClick={() => abrirNoMapa(r.latitude!, r.longitude!)}
              >
                Ver no mapa
              </button>
              {seloFusoMapa(r.timestampEvento, r.fusoOffsetMin) && (
                <span style={{ fontSize: 11, color: "#000000" }}>
                  {seloFusoMapa(r.timestampEvento, r.fusoOffsetMin)}
                </span>
              )}
            </>
          ) : (
            <span
              style={{ color: "#000000" }}
              title={
                veLocalizacao
                  ? undefined
                  : "Sem permissão para ver a localização."
              }
            >
              {veLocalizacao ? "-" : "Restrito"}
            </span>
          )}
        </td>
      </tr>
    );
  }

  async function onConcederFolga(e: FormEvent) {
    e.preventDefault();
    setErroFolga(null);
    setConcedendoFolga(true);
    try {
      await concederFolga(motoristaId, {
        data: dataFolga,
        motivo: motivoFolga || undefined,
        compensaFeriado: folgaCompensaFeriado || undefined,
        justificativaExcessoDias: pedeJustificativaFolga
          ? justificativaExcessoFolga.trim() || undefined
          : undefined,
      });
      setDataFolga("");
      setMotivoFolga("");
      setFolgaCompensaFeriado(false);
      setJustificativaExcessoFolga("");
      setPedeJustificativaFolga(false);
      await carregarTudo();
    } catch (err) {
      // O servidor pede a justificativa quando a folga vem depois de mais de 6 dias seguidos.
      const msg = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
      const texto = typeof msg?.data?.message === "string" ? msg.data.message : "";
      if (msg?.status === 400 && texto.includes("Informe a justificativa")) {
        setPedeJustificativaFolga(true);
        setErroFolga(texto);
      } else {
        setErroFolga(
          "Não foi possível conceder a folga (confira se já não existe uma folga concedida para esse dia).",
        );
      }
    } finally {
      setConcedendoFolga(false);
    }
  }

  async function onRetirarFolga(f: FolgaConcedida) {
    const ok = await confirmarAcao(
      `Retirar a folga de ${dataCalendarioBr(f.data)}? O registro continua no histórico como "folga retirada pelo RH".`,
      { titulo: "Retirar folga", perigo: true },
    );
    if (!ok) return;
    setErroFolga(null);
    try {
      await retirarFolgaConcedida(motoristaId, f.id);
      await carregarTudo();
    } catch {
      setErroFolga("Não foi possível retirar a folga.");
    }
  }

  if (carregando || !motorista) return <Esqueleto />;

  async function copiarTexto(texto: string, qual: "id" | "key") {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Sem permissão da área de transferência: usa o método antigo.
      const campo = document.createElement("textarea");
      campo.value = texto;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      document.body.removeChild(campo);
    }
    setCopiado(qual);
    window.setTimeout(
      () => setCopiado((atual) => (atual === qual ? null : atual)),
      2000,
    );
  }

  async function onCopiarIdMotorista() {
    await copiarTexto(motorista!.id, "id");
  }

  // Desligar por MUDANÇA DE STATUS: INATIVO funciona como arquivo morto
  // (nada é excluído, o motorista só deixa de conseguir bater ponto ,
  // MotoristaDeviceGuard já bloqueia qualquer status diferente de
  /**
   * Edição dos dados cadastrais (Rodada 74, pedido explícito do
   * usuário: "deve ser possível editar os dados cadastrais"). De
   * propósito só nome e telefone , CPF e CNH ficam travados (ver
   * comentário em AtualizarCadastroMotoristaDto, backend) porque
   * entram no cálculo do hash genesis da cadeia de jornada e o CPF
   * também está gravado dentro do certificado digital já emitido no
   * cadastro.
   */
  function onIniciarEdicaoCadastro() {
    setNomeEdit(motorista!.nome);
    setTelefoneEdit(motorista!.telefone ?? "");
    setEmpresaEdit(motorista!.empresaId ?? "");
    setContratoEdit(contratoDoMotorista(motorista!));
    setErroCadastro(null);
    setEditandoCadastro(true);
  }

  function onCancelarEdicaoCadastro() {
    setNomeEdit(motorista!.nome);
    setTelefoneEdit(motorista!.telefone ?? "");
    setErroCadastro(null);
    setEditandoCadastro(false);
  }

  async function onSalvarCadastro(e: FormEvent) {
    e.preventDefault();
    if (!telefoneEdit.trim()) {
      setErroCadastro("Informe o telefone de contato do motorista.");
      return;
    }
    setErroCadastro(null);
    setSalvandoCadastro(true);
    try {
      const atualizado = await atualizarCadastroMotorista(motoristaId, {
        nome: nomeEdit.trim(),
        telefone: telefoneEdit.trim(),
        ...(empresaEdit && empresaEdit !== motorista?.empresaId
          ? { empresaId: empresaEdit }
          : {}),
      });
      setMotorista((prev) =>
        prev
          ? {
              ...prev,
              nome: atualizado.nome,
              telefone: atualizado.telefone,
              empresaId: atualizado.empresaId ?? prev.empresaId,
            }
          : prev,
      );
      await atualizarContratoMotorista(
        motoristaId,
        contratoParaPayload(contratoEdit),
      );
      setEditandoCadastro(false);
      await carregarTudo();
    } catch {
      setErroCadastro(
        "Não foi possível salvar os dados cadastrais (verifique o nome, o telefone e os dados de contrato).",
      );
    } finally {
      setSalvandoCadastro(false);
    }
  }

  // ATIVO). SUSPENSO tem o mesmo efeito prático mas sinaliza algo
  // temporário/em apuração, não um desligamento definitivo. Continua
  // aparecendo na listagem normal do painel , diferente de "Excluir
  // cadastro" abaixo.
  async function onAlterarStatus(novoStatus: StatusMotorista) {
    if (novoStatus === motorista!.status) return;
    const rotulo =
      novoStatus === "ATIVO"
        ? "reativar"
        : novoStatus === "INATIVO"
          ? "inativar"
          : "suspender";
    const motivo = await prompt(
      `Confirma ${rotulo} ${motorista!.nome}? O cadastro nunca é apagado, isto só muda o status (arquivo morto). O histórico continua todo preservado.`,
      {
        titulo: `Confirmar ${rotulo}`,
        placeholder: "Motivo (opcional)",
        textoConfirmar: "Confirmar",
        multilinha: true,
      },
    );
    if (motivo === null) return; // cancelou o prompt
    setAlterandoStatus(true);
    setErroStatus(null);
    try {
      const atualizado = await atualizarStatusMotorista(
        motoristaId,
        novoStatus,
        motivo || undefined,
      );
      setMotorista((prev) =>
        prev ? { ...prev, status: atualizado.status } : prev,
      );
    } catch {
      setErroStatus("Não foi possível alterar o status do motorista.");
    } finally {
      setAlterandoStatus(false);
    }
  }

  /**
   * "Excluir cadastro" , pedido explícito do usuário:
   * diferente de INATIVO/SUSPENSO acima, isto tira o motorista da
   * listagem normal do painel (ver MotoristasListPage). Continua sendo
   * um soft-delete: nada é apagado de verdade, e nome/CPF continuam
   * achável pela busca com "mostrar excluídos" marcado , todo o
   * histórico (registros de jornada, alertas, folgas, documentos de
   * carga) permanece intacto e visível aqui mesmo depois de excluído.
   */
  async function onExcluirCadastro() {
    const confirmacao = await prompt(
      `Excluir o cadastro de ${motorista!.nome}? Só é possível para quem nunca bateu ponto (cadastro feito por engano). Isto tira ele da listagem normal do painel e revoga o dispositivo vinculado agora. Para confirmar, digite EXCLUIR:`,
      { titulo: "Excluir cadastro", perigo: true, textoConfirmar: "Excluir" },
    );
    if (confirmacao !== "EXCLUIR") return;
    const motivo = (
      (await prompt("Motivo da exclusão (obrigatório):", {
        titulo: "Excluir cadastro",
        placeholder: "Motivo (mínimo 5 caracteres)",
        multilinha: true,
      })) ?? ""
    ).trim();
    if (motivo.length < 5) {
      setErroStatus("Informe o motivo da exclusão (mínimo 5 caracteres).");
      return;
    }
    setAlterandoStatus(true);
    setErroStatus(null);
    try {
      await excluirMotorista(motoristaId, motivo);
      navigate("/motoristas");
    } catch (ex) {
      // Cadastro com ponto batido nao pode ser excluido; o servidor explica o motivo.
      setErroStatus(mensagemDoErro(ex, "Não foi possível excluir o cadastro."));
      setAlterandoStatus(false);
    }
  }

  /** Rescisão pela ficha: grava a data, inativa o cadastro e mantém o histórico. */
  async function onConfirmarRescisao(dataDesligamento: string, motivo: string) {
    setAlterandoStatus(true);
    setErroRescisao(null);
    try {
      const atualizado = await rescindirMotorista(motoristaId, dataDesligamento, motivo);
      setMotorista((prev) =>
        prev
          ? { ...prev, status: atualizado.status, dataDesligamento: atualizado.dataDesligamento ?? dataDesligamento }
          : prev,
      );
      setRescisaoAberta(false);
    } catch (ex) {
      setErroRescisao(mensagemDoErro(ex, "Não foi possível registrar a rescisão."));
    } finally {
      setAlterandoStatus(false);
    }
  }

  /** Readmissão: quem teve a rescisão registrada volta a ATIVO. */
  async function onConfirmarReadmissao(dataReadmissao: string, motivo: string) {
    setAlterandoStatus(true);
    setErroRescisao(null);
    try {
      const atualizado = await readmitirMotorista(motoristaId, dataReadmissao, motivo);
      setMotorista((prev) =>
        prev ? { ...prev, status: atualizado.status, dataDesligamento: null } : prev,
      );
      setReadmissaoAberta(false);
    } catch (ex) {
      setErroRescisao(mensagemDoErro(ex, "Não foi possível readmitir o colaborador."));
    } finally {
      setAlterandoStatus(false);
    }
  }

  /** Reativa um cadastro excluido (o servidor recusa se CPF/CNH foi reutilizado). */
  async function onReativarCadastro() {
    if (
      !(await confirmarAcao(
        `Reativar o cadastro de ${motorista!.nome}? Ele volta como ATIVO e reaparece na listagem, com todo o histórico de antes.`,
        { titulo: "Reativar cadastro", textoConfirmar: "Reativar" },
      ))
    ) {
      return;
    }
    setAlterandoStatus(true);
    setErroStatus(null);
    try {
      await reativarMotorista(motoristaId);
      await carregarTudo();
    } catch (ex) {
      setErroStatus(mensagemDoErro(ex, "Não foi possível reativar o cadastro."));
    } finally {
      setAlterandoStatus(false);
    }
  }

  return (
    <div>
      {!somente && (
      <>
      <AbasTopo
        abas={ABAS_MOTORISTA}
        padrao={searchParams.get("secao") === "alertas-jornada" ? "alertas" : undefined}
        inicial={abaInicial}
      />
      {editandoCadastro ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Editar dados cadastrais</h3>
          <form onSubmit={onSalvarCadastro}>
            <label>Nome</label>
            <input
              value={nomeEdit}
              onChange={(e) => setNomeEdit(e.target.value)}
              minLength={3}
              maxLength={60}
              required
            />

            <label style={{ marginTop: 8, display: "block" }}>CPF</label>
            <input value={motorista.cpf} disabled />
            <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
              CPF e CNH não podem ser editados aqui, pois identificam o
              motorista nos registros e na cadeia de integridade (hash). Em caso
              de erro de digitação, é preciso excluir e recadastrar (o
              histórico não se perde).
            </p>

            <label style={{ marginTop: 8, display: "block" }}>
              Telefone de contato
            </label>
            <TelefoneInput
              value={telefoneEdit}
              onChange={setTelefoneEdit}
              required
            />

            {empresasGrupo.length > 0 && (
              <>
                <label style={{ marginTop: 8, display: "block" }}>
                  Empresa (CNPJ) vinculada
                </label>
                <select
                  value={empresaEdit}
                  onChange={(e) => {
                    setEmpresaEdit(e.target.value);
                    // O horário contratual pertence à empresa: troca de CNPJ limpa a escolha.
                    setContratoEdit((c) => ({ ...c, horarioContratualId: "" }));
                  }}
                >
                  {empresasGrupo.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.razaoSocial} ({emp.cnpj})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 12, marginTop: 2 }}>
                  A regra de folga vinculada a este CNPJ passa a valer para o
                  motorista.
                </p>
              </>
            )}

            <CamposDadosContrato
              valores={contratoEdit}
              onChange={setContratoEdit}
              empresaId={empresaEdit || motorista.empresaId}
            />

            {erroCadastro && <p className="error-text">{erroCadastro}</p>}

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button type="submit" disabled={salvandoCadastro}>
                {salvandoCadastro ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={salvandoCadastro}
                onClick={onCancelarEdicaoCadastro}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <h2>{motorista.nome}</h2>
          <p style={{ color: "#000000", marginTop: -8 }}>
            {ROTULO_FUNCAO[motorista.funcao ?? "MOTORISTA"]} · CPF {motorista.cpf}
            {motorista.telefone && <> · {motorista.telefone}</>}
            {(() => {
              const emp = empresasGrupo.find(
                (x) => x.id === motorista.empresaId,
              );
              return emp ? (
                <>
                  {" "}
                  · {emp.razaoSocial} ({emp.cnpj})
                </>
              ) : null;
            })()}{" "}
            ·{" "}
            <span
              style={{
                color:
                  motorista.status === "ATIVO"
                    ? "#166534"
                    : motorista.status === "SUSPENSO"
                      ? "#b45309"
                      : "#000",
                fontWeight: 600,
              }}
            >
              status {rotuloStatusMotorista(motorista.status)}
            </span>{" "}
            · cadastrado na plataforma em{" "}
            <strong>
              {new Date(motorista.createdAt).toLocaleString("pt-BR")}
            </strong>{" "}
            <button
              type="button"
              onClick={onIniciarEdicaoCadastro}
              style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
            >
              Editar
            </button>
            {motorista.dataDesligamento && !motorista.excluidoEm && (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={() => {
                  setErroRescisao(null);
                  setReadmissaoAberta(true);
                }}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Readmitir
              </button>
            )}
            {motorista.status !== "ATIVO" && !motorista.dataDesligamento && (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={() => onAlterarStatus("ATIVO")}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Reativar
              </button>
            )}
            {motorista.status !== "SUSPENSO" && (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={() => onAlterarStatus("SUSPENSO")}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Suspender
              </button>
            )}
            {!motorista.excluidoEm && !motorista.dataDesligamento && (
              <button
                type="button"
                className="danger"
                disabled={alterandoStatus}
                onClick={() => {
                  setErroRescisao(null);
                  setRescisaoAberta(true);
                }}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Registrar rescisão
              </button>
            )}
            {motorista.dataDesligamento && (
              <span style={{ fontSize: 12, marginLeft: 8, marginTop: 8, display: "inline-block" }}>
                Rescisão em{" "}
                <strong>
                  {motorista.dataDesligamento.slice(0, 10).split("-").reverse().join("/")}
                </strong>
              </span>
            )}
            {!motorista.excluidoEm && !carregando && registros.length === 0 && tratamentos.length === 0 && (
              <button
                type="button"
                className="danger"
                disabled={alterandoStatus}
                onClick={onExcluirCadastro}
                style={{ fontSize: 12, marginLeft: 8, marginTop: 8 }}
              >
                Excluir cadastro
              </button>
            )}
            {erroStatus && (
              <span
                style={{
                  color: "#b91c1c",
                  fontSize: 12,
                  marginLeft: 8,
                  marginTop: 8,
                  display: "inline-block",
                }}
              >
                {erroStatus}
              </span>
            )}
          </p>
        </>
      )}

      {motorista.excluidoEm && (
        <div
          className="card"
          style={{ background: "#fee2e2", borderColor: "#fecaca" }}
        >
          <strong style={{ color: "#b91c1c" }}>Cadastro excluído</strong>
          <p style={{ fontSize: 13, color: "#7f1d1d", margin: "4px 0 0" }}>
            Excluído em {new Date(motorista.excluidoEm).toLocaleString("pt-BR")}
            {motorista.motivoExclusao && (
              <>, motivo: {motorista.motivoExclusao}</>
            )}
            . Não aparece mais na listagem normal, mas todo o histórico abaixo
            continua intacto.
          </p>
          <button
            type="button"
            style={{ marginTop: 8 }}
            disabled={alterandoStatus}
            onClick={onReativarCadastro}
          >
            Reativar cadastro
          </button>
        </div>
      )}

      </>
      )}

      {mostrar("cadastro") && (
      <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Dispositivo vinculado</h3>

        <p style={{ fontSize: 13, color: "#000000" }}>
          ID do motorista (informe ao motorista para ele completar o vínculo no
          app):
          <br />
          <code style={{ fontSize: 13 }}>{motorista.id}</code>{" "}
          <button
            type="button"
            onClick={onCopiarIdMotorista}
            style={{
              fontSize: 12,
              padding: "2px 8px",
              ...(copiado === "id" ? { background: "#166534" } : {}),
            }}
          >
            {copiado === "id" ? "Copiado!" : "Copiar"}
          </button>
        </p>

        {dispositivo?.deviceUuid ? (
          <>
            <p>
              Aparelho atual: <code>{dispositivo.deviceUuid}</code>
              <br />
              Telefone vinculado em{" "}
              <strong>
                {new Date(dispositivo.vinculadoEm!).toLocaleString("pt-BR")}
              </strong>
            </p>
            {(dispositivo.errosAppQtd ?? 0) > 0 && (
              <p style={{ color: "#000000" }}>
                <strong>
                  {dispositivo.errosAppQtd} ponto(s) com erro neste aparelho
                </strong>
                {dispositivo.errosAppDesde
                  ? ` desde ${new Date(dispositivo.errosAppDesde).toLocaleString("pt-BR")}`
                  : ""}
                . Os pontos continuam guardados no celular; peça ao motorista
                para abrir o app com internet; se o erro persistir, acione o
                suporte sem apagar o app. Informado pelo app
                {dispositivo.errosAppAtualizadoEm
                  ? ` em ${new Date(dispositivo.errosAppAtualizadoEm).toLocaleString("pt-BR")}`
                  : ""}
                .
              </p>
            )}
            <button className="danger" onClick={onRevogar}>
              Revogar vínculo
            </button>
          </>
        ) : (
          <p style={{ color: "#000000" }}>
            Este motorista ainda não tem aparelho vinculado.
          </p>
        )}

        <h4>Vincular novo aparelho</h4>
        <form onSubmit={onVincular}>
          <label>
            {import.meta.env.DEV
              ? "UUID do aparelho (em branco só para testes: o sistema gera um UUID que não pertence a nenhum celular)"
              : "UUID do aparelho (mostrado no app do motorista)"}
          </label>
          <input
            maxLength={36}
            required={!import.meta.env.DEV}
            value={novaDeviceUuid}
            onChange={(e) => setNovaDeviceUuid(e.target.value)}
          />
          <button type="submit" disabled={vinculando}>
            {vinculando
              ? "Vinculando..."
              : dispositivo?.deviceUuid
                ? "Substituir vínculo"
                : "Vincular"}
          </button>
        </form>

        {deviceApiKeyGerada && (
          <div
            className="card"
            style={{
              background: "#fffbeb",
              borderColor: "#fde68a",
              marginTop: 12,
            }}
          >
            <strong>Device key gerada (aparece só esta vez):</strong>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {deviceApiKeyGerada}
            </pre>
            <button
              type="button"
              onClick={() => void copiarTexto(deviceApiKeyGerada!, "key")}
              style={{
                fontSize: 12,
                padding: "2px 8px",
                ...(copiado === "key" ? { background: "#166534" } : {}),
              }}
            >
              {copiado === "key" ? "Copiado!" : "Copiar"}
            </button>
            <p style={{ fontSize: 12, color: "#92400e" }}>
              Copie e grave no app do motorista agora. Depois de sair desta
              tela, não é possível recuperar.
            </p>
          </div>
        )}
      </div>

      {/* Ajudante não tem veículo de tração. */}
      {motorista.funcao !== "AJUDANTE" && (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Veículo de tração vinculado</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Placa do cavalo mecânico (o veículo que puxa a carga, não o
          reboque/carreta), obrigatória. O motorista também pode trocar direto
          pelo app, toda troca de placa (não o primeiro cadastro) fica
          registrada abaixo, em &quot;Trocas de veículo&quot;. ID e tecnologia
          do rastreador são opcionais.
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#92400e",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 6,
            padding: "8px 10px",
          }}
        >
          Aviso: hoje o sistema só guarda o vínculo do rastreador (o ID e a
          tecnologia cadastrados aqui), a captura do sinal real do rastreador
          (posição reportada por ele) ainda não está implementada. Cada veículo
          só pode estar vinculado a um motorista por vez: cadastrar aqui uma
          placa já vinculada a outro motorista ativo será recusado.
        </p>
        <form onSubmit={onAtualizarVeiculo}>
          <label>Placa</label>
          <input
            value={placaForm}
            onChange={(e) => setPlacaForm(e.target.value.toUpperCase())}
            placeholder="ABC1234 ou ABC1D23"
            maxLength={7}
            required
          />
          <label>ID do rastreador (opcional)</label>
          <input
            maxLength={100}
            value={idRastreadorForm}
            onChange={(e) => setIdRastreadorForm(e.target.value)}
          />
          <label>Tecnologia do rastreador (opcional)</label>
          <select
            value={tecnologiaForm}
            onChange={(e) => setTecnologiaForm(e.target.value)}
          >
            <option value="">Nenhuma</option>
            <option value="GPS">GPS</option>
            <option value="SATELITAL">Satelital</option>
            <option value="CELULAR">Celular</option>
            <option value="RFID">RFID</option>
            <option value="HIBRIDO">Híbrido (GPS + satélite)</option>
            <option value="OUTRO">Outro</option>
          </select>
          {erroVeiculo && <p className="error-text">{erroVeiculo}</p>}
          <button type="submit" disabled={atualizandoVeiculo}>
            {atualizandoVeiculo
              ? "Salvando..."
              : veiculo && "placa" in veiculo
                ? "Atualizar veículo"
                : "Vincular veículo"}
          </button>
        </form>
      </div>
      )}

      </>
      )}

      {mostrar("registros") && (
      <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Integridade da cadeia de jornada</h3>
        <button onClick={onVerificarIntegridade}>Verificar integridade</button>
        {integridade && (
          <div style={{ marginTop: 12 }}>
            <span className={`badge ${integridade.integro ? "ok" : "erro"}`}>
              {integridade.integro
                ? integridade.divergencias.length > 0
                  ? "ÍNTEGRO (com divergências já regularizadas)"
                  : "ÍNTEGRO"
                : "PROBLEMA DETECTADO"}
            </span>
            <ul style={{ fontSize: 13 }}>
              <li>Total de registros: {integridade.totalRegistros}</li>
              <li>
                Cadeia de hashes válida:{" "}
                {integridade.cadeiaValida
                  ? "sim"
                  : `não (${integridade.motivoCadeia})`}
              </li>
              <li>
                Certificado confere:{" "}
                {integridade.certificadoFingerprintOk ? "sim" : "não"}
              </li>
              <li>
                Assinaturas inválidas:{" "}
                {integridade.assinaturasInvalidas.length === 0
                  ? "nenhuma"
                  : integridade.assinaturasInvalidas.join(", ")}
              </li>
            </ul>
            {integridade.divergencias.length > 0 && (
              <div style={{ marginTop: -4 }}>
                <p
                  style={{ fontSize: 13, color: "#000000", margin: "0 0 8px" }}
                >
                  {integridade.divergencias.filter((d) => !d.aceita).length}{" "}
                  pendente(s) e{" "}
                  {integridade.divergencias.filter((d) => d.aceita).length}{" "}
                  regularizada(s) no total.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <label style={{ fontSize: 13 }}>
                    Mostrar{" "}
                    <select
                      value={filtroStatusDivergencia}
                      onChange={(e) => {
                        setFiltroStatusDivergencia(
                          e.target.value as
                            | "PENDENTES"
                            | "REGULARIZADAS"
                            | "TODAS",
                        );
                        listaDivergencias.irParaPagina(1);
                      }}
                    >
                      <option value="PENDENTES">Só as pendentes</option>
                      <option value="REGULARIZADAS">Só as regularizadas</option>
                      <option value="TODAS">Todas</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: 13 }}
                    disabled={listaDivergencias.itensFiltrados.length === 0}
                    onClick={onBaixarCsvDivergencias}
                  >
                    Baixar histórico (CSV)
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: 13 }}
                    disabled={listaDivergencias.itensFiltrados.length === 0}
                    onClick={onImprimirDivergencias}
                  >
                    Imprimir / PDF
                  </button>
                </div>
                <ControlesListaPaginada
                  ordem={listaDivergencias.ordem}
                  onAlternarOrdem={listaDivergencias.alternarOrdem}
                  qtdPorPagina={listaDivergencias.qtdPorPagina}
                  onMudarQtdPorPagina={listaDivergencias.mudarQtdPorPagina}
                  pagina={listaDivergencias.pagina}
                  totalPaginas={listaDivergencias.totalPaginas}
                  popupAberto={listaDivergencias.popupAberto}
                  onAbrirPopup={listaDivergencias.abrirPopup}
                  onFecharPopup={listaDivergencias.fecharPopup}
                  onSelecionarPagina={listaDivergencias.irParaPagina}
                  filtroData={{
                    dataInicio: listaDivergencias.dataInicio,
                    onDataInicio: listaDivergencias.setDataInicio,
                    dataFim: listaDivergencias.dataFim,
                    onDataFim: listaDivergencias.setDataFim,
                    rotulo: "horário do evento",
                  }}
                  tituloPopup="Divergências de integridade"
                >
                  <div>
                    {listaDivergencias.itensExibidos.map((d) => (
                      <div
                        key={d.sequencial}
                        style={{
                          background: d.aceita ? "#f0fdf4" : "#fffbeb",
                          border: `1px solid ${d.aceita ? "#bbf7d0" : "#fde68a"}`,
                          borderRadius: 6,
                          padding: 10,
                          fontSize: 13,
                          color: "#000000",
                          marginBottom: 8,
                        }}
                      >
                        <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
                          Evento nº {d.sequencial}
                          {d.tipoEvento ? ` (${d.tipoEvento})` : ""}
                          {d.timestampEvento
                            ? ` em ${new Date(d.timestampEvento).toLocaleString("pt-BR")}`
                            : ""}
                          {d.criadoEm
                            ? `, lançado em ${new Date(d.criadoEm).toLocaleString("pt-BR")}`
                            : ""}
                          .{" "}
                          <Link
                            to={`/motoristas/${motoristaId}/integridade/${d.sequencial}`}
                            style={{ fontSize: 12, fontWeight: 600 }}
                          >
                            Analisar evento →
                          </Link>
                        </p>
                        <p style={{ margin: "0 0 8px" }}>{d.explicacao}</p>
                        {d.aceita && d.aceite ? (
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              color: "#15803d",
                            }}
                          >
                            Regularizado por {d.aceite.aceitoPorNome} em{" "}
                            {new Date(d.aceite.aceitoEm).toLocaleString(
                              "pt-BR",
                            )}
                            . Motivo: {d.aceite.motivo}
                          </p>
                        ) : (
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: 12, padding: "4px 10px" }}
                            disabled={aceitandoDivergencia === d.sequencial}
                            onClick={() => onAceitarDivergencia(d.sequencial)}
                          >
                            {aceitandoDivergencia === d.sequencial
                              ? "Regularizando..."
                              : "Aceitar/regularizar esta divergência"}
                          </button>
                        )}
                      </div>
                    ))}
                    {listaDivergencias.itensFiltrados.length === 0 && (
                      <p style={{ fontSize: 13, color: "#000000" }}>
                        Nenhuma divergência neste filtro.
                      </p>
                    )}
                  </div>
                </ControlesListaPaginada>
              </div>
            )}
          </div>
        )}
      </div>

      {alertasIntegridadeDispositivo.length > 0 && (
        <div
          className="card"
          style={{ background: "#fef2f2", borderColor: "#fecaca" }}
        >
          <h3 style={{ marginTop: 0, color: "#b91c1c" }}>
            ⚠ Aparelho com sinais a conferir
          </h3>
          <p style={{ fontSize: 13, color: "#000000" }}>
            O app detectou sinais de comprometimento do aparelho
            (modificação do sistema, ferramenta de instrumentação ou localização simulada habilitada)
            no momento de algum ponto batido. Isso não bloqueou o registro, é só
            um sinal para você conferir (o odômetro/GPS daquele ponto merece
            uma conferência extra).
          </p>
          <ul style={{ fontSize: 13 }}>
            {alertasIntegridadeDispositivo.map((a) => (
              <li key={a.id}>
                {new Date(a.createdAt).toLocaleString("pt-BR")}:{" "}
                {(a.detalhes?.flags ?? []).join("; ") || "sinal desconhecido"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {trocasPendentes.length > 0 && (
        <div
          className="card"
          style={{ background: "#fffbeb", borderColor: "#fde68a" }}
        >
          <h3 style={{ marginTop: 0, color: "#92400e" }}>
            ⚠ Trocas de veículo
          </h3>
          <p style={{ fontSize: 13, color: "#000000" }}>
            O motorista (ou o painel) trocou a placa vinculada depois do
            cadastro inicial. Confira se faz sentido (realocação pra outro
            cavalo, por exemplo) ou se merece uma checagem.
          </p>
          <ul style={{ fontSize: 13 }}>
            {trocasPendentes.map((t) => (
              <li key={t.id}>
                {new Date(t.createdAt).toLocaleString("pt-BR")}:{" "}
                {t.detalhes?.placaAnterior ?? "--"} →{" "}
                {t.detalhes?.placaNova ?? "--"} (por{" "}
                {t.actorType === "MOTORISTA" ? "motorista" : "painel"})
              </li>
            ))}
          </ul>
          <button type="button" onClick={onMarcarTrocasConferidas}>
            Marcar como conferido
          </button>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Registros de jornada</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={onBaixarComprovante}
              disabled={baixandoComprovante}
            >
              {baixandoComprovante ? "Gerando..." : "Baixar comprovante (PDF)"}
            </button>
            <button
              onClick={onBaixarAej}
              disabled={baixandoAej}
              title="Arquivo Eletrônico de Jornada no leiaute vigente do AEJ publicado pelo MTE (sem a assinatura digital, que depende do certificado ICP-Brasil)"
            >
              {baixandoAej ? "Gerando..." : "Baixar AEJ (oficial)"}
            </button>
            <button
              onClick={onBaixarAejAssinado}
              disabled={baixandoAejAssinado}
              title="Baixa o AEJ e a assinatura digital CAdES destacada (.p7s) da FVF. Com certificado de teste, a assinatura não tem validade legal."
            >
              {baixandoAejAssinado ? "Assinando..." : "Baixar AEJ assinado (.p7s)"}
            </button>
            {avisoAejAssinado && <p style={{ fontSize: 13 }}>{avisoAejAssinado}</p>}
            <button
              onClick={onBaixarDirecaoEspera}
              disabled={baixandoDirecaoEspera}
              title="Tempos de direção e de espera em CSV. O AEJ oficial não tem registro para eles; este relatório complementa o AEJ com os mesmos horários."
            >
              {baixandoDirecaoEspera ? "Gerando..." : "Baixar direção e espera (CSV)"}
            </button>
            <button
              onClick={onBaixarPlanilha}
              disabled={baixandoPlanilha}
              title="Planilha CSV com todos os campos da jornada. Não é o AEJ oficial."
            >
              {baixandoPlanilha ? "Gerando..." : "Baixar planilha (CSV)"}
            </button>
            <button
              onClick={onBaixarEspelhoRepP}
              disabled={baixandoEspelhoRepP}
              title="Espelho de Ponto Eletrônico (REP-P), Lei 13.103/2015 + Portaria 671/2021: marcações com GPS/NSR/categoria legal, resumo diário categorizado e rodapé com cadeia de hash"
            >
              {baixandoEspelhoRepP
                ? "Gerando..."
                : "Baixar Espelho de Ponto (REP-P)"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#000000", margin: "0 0 8px" }}>
          Os downloads seguem o período filtrado abaixo (agora:{" "}
          {rotuloPeriodoRegistros}).
        </p>
        <ControlesListaPaginada
          ordem={listaRegistros.ordem}
          onAlternarOrdem={listaRegistros.alternarOrdem}
          qtdPorPagina={listaRegistros.qtdPorPagina}
          onMudarQtdPorPagina={listaRegistros.mudarQtdPorPagina}
          pagina={listaRegistros.pagina}
          totalPaginas={listaRegistros.totalPaginas}
          popupAberto={listaRegistros.popupAberto}
          onAbrirPopup={listaRegistros.abrirPopup}
          onFecharPopup={listaRegistros.fecharPopup}
          onSelecionarPagina={listaRegistros.irParaPagina}
          filtroData={{
            dataInicio: listaRegistros.dataInicio,
            onDataInicio: listaRegistros.setDataInicio,
            dataFim: listaRegistros.dataFim,
            onDataFim: listaRegistros.setDataFim,
            rotulo: "data do evento",
          }}
          tituloPopup="Registros de jornada"
        >
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Evento</th>
                <th>Quando</th>
                <th>Aparelho</th>
                <th>Localização</th>
              </tr>
            </thead>
            <tbody>
              {listaRegistros.itensExibidos.map(linhaRegistroJornada)}
              {listaRegistros.itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#000000" }}>
                    {registros.length === 0
                      ? "Nenhum registro ainda (o motorista bate ponto pelo app)."
                      : "Nenhum registro no período filtrado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ControlesListaPaginada>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Jornadas por dia</h3>
          <label
            style={{
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Mostrar
            <select
              value={qtdJornadasPorPagina}
              onChange={(e) => {
                const novoTamanho = Number(e.target.value);
                setQtdJornadasPorPagina(novoTamanho);
                setQtdJornadasExibidas(novoTamanho);
              }}
            >
              <option value={7}>últimos 7 dias</option>
              <option value={14}>últimos 14 dias</option>
              <option value={30}>últimos 30 dias</option>
              <option value={60}>últimos 60 dias</option>
            </select>
          </label>
        </div>
        <div style={{ fontSize: 13, color: "#000000", marginBottom: 12 }}>
          <p style={{ margin: "0 0 6px" }}>
            Cada linha é uma <strong>jornada</strong> (do início ao fim de uma
            jornada), e não um dia do calendário. Se o motorista encerrar e
            abrir uma nova jornada no mesmo dia, as duas aparecem com o selo
            &quot;1ª jornada do dia&quot; e &quot;2ª jornada do dia&quot;.
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <strong>Viagem:</strong> jornadas com o mesmo CT-e fazem parte da
            mesma viagem. Ela começa quando o primeiro CT-e é vinculado ao
            motorista e termina quando todos os CT-e do grupo são entregues. A
            coluna mostra a posição da jornada na viagem (ex.: 2/3 = segunda
            jornada de uma viagem com três).
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <strong>Direção do ciclo:</strong> soma da direção das jornadas
            encadeadas, ou seja, aquelas com menos de 11h de descanso entre uma
            e outra. É essa soma que dispara os alertas de 8h (atenção) e 10h
            (crítico). Fica em laranja a partir de 8h e em vermelho a partir de
            10h.
          </p>
          <p style={{ margin: 0 }}>
            <strong>CT-e:</strong> mostra quais CT-e formam a viagem. Se a
            jornada não tem CT-e vinculado, ela é avulsa e a coluna Viagem fica
            com &quot;-&quot;.
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Duração da jornada</th>
              <th>Direção</th>
              <th>Direção do ciclo</th>
              <th>Espera</th>
              <th>Viagem</th>
              <th>CT-e</th>
            </tr>
          </thead>
          <tbody>
            {jornadasDiariasExibidas.map((j) => {
              const rotuloDia = rotuloJornadaDoDia(j);
              return (
                <tr key={`${j.inicio}-${j.viagemIndice}-${j.diaDaViagem}`}>
                  <td>
                    {new Date(j.inicio).toLocaleDateString("pt-BR")}
                    {rotuloDia && (
                      <>
                        <br />
                        <span
                          style={{
                            fontSize: 11,
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          {rotuloDia}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{new Date(j.inicio).toLocaleTimeString("pt-BR")}</td>
                  <td>
                    {/* Pedido do usuário: enquanto a jornada
                      ainda está aberta, `j.fim` é só o timestamp do
                      ÚLTIMO EVENTO batido até agora (não um "fim" de
                      verdade) , mostrar essa hora ao lado de "(em
                      andamento)" passava a falsa impressão de que a
                      jornada tinha terminado naquele horário e ficava
                      mudando a cada novo evento. Enquanto em andamento,
                      mostra só o aviso; a hora real só aparece quando o
                      "Fim de jornada" for de fato registrado. */}
                    {j.emAndamento
                      ? "(em andamento)"
                      : new Date(j.fim).toLocaleTimeString("pt-BR")}
                  </td>
                  <td>{formatarMinutos(j.totalJornadaMin)}</td>
                  <td>{formatarMinutos(j.totalDirecaoMin)}</td>
                  <td>
                    {(() => {
                      const ciclo = cicloPorJornada.get(j);
                      if (!ciclo) return "-";
                      const cor =
                        ciclo.totalDirecaoMin >= 600
                          ? "#b91c1c"
                          : ciclo.totalDirecaoMin >= 480
                            ? "#b45309"
                            : "#000000";
                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          title="Ver as jornadas que compõem este ciclo"
                          onClick={() =>
                            setCicloAberto({
                              membros: ciclo.membros,
                              destaqueInicio: j.inicio,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              setCicloAberto({
                                membros: ciclo.membros,
                                destaqueInicio: j.inicio,
                              });
                          }}
                          style={{
                            color: cor,
                            fontWeight: 600,
                            cursor: "pointer",
                            textDecoration: "underline dotted",
                          }}
                        >
                          {formatarMinutos(ciclo.totalDirecaoMin)}
                          {ciclo.qtd > 1 && (
                            <span style={{ fontSize: 11, fontWeight: 400 }}>
                              {" "}
                              ({ciclo.qtd} jornadas)
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{formatarMinutos(j.totalEsperaMin)}</td>
                  <td>
                    {j.totalDiasViagem > 1
                      ? `${j.diaDaViagem}/${j.totalDiasViagem}`
                      : "-"}
                  </td>
                  <td>
                    {j.ctesRelacionados.length > 0
                      ? j.ctesRelacionados
                          .map((c) => c.numero ?? "sem número")
                          .join(", ")
                      : "avulsa (sem CT-e)"}
                  </td>
                </tr>
              );
            })}
            {jornadasDiariasExibidas.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "#000000" }}>
                  Nenhuma jornada consolidada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {qtdJornadasExibidas < jornadasDiariasOrdenadas.length && (
          <button
            className="secondary"
            style={{ marginTop: 12 }}
            onClick={() =>
              setQtdJornadasExibidas((atual) =>
                Math.min(
                  atual + qtdJornadasPorPagina,
                  jornadasDiariasOrdenadas.length,
                ),
              )
            }
          >
            Carregar mais (
            {jornadasDiariasOrdenadas.length - qtdJornadasExibidas} restantes)
          </button>
        )}
        {cicloAberto && (
          <div
            onClick={() => setCicloAberto(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#ffffff",
                color: "#000000",
                borderRadius: 10,
                padding: 20,
                width: "min(760px, 100%)",
                maxHeight: "85vh",
                overflow: "auto",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Jornadas que compõem o ciclo</h3>
              <p style={{ fontSize: 13, marginTop: 0 }}>
                Jornadas encadeadas: menos de 11h de descanso entre o fim de uma
                e o início da seguinte. Jornadas vazias (abertas e fechadas sem
                trabalho) não entram.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Descanso anterior</th>
                    <th>Direção</th>
                    <th>Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let acumulado = 0;
                    return cicloAberto.membros.map((m, i) => {
                      acumulado += m.totalDirecaoMin;
                      const anterior = cicloAberto.membros[i - 1];
                      const descansoMin = anterior
                        ? (new Date(m.inicio).getTime() -
                            new Date(anterior.fim).getTime()) /
                          60_000
                        : null;
                      return (
                        <tr
                          key={m.inicio}
                          style={
                            m.inicio === cicloAberto.destaqueInicio
                              ? { background: "#fef3c7" }
                              : undefined
                          }
                        >
                          <td>{new Date(m.inicio).toLocaleString("pt-BR")}</td>
                          <td>
                            {m.emAndamento
                              ? "(em andamento)"
                              : new Date(m.fim).toLocaleString("pt-BR")}
                          </td>
                          <td>
                            {descansoMin === null
                              ? "-"
                              : formatarMinutos(descansoMin)}
                          </td>
                          <td>{formatarMinutos(m.totalDirecaoMin)}</td>
                          <td style={{ fontWeight: 600 }}>
                            {formatarMinutos(acumulado)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              <p style={{ fontSize: 12, marginBottom: 0 }}>
                A linha em destaque é a jornada em que você clicou.
              </p>
              <button
                className="secondary"
                style={{ marginTop: 12 }}
                onClick={() => setCicloAberto(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CT-e/MDF-e é do motorista. */}
      {motorista.funcao !== "AJUDANTE" && (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Status de carga (CT-e / MDF-e)</h3>
        {statusCarga?.statusCarga ? (
          <p>
            <span
              className={`badge ${statusCarga.statusCarga === "CARREGADO" ? "ok" : ""}`}
            >
              {statusCarga.statusCarga === "CARREGADO" ? "CARREGADO" : "VAZIO"}
            </span>{" "}
            <span style={{ fontSize: 13, color: "#000000" }}>
              último documento ({statusCarga.tipo === "CTE" ? "CT-e" : "MDF-e"}{" "}
              {statusCarga.numero ?? ""}) em{" "}
              {statusCarga.createdAt &&
                new Date(statusCarga.createdAt).toLocaleString("pt-BR")}
            </span>
          </p>
        ) : (
          <p style={{ color: "#000000" }}>
            Nenhum documento de carga vinculado ainda.
          </p>
        )}
        {/* Cada CT-e é praticamente uma entrega , este número desvincula
            sozinho (FIFO) a cada "Fim de descarregamento" que o
            motorista bater no app. */}
        <p>
          <span className={`badge ${statusCarga?.cteEmAberto ? "" : "ok"}`}>
            {statusCarga?.cteEmAberto ?? 0} CT-e em aberto
          </span>{" "}
          <span style={{ fontSize: 13, color: "#000000" }}>
            {statusCarga?.cteEmAberto
              ? "Ainda vinculados, aguardando entrega"
              : "Nenhuma entrega pendente"}
          </span>
        </p>
        <p style={{ fontSize: 12, color: "#000000" }}>
          Documentos vinculados a este motorista: {documentosCarga.length}. Ver
          ou enviar novos em{" "}
          <Link to="/documentos-carga">Documentos de carga</Link>.
        </p>
      </div>
      )}

      </>
      )}

      {mostrar("espera") && <Espera235c11Card motoristaId={motoristaId} />}

      {mostrar("folgas") && (
      <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Folgas autorrelatadas</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Avisadas pelo próprio motorista no app, não são ponto, só explicam pra
          você dias sem registro.
        </p>
        <FolgasLista
          titulo="Folgas autorrelatadas"
          subtituloArquivo={motorista?.nome}
          cabecalhos={["Data da folga", "Observação do motorista"]}
          linhas={folgas.map((f) => ({
            id: f.id,
            data: f.data,
            celulas: [dataCalendarioBr(f.data), f.observacao ?? ""],
          }))}
          vazio="Nenhuma folga autorrelatada."
        />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Folgas concedidas pelo RH</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Lançada pelo RH/gestor. No dia futuro, o motorista simplesmente não
          precisa bater ponto. No dia que já tem registro de ponto, nada é
          apagado. A folga entra como um status novo ao lado do que já foi
          marcado, e um alerta é gerado abaixo, em &quot;Alertas de
          jornada&quot;, pra você conferir o conflito.
        </p>
        <form onSubmit={onConcederFolga}>
          <label>Dia da folga</label>
          <input
            type="date"
            value={dataFolga}
            onChange={(e) => setDataFolga(e.target.value)}
            required
          />
          <label>Motivo (opcional)</label>
          <CampoTextoExpansivel
            value={motivoFolga}
            onChange={(e) => setMotivoFolga(e.target.value)}
            maxLength={400}
          />
          <label>
            <input
              type="checkbox"
              checked={folgaCompensaFeriado}
              onChange={(e) => setFolgaCompensaFeriado(e.target.checked)}
            />{" "}
            Esta folga compensa um feriado trabalhado
          </label>
          <small>
            Marcada, o AEJ informa folga compensatória de feriado; sem a marca, informa DSR (descanso semanal).
          </small>
          {pedeJustificativaFolga && (
            <>
              <label>Justificativa (CCT/ACT que autoriza, mínimo 20 caracteres)</label>
              <CampoTextoExpansivel
                value={justificativaExcessoFolga}
                onChange={(e) => setJustificativaExcessoFolga(e.target.value)}
                maxLength={400}
              />
            </>
          )}
          {erroFolga && <p className="error-text">{erroFolga}</p>}
          <button type="submit" disabled={concedendoFolga}>
            {concedendoFolga ? "Concedendo..." : "Conceder folga"}
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <FolgasLista
            titulo="Folgas concedidas pelo RH"
            subtituloArquivo={motorista?.nome}
            cabecalhos={[
              "Data da folga",
              "Situação",
              "Motivo",
              "Concedida por",
            ]}
            comAcoes
            linhas={folgasConcedidas.map((f) => ({
              id: f.id,
              data: f.data,
              cor: f.status === "NAO_REALIZADA" ? "#b91c1c" : undefined,
              celulas: [
                dataCalendarioBr(f.data),
                ROTULO_STATUS_FOLGA[f.status],
                f.motivo ?? "",
                f.concedidaPorUsuario?.nome ?? "",
              ],
              acao:
                f.status === "CONCEDIDA" &&
                f.data.slice(0, 10) > dataLocalIso(new Date()) ? (
                  <button
                    type="button"
                    className="secondary"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    onClick={() => void onRetirarFolga(f)}
                  >
                    Retirar
                  </button>
                ) : null,
            }))}
            vazio="Nenhuma folga concedida."
          />
        </div>
      </div>

      </>
      )}

      {mostrar("trilha") && veLocalizacao && (
        <TrilhaMotorista motoristaId={motoristaId} />
      )}

      {mostrar("alertas") && (
      <>
      <div className="card" ref={secaoAlertasJornadaRef}>
        <h3 style={{ marginTop: 0 }}>Alertas de jornada (Lei do Motorista)</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Gerados automaticamente a cada ponto batido: direção contínua acima de
          5h/5h30, jornada de trabalho acima do limite do dia e tempo de espera
          em carga/descarga acima do tempo configurado pela empresa.
        </p>
        {/* Mesmo padrão da Rodada 77: "mostrar N por vez" +
            popup dedicado de página quando passar disso, pra essa
            lista nunca crescer sem limite na tela. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 13 }}>
            Mostrar{" "}
            <select
              value={qtdAlertasPorPagina}
              onChange={(e) =>
                onMudarQtdAlertasPorPagina(
                  Number(e.target.value) as 10 | 20 | 50 | 100,
                )
              }
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>{" "}
            por vez
          </label>
          {totalPaginasAlertas > 1 && (
            <Paginador
              pagina={paginaAlertasEfetiva}
              totalPaginas={totalPaginasAlertas}
              onMudarPagina={setPaginaAlertas}
              onAbrirSeletor={() => setPopupPaginacaoAlertasAberto(true)}
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          <FiltrosTratamento
            valor={filtroTratamentoAlertas}
            onMudar={(v) => {
              setFiltroTratamentoAlertas(v);
              setPaginaAlertas(1);
            }}
          />
        </div>
        {erroAlertas && <p style={{ color: "#b91c1c" }}>{erroAlertas}</p>}
        {avisoAlertas && <p style={{ color: "#166534" }}>{avisoAlertas}</p>}
        <BarraTratamentoEmLote
          idsSelecionados={alertasSelecionados}
          onLimpar={() => setAlertasSelecionados([])}
          onConcluido={(msg) => {
            setAlertasSelecionados([]);
            return recarregarAlertas(msg);
          }}
          onErro={setErroAlertas}
        />
        <ListaEmPopup
          ativo={qtdAlertasPorPagina === 100}
          titulo="Alertas do motorista"
          onFechar={() => {
            onMudarQtdAlertasPorPagina(50);
          }}
        >
          <table>
            <thead>
              <tr>
                <th title="Selecionar os alertas de atenção e info desta página para tratar juntos">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos os não críticos desta página"
                    disabled={idsSelecionaveisAlertas.length === 0}
                    checked={
                      idsSelecionaveisAlertas.length > 0 &&
                      idsSelecionaveisAlertas.every((id) =>
                        alertasSelecionados.includes(id),
                      )
                    }
                    onChange={(e) =>
                      setAlertasSelecionados((atual) =>
                        e.target.checked
                          ? [...new Set([...atual, ...idsSelecionaveisAlertas])]
                          : atual.filter(
                              (id) => !idsSelecionaveisAlertas.includes(id),
                            ),
                      )
                    }
                  />
                </th>
                <th>Severidade</th>
                <th>Alerta</th>
                <th>Janela</th>
                <th>Duração</th>
                <th>Quando</th>
                <th>Tratamento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alertasExibidos.map((a) => (
                <Fragment key={a.id}>
                  <tr style={{ opacity: a.tratadoEm ? 0.6 : 1 }}>
                    <td>
                      {alertaPodeTratarEmLote(a) && (
                        <input
                          type="checkbox"
                          aria-label="Selecionar para tratar junto"
                          checked={alertasSelecionados.includes(a.id)}
                          onChange={() =>
                            setAlertasSelecionados((atual) =>
                              atual.includes(a.id)
                                ? atual.filter((x) => x !== a.id)
                                : [...atual, a.id],
                            )
                          }
                        />
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          color:
                            a.severidade === "CRITICO"
                              ? "#b91c1c"
                              : a.severidade === "ATENCAO"
                                ? "#b45309"
                                : "#000",
                          fontWeight: 600,
                        }}
                      >
                        {rotuloSeveridade(a.severidade)}
                      </span>
                    </td>
                    <td>{renderizarHorarios(a.mensagem)}</td>
                    <td>
                      {new Date(a.janelaInicio).toLocaleString("pt-BR")} →{" "}
                      {new Date(a.janelaFim).toLocaleString("pt-BR")}
                    </td>
                    <td>{formatarMinutos(a.minutosAcumulados)}</td>
                    <td>{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                    <td>
                      {a.tratadoEm ? (
                        <span style={{ color: "#166534", fontSize: 12 }}>
                          ✓ tratado em{" "}
                          {new Date(a.tratadoEm).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12 }}>pendente</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          setAlertaExpandidoId(
                            alertaExpandidoId === a.id ? null : a.id,
                          )
                        }
                      >
                        {alertaExpandidoId === a.id
                          ? "Fechar"
                          : a.tratadoEm
                            ? "Ver"
                            : "Tratar"}
                      </button>
                    </td>
                  </tr>
                  {alertaExpandidoId === a.id && (
                    <tr>
                      <td colSpan={8} style={{ background: "#f9fafb" }}>
                        <div style={{ padding: "12px 16px" }}>
                          {a.tratadoEm ? (
                            <div style={{ fontSize: 13 }}>
                              <strong>Observação de quem tratou:</strong>{" "}
                              {a.tratamentoObservacao}
                              <div style={{ marginTop: 4 }}>
                                Tratado em{" "}
                                {new Date(a.tratadoEm).toLocaleString("pt-BR")}
                              </div>
                            </div>
                          ) : (
                            <FormularioTratamentoAlerta
                              alerta={a}
                              onConcluido={() => recarregarAlertas()}
                              onErro={setErroAlertas}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {alertas.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ color: "#000000" }}>
                    Nenhum alerta encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ListaEmPopup>
        {popupPaginacaoAlertasAberto && (
          <PaginacaoPopup
            paginaAtual={paginaAlertasEfetiva}
            totalPaginas={totalPaginasAlertas}
            onSelecionarPagina={setPaginaAlertas}
            onFechar={() => setPopupPaginacaoAlertasAberto(false)}
          />
        )}
      </div>

      </>
      )}

      {somente === "tratamento" && motorista && (
        <TratamentoPontoColaborador
          motoristaId={motoristaId}
          motorista={motorista}
          registros={registros}
          tratamentos={tratamentos}
          carregando={carregando}
          onAtualizar={() => carregarTudo()}
        />
      )}

      {readmissaoAberta && motorista && (
        <RescisaoPopup
          modo="readmissao"
          nome={motorista.nome}
          dataMinima={motorista.dataDesligamento}
          salvando={alterandoStatus}
          erro={erroRescisao}
          onConfirmar={onConfirmarReadmissao}
          onFechar={() => setReadmissaoAberta(false)}
        />
      )}

      {rescisaoAberta && motorista && (
        <RescisaoPopup
          nome={motorista.nome}
          dataAdmissao={motorista.dataAdmissao}
          salvando={alterandoStatus}
          erro={erroRescisao}
          onConfirmar={onConfirmarRescisao}
          onFechar={() => setRescisaoAberta(false)}
        />
      )}

      {somente === "relatorio" && motorista && (
        <RelatorioHorasColaborador
          motoristaId={motoristaId}
          motorista={motorista}
          alertas={alertas}
        />
      )}
    </div>
  );
}
