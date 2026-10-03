import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { usePrompt } from "../components/PromptProvider";
import {
  atualizarCadastroMotorista,
  atualizarStatusMotorista,
  excluirMotorista,
  getMotorista,
  listarAlertasIntegridadeDispositivo,
} from "../api/motoristas";
import type { AlertaIntegridadeDispositivo } from "../api/motoristas";
import {
  revogarDispositivo,
  statusDispositivo,
  vincularDispositivo,
} from "../api/dispositivos";
import {
  atualizarVeiculo,
  listarTrocasVeiculo,
  statusVeiculo,
} from "../api/veiculos";
import type {
  AtualizarVeiculoInput,
  TrocaVeiculoAuditoria,
  VeiculoVinculado,
} from "../api/veiculos";
import {
  aceitarDivergenciaIntegridade,
  baixarAej,
  baixarComprovante,
  baixarEspelhoRepP,
  listRegistros,
  listarViagens,
  verificarIntegridade,
} from "../api/registros";
import type { ViagemConsolidada } from "../api/registros";
import {
  anexarEvidenciaTratamento,
  baixarEvidenciaTratamento,
  createTratamento,
  listTratamentos,
  obterUrlEvidenciaTratamento,
} from "../api/tratamentos";
import { EvidenciasAnexo } from "../components/EvidenciasAnexo";
import { PaginacaoPopup } from "../components/PaginacaoPopup";
import { TelefoneInput } from "../components/TelefoneInput";
import { baixarHoleritePdf, calcularHolerite } from "../api/holerite";
import { BancoHorasPainel } from "../components/BancoHorasPainel";
import type { OpcoesHolerite, ResultadoHolerite } from "../api/holerite";
import {
  listAlertasByMotorista,
  marcarAlertaVisualizado,
} from "../api/alertas";
import { listarAutorrelatosFolga } from "../api/autorrelatoFolga";
import type { AutorrelatoFolga } from "../api/autorrelatoFolga";
import { concederFolga, listarFolgasConcedidas } from "../api/folgaConcedida";
import type { FolgaConcedida } from "../api/folgaConcedida";
import {
  listarDocumentosCargaPorMotorista,
  statusAtualCargaPorMotorista,
} from "../api/documentosCarga";
import type { DocumentoCarga, StatusAtualCarga } from "../api/documentosCarga";
import type {
  AlertaJornada,
  DispositivoStatus,
  Motorista,
  RegistroJornada,
  StatusMotorista,
  TipoEvento,
  TratamentoPonto,
  VerificacaoIntegridade,
} from "../api/types";
import { TIPOS_EVENTO } from "../api/types";

function gerarUuid() {
  return crypto.randomUUID();
}

// Rodada 88 , pedido do usuário: o gestor tentou corrigir um evento
// problemático pelo campo "Registro de referência", mas esse campo
// nunca preenchia "Horário considerado" , o gestor acabou deixando o
// horário atual (agora) ali, achando que estava corrigindo o registro
// original. Isso NUNCA funciona: TratamentoPonto é aditivo (nunca
// substitui o RegistroJornada original, que é WORM/imutável) , um
// ajuste datado de "agora" só entra no fim da linha do tempo, não
// conserta nada no meio dela. Pré-preencher com o horário do registro
// escolhido dá um ponto de partida correto (o gestor ainda pode
// ajustar minutos pra frente/trás, mas não parte mais de "agora").
function formatarParaInputDatetimeLocal(data: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}`
  );
}

export function MotoristaDetailPage() {
  const { motoristaId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  // Rodada 77 , pedido do usuário: essa lista não pode crescer sem
  // limite na tela. "Mostrar N por vez" (10/20/50) + popup dedicado de
  // paginação quando passar disso (ver `PaginacaoPopup`).
  const [qtdTratamentosPorPagina, setQtdTratamentosPorPagina] = useState<
    10 | 20 | 50
  >(10);
  const [paginaTratamentos, setPaginaTratamentos] = useState(1);
  const [popupPaginacaoTratamentosAberto, setPopupPaginacaoTratamentosAberto] =
    useState(false);
  const [alertas, setAlertas] = useState<AlertaJornada[]>([]);
  // Rodada 107 , pedido do usuário: mesmo padrão da Rodada 77
  // (tratamentos de ponto) aplicado aqui , essa lista também não pode
  // crescer sem limite na tela. "Mostrar N por vez" (10/20/50/100) +
  // popup dedicado de paginação quando passar disso.
  const [qtdAlertasPorPagina, setQtdAlertasPorPagina] = useState<
    10 | 20 | 50 | 100
  >(10);
  const [paginaAlertas, setPaginaAlertas] = useState(1);
  const [popupPaginacaoAlertasAberto, setPopupPaginacaoAlertasAberto] =
    useState(false);
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
  const [placaForm, setPlacaForm] = useState("");
  const [idRastreadorForm, setIdRastreadorForm] = useState("");
  const [tecnologiaForm, setTecnologiaForm] = useState("");
  const [atualizandoVeiculo, setAtualizandoVeiculo] = useState(false);
  const [erroVeiculo, setErroVeiculo] = useState<string | null>(null);

  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("FIM_JORNADA");
  const [timestampEvento, setTimestampEvento] = useState("");
  const [motivo, setMotivo] = useState("");
  const [registroReferenciaId, setRegistroReferenciaId] = useState("");
  const [lancandoTratamento, setLancandoTratamento] = useState(false);
  const [erroTratamento, setErroTratamento] = useState<string | null>(null);
  // Rodada 79 , pedido do usuário: anexar evidência é escolhido JUNTO do
  // lançamento (adicionar/tirar antes de enviar), não depois , os
  // arquivos ficam só na memória do navegador até o "Lançar tratamento"
  // ser enviado, quando são subidos em seguida (o backend exige que o
  // tratamento já exista pra vincular a evidência a ele).
  const [evidenciasParaAnexar, setEvidenciasParaAnexar] = useState<File[]>([]);

  const [dataFolga, setDataFolga] = useState("");
  const [motivoFolga, setMotivoFolga] = useState("");
  const [concedendoFolga, setConcedendoFolga] = useState(false);
  const [erroFolga, setErroFolga] = useState<string | null>(null);

  const [qtdJornadasPorPagina, setQtdJornadasPorPagina] = useState(7);
  const [qtdJornadasExibidas, setQtdJornadasExibidas] = useState(7);

  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  const [editandoCadastro, setEditandoCadastro] = useState(false);
  const [nomeEdit, setNomeEdit] = useState("");
  const [telefoneEdit, setTelefoneEdit] = useState("");
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);

  const [holeriteInicio, setHoleriteInicio] = useState("");
  const [holeriteFim, setHoleriteFim] = useState("");
  const [holeriteDirecaoEspera, setHoleriteDirecaoEspera] = useState(true);
  const [holeriteNormalExtra, setHoleriteNormalExtra] = useState(true);
  const [holeriteAdicionalNoturno, setHoleriteAdicionalNoturno] =
    useState(true);
  const [holeritePrevia, setHoleritePrevia] =
    useState<ResultadoHolerite | null>(null);
  const [gerandoHolerite, setGerandoHolerite] = useState(false);
  const [baixandoHolerite, setBaixandoHolerite] = useState(false);
  const [erroHolerite, setErroHolerite] = useState<string | null>(null);

  async function onBaixarComprovante() {
    setBaixandoComprovante(true);
    try {
      await baixarComprovante(motoristaId);
    } finally {
      setBaixandoComprovante(false);
    }
  }

  async function onBaixarAej() {
    setBaixandoAej(true);
    try {
      await baixarAej(motoristaId);
    } finally {
      setBaixandoAej(false);
    }
  }

  async function onBaixarEspelhoRepP() {
    setBaixandoEspelhoRepP(true);
    try {
      await baixarEspelhoRepP(motoristaId);
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
  // em si (Rodada 16) não é mais por gap de tempo , é pelo(s) CT-e que
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

  // Rodada 70 , pedido do usuário: cada linha aqui é uma JORNADA (um
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

  const jornadasDiariasExibidas = jornadasDiariasOrdenadas.slice(
    0,
    qtdJornadasExibidas,
  );

  // Rodada 77 , pedido do usuário: salvar algo nesta tela (lançar um
  // tratamento, anexar evidência, editar cadastro, trocar veículo,
  // vincular/revogar dispositivo etc.) não pode "piscar" a página
  // inteira pro topo. Antes, TODA chamada de `carregarTudo()`
  // (inclusive as de depois de salvar) ligava `carregando`, e o
  // retorno antecipado no fim do componente (`if (carregando ||
  // !motorista) return <p>Carregando...</p>`) desmontava a tela
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

  async function onVisualizarAlerta(alertaId: string) {
    await marcarAlertaVisualizado(alertaId);
    setAlertas((prev) =>
      prev.map((a) =>
        a.id === alertaId
          ? { ...a, visualizadoEm: new Date().toISOString() }
          : a,
      ),
    );
  }

  useEffect(() => {
    carregarTudo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoristaId]);

  async function onVincular(e: FormEvent) {
    e.preventDefault();
    setVinculando(true);
    try {
      const resp = await vincularDispositivo(
        motoristaId,
        novaDeviceUuid || gerarUuid(),
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
          : (msg ??
            "Não foi possível salvar (placa em formato inválido)."),
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
      await aceitarDivergenciaIntegridade(motoristaId, sequencial, motivo.trim());
      setIntegridade(await verificarIntegridade(motoristaId));
    } finally {
      setAceitandoDivergencia(null);
    }
  }

  const MAXIMO_EVIDENCIAS_POR_TRATAMENTO = 4;
  const TAMANHO_MAXIMO_EVIDENCIA_BYTES = 25 * 1024 * 1024;

  /** Escolher arquivo no formulário só guarda na memória , nada sobe ainda (ver comentário do state). */
  function onEscolherEvidenciaParaAnexar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroTratamento(null);
    if (evidenciasParaAnexar.length >= MAXIMO_EVIDENCIAS_POR_TRATAMENTO) {
      setErroTratamento(
        `Limite de ${MAXIMO_EVIDENCIAS_POR_TRATAMENTO} evidências por tratamento.`,
      );
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_EVIDENCIA_BYTES) {
      setErroTratamento("Arquivo muito grande, o limite é 25MB por imagem.");
      return;
    }
    setEvidenciasParaAnexar((atual) => [...atual, arquivo]);
  }

  function onTirarEvidenciaParaAnexar(indice: number) {
    setEvidenciasParaAnexar((atual) => atual.filter((_, i) => i !== indice));
  }

  async function onLancarTratamento(e: FormEvent) {
    e.preventDefault();
    setErroTratamento(null);
    setLancandoTratamento(true);
    try {
      const novoTratamento = await createTratamento(motoristaId, {
        tipoEvento,
        timestampEvento: new Date(timestampEvento).toISOString(),
        motivo,
        registroReferenciaId: registroReferenciaId || undefined,
      });

      // Rodada 79: evidências escolhidas no formulário sobem logo em
      // seguida, já vinculadas a este tratamento recém-criado , o
      // motorista/gestor não precisa mais achar a linha na tabela
      // depois pra anexar. Se alguma falhar, o tratamento já foi
      // lançado (não tem como desfazer só por causa da evidência), mas
      // o aviso deixa claro quantas não subiram.
      let falhasEvidencia = 0;
      for (const arquivo of evidenciasParaAnexar) {
        try {
          await anexarEvidenciaTratamento(
            motoristaId,
            novoTratamento.id,
            arquivo,
          );
        } catch {
          falhasEvidencia++;
        }
      }

      setMotivo("");
      setRegistroReferenciaId("");
      setEvidenciasParaAnexar([]);
      await carregarTudo();

      if (falhasEvidencia > 0) {
        setErroTratamento(
          `Tratamento lançado, mas ${falhasEvidencia} evidência(s) não subiram. Confira sua internet e lance um novo tratamento anexando de novo se precisar da prova.`,
        );
      }
    } catch {
      setErroTratamento(
        "Não foi possível lançar (motivo precisa ter pelo menos 10 caracteres).",
      );
    } finally {
      setLancandoTratamento(false);
    }
  }

  // Rodada 77 , mais recentes primeiro (mesmo critério de leitura de
  // "o que aconteceu por último"), fatiado pelo "mostrar N por vez".
  const tratamentosOrdenados = [...tratamentos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const totalPaginasTratamentos = Math.max(
    1,
    Math.ceil(tratamentosOrdenados.length / qtdTratamentosPorPagina),
  );
  const paginaTratamentosEfetiva = Math.min(
    paginaTratamentos,
    totalPaginasTratamentos,
  );
  const tratamentosExibidos = tratamentosOrdenados.slice(
    (paginaTratamentosEfetiva - 1) * qtdTratamentosPorPagina,
    paginaTratamentosEfetiva * qtdTratamentosPorPagina,
  );

  function onMudarQtdTratamentosPorPagina(qtd: 10 | 20 | 50) {
    setQtdTratamentosPorPagina(qtd);
    setPaginaTratamentos(1);
  }

  // Rodada 107 , mais recentes primeiro (mesmo critério da Rodada 77),
  // fatiado pelo "mostrar N por vez".
  const alertasOrdenados = [...alertas].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const totalPaginasAlertas = Math.max(
    1,
    Math.ceil(alertasOrdenados.length / qtdAlertasPorPagina),
  );
  const paginaAlertasEfetiva = Math.min(paginaAlertas, totalPaginasAlertas);
  const alertasExibidos = alertasOrdenados.slice(
    (paginaAlertasEfetiva - 1) * qtdAlertasPorPagina,
    paginaAlertasEfetiva * qtdAlertasPorPagina,
  );

  function onMudarQtdAlertasPorPagina(qtd: 10 | 20 | 50 | 100) {
    setQtdAlertasPorPagina(qtd);
    setPaginaAlertas(1);
  }

  // Rodada 107 , pedido do usuário: "deixe os [registros] que chegou
  // por último como o primeiro da listagem". `sequencial` é a ordem
  // real de chegada no ledger WORM (ver registros-jornada.service.ts),
  // critério melhor que `timestampEvento` (que é só o relógio do
  // aparelho no momento do evento, não quando ele de fato chegou/foi
  // processado no servidor).
  const registrosOrdenados = [...registros].sort(
    (a, b) => b.sequencial - a.sequencial,
  );

  const opcoesHolerite: OpcoesHolerite = {
    direcaoEspera: holeriteDirecaoEspera,
    normalExtra: holeriteNormalExtra,
    adicionalNoturno: holeriteAdicionalNoturno,
  };

  async function onGerarPreviaHolerite(e: FormEvent) {
    e.preventDefault();
    setErroHolerite(null);
    setGerandoHolerite(true);
    try {
      const resultado = await calcularHolerite(
        motoristaId,
        new Date(holeriteInicio).toISOString(),
        new Date(holeriteFim).toISOString(),
        opcoesHolerite,
      );
      setHoleritePrevia(resultado);
    } catch {
      setErroHolerite(
        "Não foi possível calcular o holerite (confira o período escolhido).",
      );
    } finally {
      setGerandoHolerite(false);
    }
  }

  async function onBaixarHolerite() {
    if (!motorista) return;
    setBaixandoHolerite(true);
    try {
      await baixarHoleritePdf(
        motoristaId,
        motorista.nome,
        new Date(holeriteInicio).toISOString(),
        new Date(holeriteFim).toISOString(),
        opcoesHolerite,
      );
    } finally {
      setBaixandoHolerite(false);
    }
  }

  function formatarHorasHolerite(minutos: number) {
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${h}h${String(m).padStart(2, "0")}`;
  }

  // `d.dia` vem como "AAAA-MM-DD" (chave interna do backend, usada pra
  // ordenar) , exibir isso direto saía com a data "invertida" pro
  // padrão brasileiro (Rodada 80, pedido do usuário). Só formata na
  // exibição, sem mexer na chave.
  function formatarDiaHoleriteBr(diaIso: string) {
    const [ano, mes, dia] = diaIso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  async function onConcederFolga(e: FormEvent) {
    e.preventDefault();
    setErroFolga(null);
    setConcedendoFolga(true);
    try {
      await concederFolga(motoristaId, {
        data: dataFolga,
        motivo: motivoFolga || undefined,
      });
      setDataFolga("");
      setMotivoFolga("");
      await carregarTudo();
    } catch {
      setErroFolga(
        "Não foi possível conceder a folga (confira se já não existe uma folga concedida para esse dia).",
      );
    } finally {
      setConcedendoFolga(false);
    }
  }

  if (carregando || !motorista) return <p>Carregando...</p>;

  async function onCopiarIdMotorista() {
    await navigator.clipboard.writeText(motorista!.id);
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
      });
      setMotorista((prev) =>
        prev
          ? { ...prev, nome: atualizado.nome, telefone: atualizado.telefone }
          : prev,
      );
      setEditandoCadastro(false);
    } catch {
      setErroCadastro(
        "Não foi possível salvar os dados cadastrais (verifique o nome e o telefone).",
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
   * "Excluir cadastro" (Rodada 65) , pedido explícito do usuário:
   * diferente de INATIVO/SUSPENSO acima, isto tira o motorista da
   * listagem normal do painel (ver MotoristasListPage). Continua sendo
   * um soft-delete: nada é apagado de verdade, e nome/CPF continuam
   * achável pela busca com "mostrar excluídos" marcado , todo o
   * histórico (registros de jornada, alertas, folgas, documentos de
   * carga) permanece intacto e visível aqui mesmo depois de excluído.
   */
  async function onExcluirCadastro() {
    const confirmacao = await prompt(
      `Excluir o cadastro de ${motorista!.nome}? Isto tira ele da listagem normal do painel e revoga o dispositivo vinculado agora. Nada do histórico é apagado, continua tudo aqui e encontrável pela busca. Para confirmar, digite EXCLUIR:`,
      { titulo: "Excluir cadastro", perigo: true, textoConfirmar: "Excluir" },
    );
    if (confirmacao !== "EXCLUIR") return;
    const motivo =
      (await prompt("Motivo da exclusão (opcional):", {
        titulo: "Excluir cadastro",
        placeholder: "Motivo (opcional)",
        multilinha: true,
      })) ?? undefined;
    setAlterandoStatus(true);
    setErroStatus(null);
    try {
      await excluirMotorista(motoristaId, motivo || undefined);
      navigate("/motoristas");
    } catch {
      setErroStatus("Não foi possível excluir o cadastro.");
      setAlterandoStatus(false);
    }
  }

  return (
    <div>
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
              CPF e CNH não podem ser editados aqui, pois são a âncora da cadeia
              de hash e do certificado digital do motorista. Em caso de erro de
              digitação, é preciso excluir e recadastrar (o histórico não se
              perde).
            </p>

            <label style={{ marginTop: 8, display: "block" }}>
              Telefone de contato
            </label>
            <TelefoneInput
              value={telefoneEdit}
              onChange={setTelefoneEdit}
              required
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
            CPF {motorista.cpf}
            {motorista.telefone && <> · {motorista.telefone}</>} ·{" "}
            <span
              style={{
                color:
                  motorista.status === "ATIVO"
                    ? "#166534"
                    : motorista.status === "SUSPENSO"
                      ? "#b45309"
                      : "#6b7280",
                fontWeight: 600,
              }}
            >
              status {motorista.status}
            </span>{" "}
            <button
              type="button"
              onClick={onIniciarEdicaoCadastro}
              style={{ fontSize: 12, marginLeft: 8 }}
            >
              Editar
            </button>
            {motorista.status !== "ATIVO" && (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={() => onAlterarStatus("ATIVO")}
                style={{ fontSize: 12, marginLeft: 8 }}
              >
                Reativar
              </button>
            )}
            {motorista.status !== "SUSPENSO" && (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={() => onAlterarStatus("SUSPENSO")}
                style={{ fontSize: 12, marginLeft: 8 }}
              >
                Suspender
              </button>
            )}
            {motorista.status !== "INATIVO" && (
              <button
                type="button"
                disabled={alterandoStatus}
                onClick={() => onAlterarStatus("INATIVO")}
                style={{ fontSize: 12, marginLeft: 8 }}
              >
                Inativar (arquivo morto)
              </button>
            )}
            {!motorista.excluidoEm && (
              <button
                type="button"
                className="danger"
                disabled={alterandoStatus}
                onClick={onExcluirCadastro}
                style={{ fontSize: 12, marginLeft: 8 }}
              >
                Excluir cadastro
              </button>
            )}
            {erroStatus && (
              <span style={{ color: "#b91c1c", fontSize: 12, marginLeft: 8 }}>
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
        </div>
      )}

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
            style={{ fontSize: 12, padding: "2px 8px" }}
          >
            Copiar
          </button>
        </p>

        {dispositivo?.deviceUuid ? (
          <>
            <p>
              Aparelho atual: <code>{dispositivo.deviceUuid}</code>
              <br />
              Vinculado em{" "}
              {new Date(dispositivo.vinculadoEm!).toLocaleString("pt-BR")}
            </p>
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
            UUID do aparelho (deixe em branco para gerar um de teste)
          </label>
          <input
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
            <p style={{ fontSize: 12, color: "#92400e" }}>
              Copie e grave no app do motorista agora. Depois de sair desta
              tela, não é possível recuperar.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Veículo de tração vinculado</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Placa do cavalo mecânico (o veículo que puxa a carga, não o
          reboque/carreta), obrigatória. O motorista também pode trocar direto
          pelo app; toda troca de placa (não o primeiro cadastro) fica
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
                {integridade.divergencias.map((d) => (
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
                      .
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
                        {new Date(d.aceite.aceitoEm).toLocaleString("pt-BR")}.
                        Motivo: {d.aceite.motivo}
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
            ⚠ Aparelho suspeito
          </h3>
          <p style={{ fontSize: 13, color: "#000000" }}>
            O app detectou sinais de comprometimento do aparelho
            (root/jailbreak, hooking, ou &quot;mock location&quot; habilitado)
            no momento de algum ponto batido. Isso não bloqueou o registro, é só
            um sinal pra você investigar (o odômetro/GPS daquele ponto merece
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

      {trocasVeiculo.length > 0 && (
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
            {trocasVeiculo.map((t) => (
              <li key={t.id}>
                {new Date(t.createdAt).toLocaleString("pt-BR")}:{" "}
                {t.detalhes?.placaAnterior ?? ","} →{" "}
                {t.detalhes?.placaNova ?? ","} (por{" "}
                {t.actorType === "MOTORISTA" ? "motorista" : "painel"})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Registros de jornada</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onBaixarComprovante}
              disabled={baixandoComprovante}
            >
              {baixandoComprovante ? "Gerando..." : "Baixar comprovante (PDF)"}
            </button>
            <button
              onClick={onBaixarAej}
              disabled={baixandoAej}
              title="Export estruturado com todos os campos legalmente relevantes. Não é o layout binário oficial do AFD/Portaria 671, ver ARCHITECTURE.md §16"
            >
              {baixandoAej ? "Gerando..." : "Baixar AEJ (CSV)"}
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
            {registrosOrdenados.map((r) => (
              <tr key={r.id}>
                <td>{r.sequencial}</td>
                <td>{r.tipoEvento}</td>
                <td>{new Date(r.timestampEvento).toLocaleString("pt-BR")}</td>
                <td style={{ fontSize: 11 }}>{r.deviceUuidUsado}</td>
                <td>
                  {r.latitude != null && r.longitude != null ? (
                    <button
                      type="button"
                      className="botao-link-externo"
                      title={`${r.latitude}, ${r.longitude}${r.precisaoGpsM != null ? ` (±${Math.round(Number(r.precisaoGpsM))}m)` : ""}`}
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Ver no mapa
                    </button>
                  ) : (
                    <span style={{ color: "#000000" }}>,</span>
                  )}
                </td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "#000000" }}>
                  Nenhum registro ainda (o motorista bate ponto pelo app).
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
        <p style={{ fontSize: 13, color: "#000000" }}>
          Uma linha por JORNADA (um par início/fim de jornada), não por
          dia-calendário. É normal, e legalmente relevante, o motorista abrir e
          fechar jornada mais de uma vez na mesma data: quando isso acontece,
          cada linha daquela data recebe o selo &quot;1ª/2ª jornada do dia&quot;
          pra deixar claro que são jornadas distintas, não uma duplicação. O que
          agrupa jornadas na mesma viagem não é mais um intervalo de tempo entre
          elas: é o(s) CT-e que o motorista carrega. A viagem começa quando o 1º
          CT-e é vinculado a ele e só termina quando todos os CT-e daquele grupo
          forem entregues (um CT-e novo vinculado antes disso entra na mesma
          viagem). A coluna &quot;Viagem&quot; mostra em qual jornada dela cada
          linha está (ex.: 2/3 é a 2ª jornada de uma viagem com 3 jornadas); a
          coluna &quot;CT-e&quot; mostra qual(is) CT-e definiram o agrupamento.
          Uma jornada sem nenhum CT-e vinculado no período vira viagem avulsa
          (1/1).
        </p>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Duração da jornada</th>
              <th>Direção</th>
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
                    {/* Rodada 69 , pedido do usuário: enquanto a jornada
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
                  <td>{formatarMinutos(j.totalEsperaMin)}</td>
                  <td>
                    {j.totalDiasViagem > 1
                      ? `${j.diaDaViagem}/${j.totalDiasViagem}`
                      : ","}
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
                <td colSpan={8} style={{ color: "#000000" }}>
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
      </div>

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

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Folgas autorrelatadas</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Avisadas pelo próprio motorista no app, não são ponto, só explicam pra
          você dias sem registro.
        </p>
        <ul style={{ fontSize: 13 }}>
          {folgas.map((f) => (
            <li key={f.id}>
              {new Date(f.data).toLocaleDateString("pt-BR")}
              {f.observacao && `: ${f.observacao}`}
            </li>
          ))}
          {folgas.length === 0 && (
            <li style={{ color: "#000000", listStyle: "none" }}>
              Nenhuma folga autorrelatada.
            </li>
          )}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Folgas concedidas pelo RH</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Lançada pelo RH/gestor. Num dia futuro, o motorista simplesmente não
          precisa bater ponto. Num dia que já tem registro de ponto, nada é
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
          <input
            type="text"
            value={motivoFolga}
            onChange={(e) => setMotivoFolga(e.target.value)}
            maxLength={500}
          />
          {erroFolga && <p className="error-text">{erroFolga}</p>}
          <button type="submit" disabled={concedendoFolga}>
            {concedendoFolga ? "Concedendo..." : "Conceder folga"}
          </button>
        </form>

        <ul style={{ fontSize: 13, marginTop: 16 }}>
          {folgasConcedidas.map((f) => (
            <li key={f.id}>
              {new Date(f.data).toLocaleDateString("pt-BR")}
              {f.motivo && `: ${f.motivo}`}
              {f.concedidaPorUsuario &&
                ` (concedida por ${f.concedidaPorUsuario.nome})`}
            </li>
          ))}
          {folgasConcedidas.length === 0 && (
            <li style={{ color: "#000000", listStyle: "none" }}>
              Nenhuma folga concedida.
            </li>
          )}
        </ul>
      </div>

      <div className="card" ref={secaoAlertasJornadaRef}>
        <h3 style={{ marginTop: 0 }}>Alertas de jornada (Lei do Motorista)</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Gerados automaticamente a cada ponto batido: direção contínua acima de
          5h/5h30, jornada de direção acima de 8h/10h no dia, e tempo de espera
          em carga/descarga (3h / 4h45 / 5h, limiar legal para diária de
          espera).
        </p>
        {/* Rodada 107 , mesmo padrão da Rodada 77: "mostrar N por vez" +
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
            <button
              type="button"
              className="secondary"
              style={{ fontSize: 13 }}
              onClick={() => setPopupPaginacaoAlertasAberto(true)}
            >
              Página {paginaAlertasEfetiva} de {totalPaginasAlertas}, trocar
              página
            </button>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Severidade</th>
              <th>Alerta</th>
              <th>Janela</th>
              <th>Duração</th>
              <th>Quando</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {alertasExibidos.map((a) => (
              <tr key={a.id} style={{ opacity: a.visualizadoEm ? 0.55 : 1 }}>
                <td>
                  <span
                    style={{
                      color:
                        a.severidade === "CRITICO"
                          ? "#b91c1c"
                          : a.severidade === "ATENCAO"
                            ? "#b45309"
                            : "#374151",
                      fontWeight: 600,
                    }}
                  >
                    {a.severidade}
                  </span>
                </td>
                <td>{a.mensagem}</td>
                <td>
                  {new Date(a.janelaInicio).toLocaleString("pt-BR")} →{" "}
                  {new Date(a.janelaFim).toLocaleString("pt-BR")}
                </td>
                <td>{formatarMinutos(a.minutosAcumulados)}</td>
                <td>{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                  {!a.visualizadoEm && (
                    <button onClick={() => onVisualizarAlerta(a.id)}>
                      Marcar visto
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {alertas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "#000000" }}>
                  Nenhum alerta gerado até agora.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {popupPaginacaoAlertasAberto && (
          <PaginacaoPopup
            paginaAtual={paginaAlertasEfetiva}
            totalPaginas={totalPaginasAlertas}
            onSelecionarPagina={setPaginaAlertas}
            onFechar={() => setPopupPaginacaoAlertasAberto(false)}
          />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Tratamento de ponto</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Lançado pelo RH/gestor quando o motorista esquece de bater um evento.
          Não altera nenhum registro, é só informativo, entra na conferência da
          folha de ponto.
        </p>
        <form onSubmit={onLancarTratamento}>
          <label>Evento</label>
          <select
            value={tipoEvento}
            onChange={(e) => setTipoEvento(e.target.value as TipoEvento)}
          >
            {TIPOS_EVENTO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label>Horário considerado</label>
          <input
            type="datetime-local"
            value={timestampEvento}
            onChange={(e) => setTimestampEvento(e.target.value)}
            required
          />
          <label>Registro de referência (opcional)</label>
          <select
            value={registroReferenciaId}
            onChange={(e) => {
              const id = e.target.value;
              setRegistroReferenciaId(id);
              // Rodada 88 , sugere o horário do registro escolhido como ponto
              // de partida (o gestor ainda pode ajustar) em vez de deixar
              // "Horário considerado" do jeito que estava (frequentemente
              // vazio ou com "agora", que nunca corrige nada , ver comentário
              // de formatarParaInputDatetimeLocal acima).
              const registro = registros.find((r) => r.id === id);
              if (registro) {
                setTimestampEvento(
                  formatarParaInputDatetimeLocal(
                    new Date(registro.timestampEvento),
                  ),
                );
              }
            }}
          >
            <option value="">Nenhum</option>
            {registrosOrdenados.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.sequencial} · {r.tipoEvento} ·{" "}
                {new Date(r.timestampEvento).toLocaleString("pt-BR")}
              </option>
            ))}
          </select>
          {registroReferenciaId && (
            <p style={{ fontSize: 12, color: "#000000", marginTop: -4 }}>
              "Horário considerado" foi sugerido a partir do registro escolhido.
              Ajuste os minutos/segundos pro horário real que este evento
              deveria ter, se precisar. Isso NÃO altera o registro original (ele
              é permanente); só adiciona este ajuste à conferência da folha.
            </p>
          )}
          <label>Motivo (mínimo 10 caracteres)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            required
            minLength={10}
          />

          {/* Rodada 79 , pedido do usuário: anexar evidência (adicionar/
              tirar) acontece AQUI, junto do lançamento , depois de
              lançado, o tratamento só permite abrir/ver a imagem (ver
              tabela abaixo, sem opção de anexar nem remover). */}
          <label>
            Evidências (opcional, até {MAXIMO_EVIDENCIAS_POR_TRATAMENTO})
          </label>
          {evidenciasParaAnexar.length > 0 && (
            <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 13 }}>
              {evidenciasParaAnexar.map((arquivo, indice) => (
                <li
                  key={`${arquivo.name}-${indice}`}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  {arquivo.name}
                  <button
                    type="button"
                    className="secondary"
                    style={{ fontSize: 11, padding: "2px 6px" }}
                    onClick={() => onTirarEvidenciaParaAnexar(indice)}
                  >
                    Tirar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {evidenciasParaAnexar.length < MAXIMO_EVIDENCIAS_POR_TRATAMENTO && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                onEscolherEvidenciaParaAnexar(e.target.files?.[0]);
                e.target.value = "";
              }}
              style={{ fontSize: 12 }}
            />
          )}

          {erroTratamento && <p className="error-text">{erroTratamento}</p>}
          <button type="submit" disabled={lancandoTratamento}>
            {lancandoTratamento ? "Lançando..." : "Lançar tratamento"}
          </button>
        </form>

        {/* Rodada 77 , "mostrar N por vez" + popup dedicado de página
            quando passar disso, pra essa lista nunca crescer sem
            limite na tela. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 13 }}>
            Mostrar{" "}
            <select
              value={qtdTratamentosPorPagina}
              onChange={(e) =>
                onMudarQtdTratamentosPorPagina(
                  Number(e.target.value) as 10 | 20 | 50,
                )
              }
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>{" "}
            por vez
          </label>
          {totalPaginasTratamentos > 1 && (
            <button
              type="button"
              className="secondary"
              style={{ fontSize: 13 }}
              onClick={() => setPopupPaginacaoTratamentosAberto(true)}
            >
              Página {paginaTratamentosEfetiva} de {totalPaginasTratamentos},
              trocar página
            </button>
          )}
        </div>

        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Horário</th>
              <th>Motivo</th>
              <th>Lançado por</th>
              <th>Quando</th>
              <th>Evidências (prova do fechamento)</th>
            </tr>
          </thead>
          <tbody>
            {tratamentosExibidos.map((t) => (
              <tr key={t.id}>
                <td>{t.tipoEvento}</td>
                <td>{new Date(t.timestampEvento).toLocaleString("pt-BR")}</td>
                <td>{t.motivo}</td>
                <td>{t.usuario?.nome ?? t.usuarioId}</td>
                <td>{new Date(t.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                  {/* Rodada 79 , pedido do usuário: depois de lançado, evidência
                      é só pra abrir/ver (sem `remover`, sem input de anexar ,
                      isso agora só acontece no formulário, antes de lançar). */}
                  <EvidenciasAnexo
                    evidencias={t.evidencias ?? []}
                    obterUrl={(evidenciaId) =>
                      obterUrlEvidenciaTratamento(motoristaId, evidenciaId)
                    }
                    baixar={(evidenciaId, nomeArquivo) =>
                      baixarEvidenciaTratamento(
                        motoristaId,
                        evidenciaId,
                        nomeArquivo,
                      )
                    }
                  />
                </td>
              </tr>
            ))}
            {tratamentos.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "#000000" }}>
                  Nenhum tratamento lançado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {popupPaginacaoTratamentosAberto && (
          <PaginacaoPopup
            paginaAtual={paginaTratamentosEfetiva}
            totalPaginas={totalPaginasTratamentos}
            onSelecionarPagina={setPaginaTratamentos}
            onFechar={() => setPopupPaginacaoTratamentosAberto(false)}
          />
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Holerite (folha de ponto)</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Junta o ledger real de pontos do motorista com os tratamentos
          (fechamentos) lançados pelo gestor no período, pra empresa conseguir
          pagar corretamente. Escolha o período e quais categorias entram no
          PDF, cada empresa paga de um jeito diferente, então as 3 são
          opcionais.
        </p>
        <form onSubmit={onGerarPreviaHolerite}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label>Início</label>
              <input
                type="date"
                value={holeriteInicio}
                onChange={(e) => setHoleriteInicio(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Fim</label>
              <input
                type="date"
                value={holeriteFim}
                onChange={(e) => setHoleriteFim(e.target.value)}
                required
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={holeriteDirecaoEspera}
                onChange={(e) => setHoleriteDirecaoEspera(e.target.checked)}
              />
              Direção / espera
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={holeriteNormalExtra}
                onChange={(e) => setHoleriteNormalExtra(e.target.checked)}
              />
              Hora normal / extra
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={holeriteAdicionalNoturno}
                onChange={(e) => setHoleriteAdicionalNoturno(e.target.checked)}
              />
              Hora noturna
            </label>
          </div>
          {erroHolerite && <p className="error-text">{erroHolerite}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={gerandoHolerite}>
              {gerandoHolerite ? "Calculando..." : "Ver prévia"}
            </button>
            <button
              type="button"
              onClick={onBaixarHolerite}
              disabled={baixandoHolerite || !holeriteInicio || !holeriteFim}
            >
              {baixandoHolerite ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </form>

        {holeritePrevia && (
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Dia</th>
                {holeriteDirecaoEspera && <th>Direção</th>}
                {holeriteDirecaoEspera && <th>Espera</th>}
                {holeriteNormalExtra && <th>H. normal</th>}
                {holeriteNormalExtra && <th>H. extra</th>}
                {holeriteAdicionalNoturno && <th>Hora noturna</th>}
                <th>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {holeritePrevia.dias.map((d) => (
                <tr key={d.dia}>
                  <td>{formatarDiaHoleriteBr(d.dia)}</td>
                  {holeriteDirecaoEspera && (
                    <td>{formatarHorasHolerite(d.direcaoMin)}</td>
                  )}
                  {holeriteDirecaoEspera && (
                    <td>{formatarHorasHolerite(d.esperaMin)}</td>
                  )}
                  {holeriteNormalExtra && (
                    <td>{formatarHorasHolerite(d.normalMin)}</td>
                  )}
                  {holeriteNormalExtra && (
                    <td>{formatarHorasHolerite(d.extraMin)}</td>
                  )}
                  {holeriteAdicionalNoturno && (
                    <td>{formatarHorasHolerite(d.noturnoMin)}</td>
                  )}
                  <td>{d.teveFechamentoGestor ? "Fechado p/ gestor" : ""}</td>
                </tr>
              ))}
              {holeritePrevia.dias.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: "#000000" }}>
                    Nenhum ponto no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <BancoHorasPainel motoristaId={motoristaId} />
    </div>
  );
}
