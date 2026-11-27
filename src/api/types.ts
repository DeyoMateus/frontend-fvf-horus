// Tipos espelhando os enums/DTOs do backend (prisma/schema.prisma + src/**/dto).

export type PapelUsuario = "ADMIN" | "GESTOR";

export type StatusMotorista = "ATIVO" | "INATIVO" | "SUSPENSO";

export type TecnologiaRastreador =
  | "GPS"
  | "SATELITAL"
  | "CELULAR"
  | "RFID"
  | "HIBRIDO"
  | "OUTRO";

export type TipoEvento =
  | "INICIO_JORNADA"
  | "INICIO_DESCANSO"
  | "FIM_DESCANSO"
  | "INICIO_DIRECAO"
  | "FIM_DIRECAO"
  | "ESPERA_CARGA_DESCARGA"
  | "FIM_ESPERA_CARGA_DESCARGA"
  | "FIM_DESCARREGAMENTO"
  | "FIM_JORNADA"
  | "OUTRO"
  // Eventos do ajudante.
  | "INICIO_CARREGAMENTO"
  | "FIM_CARREGAMENTO"
  | "INICIO_DESCARGA"
  | "FIM_DESCARGA"
  // Parada do motorista (manutenção, trânsito, posto fiscal, outro).
  | "INICIO_PARADA"
  | "FIM_PARADA";

/** Motivo da parada (conta na jornada; não é descanso). */
export type MotivoParada = "MANUTENCAO" | "TRANSITO_CONGESTIONADO" | "POSTO_FISCAL" | "OUTRO";

export const ROTULO_MOTIVO_PARADA: Record<MotivoParada, string> = {
  MANUTENCAO: "Manutenção",
  TRANSITO_CONGESTIONADO: "Trânsito congestionado",
  POSTO_FISCAL: "Posto fiscal (fiscalização em barreira fiscal)",
  OUTRO: "Outro",
};

export const TIPOS_EVENTO: TipoEvento[] = [
  "INICIO_JORNADA",
  "INICIO_DESCANSO",
  "FIM_DESCANSO",
  "INICIO_DIRECAO",
  "FIM_DIRECAO",
  "ESPERA_CARGA_DESCARGA",
  "FIM_ESPERA_CARGA_DESCARGA",
  "FIM_DESCARREGAMENTO",
  "FIM_JORNADA",
  "OUTRO",
  "INICIO_PARADA",
  "FIM_PARADA",
];

/** Motorista e ajudante são colaboradores no mesmo cadastro. */
export type FuncaoColaborador = "MOTORISTA" | "AJUDANTE";

export const ROTULO_FUNCAO: Record<FuncaoColaborador, string> = {
  MOTORISTA: "Motorista",
  AJUDANTE: "Ajudante",
};

/** Eventos que o AJUDANTE registra (jornada, descanso, carregamento e descarga). */
export const TIPOS_EVENTO_AJUDANTE: TipoEvento[] = [
  "INICIO_JORNADA",
  "INICIO_DESCANSO",
  "FIM_DESCANSO",
  "INICIO_CARREGAMENTO",
  "FIM_CARREGAMENTO",
  "INICIO_DESCARGA",
  "FIM_DESCARGA",
  "FIM_JORNADA",
];

export function tiposEventoDaFuncao(funcao?: FuncaoColaborador | null): TipoEvento[] {
  return funcao === "AJUDANTE" ? TIPOS_EVENTO_AJUDANTE : TIPOS_EVENTO;
}

export interface UsuarioAutenticado {
  sub: string;
  email: string;
  // Tenant real é o Grupo (holding) , um grupo pode ter vários CNPJs
  // (Empresa) sob o mesmo login. Renomeado de empresaId em 2026-09.
  grupoId: string;
  papel: PapelUsuario;
  /** Senha definida por outra pessoa; o painel só abre o popup de trocar a senha. */
  senhaProvisoria?: boolean;
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  grupoId: string;
  registroInpiAfd?: string | null;
  fusoHorario?: string;
  /** Dados do estabelecimento (CAEPF/CNO e endereço). */
  caepfCno?: string | null;
  enderecoEstabelecimento?: string | null;
  createdAt: string;
  regraSindicalId?: string | null;
  regraSindical?: { id: string; nome: string } | null;
  ehMatriz?: boolean;
  /** Passo 45: parametros de retencao (null = minimo da lei). */
  retencaoRegistroAnos?: number | null;
  retencaoPosDesligamentoMeses?: number | null;
  retencaoMargemMeses?: number | null;
}

export type CategoriaTransporteSindical = "RODOVIARIO" | "URBANO";

export interface Feriado {
  id: string;
  grupoId: string;
  empresaId?: string | null;
  empresa?: { id: string; razaoSocial: string; cnpj: string } | null;
  data: string; // 'YYYY-MM-DD'
  descricao: string;
  pagoComoDomingo: boolean;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BancoHorasTipo = "SEM_BANCO" | "INDIVIDUAL" | "COLETIVO" | "MENSAL";
export type TratamentoFeriado =
  | "PAGAR_DOBRO"
  | "LANCAR_NO_BANCO"
  | "EXIGIR_FOLGA_COMPENSATORIA";
export type FonteFeriado = "BASE_DA_EMPRESA" | "LOCAL_DA_OPERACAO";

export interface RegraSindical {
  id: string;
  grupoId: string;
  nome: string;
  categoriaTransporte: CategoriaTransporteSindical;
  toleranciaMarcacaoMin: number;
  limiteJornadaNormalMin: number;
  limiteHoraExtraFaixa1Min: number;
  limiteHoraExtraDiariaMaxMin: number;
  percentualHoraExtra1: string;
  percentualHoraExtra2: string;
  percentualHoraExtraDomingoFeriado?: string | null;
  percentualAdicionalNoturno: string;
  duracaoMinutoNoturnoMin: string;
  bancoHorasPrazoExpiracaoMeses?: number | null;
  bancoHorasLimiteAlertaMin?: number | null;
  intervaloRefeicaoMinimoMin: number;
  intervaloEntreJornadasMin?: number;
  repousoSemanalMinimoH?: number | null;
  dsrMinimoH?: number | null;
  viagemLongaDias?: number | null;
  jornadaAbertaAlertaH?: number | null;
  compensacaoFeriadoDias?: number | null;
  percentualDomingoFeriadoSemCompensacao?: string | number | null;
  percentualAdicionalInterjornada?: string | number | null;
  incideReflexoDsrInterjornada?: boolean;
  bancoGuarda?: "fictos" | "reais";
  // Opcional, sem padrão (o antigo 30 era a indenização do art. 235-C § 9º, inconstitucional).
  percentualHoraEspera?: string | null;
  percentualHoraEsperaRefeicao?: string | null;
  acordoColetivo?: boolean;
  numeroMediador?: string | null;
  sindicato?: string | null;
  dataBase?: string | null;
  janelaNoturnaInicioMin?: number;
  janelaNoturnaFimMin?: number;
  prorrogacaoNoturna?: boolean;
  cctVigenciaInicio?: string | null;
  cctVigenciaFim?: string | null;
  cctDocumentoRef?: string | null;
  declaracaoRespaldoCct?: boolean;
  bancoHorasTipo?: BancoHorasTipo;
  feriadoTratamento?: TratamentoFeriado | null;
  feriadoFonte?: FonteFeriado;
  folgaDomingoACadaSemanas?: number | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  empresas?: { id: string; razaoSocial: string; cnpj: string }[];
}

export type StatusSolicitacaoAjuste = "PENDENTE" | "APROVADA" | "REJEITADA";

export interface SolicitacaoAjustePonto {
  id: string;
  motoristaId: string;
  motorista?: { id: string; nome: string };
  tipoEvento: TipoEvento;
  timestampEvento: string;
  justificativa: string;
  registroReferenciaId?: string | null;
  status: StatusSolicitacaoAjuste;
  decididoPorUsuarioId?: string | null;
  decididoPorUsuario?: { id: string; nome: string } | null;
  decididoEm?: string | null;
  motivoDecisao?: string | null;
  tratamentoPontoId?: string | null;
  evidencias?: TratamentoPontoEvidencia[];
  createdAt: string;
}

export interface Motorista {
  id: string;
  nome: string;
  /** Rodada 802: coleta horária de localização ligada na empresa (aba Trilha). */
  empresa?: { amostrasHorariasAtivas?: boolean } | null;
  cpf: string;
  /** Só motorista tem CNH. */
  cnh?: string | null;
  /** MOTORISTA ou AJUDANTE (cadastros antigos vêm como MOTORISTA). */
  funcao?: FuncaoColaborador;
  telefone?: string | null;
  status: StatusMotorista;
  empresaId?: string;
  hashGenesis?: string;
  certificadoFingerprint?: string | null;
  certificadoValidoAte?: string | null;
  createdAt: string;
  /** "Excluir cadastro": não nulo quando o cadastro foi excluído (soft-delete, histórico intacto). */
  excluidoEm?: string | null;
  motivoExclusao?: string | null;
  /** Dados de contrato. */
  dataAdmissao?: string | null;
  /** Rescisão registrada na ficha (fim do vínculo; inicia o prazo de guarda). */
  dataDesligamento?: string | null;
  cargo?: string | null;
  matricula?: string | null;
  matriculaEsocial?: string | null;
  horarioContratualId?: string | null;
  dispositivoVinculado?: {
    deviceUuid: string;
    vinculadoEm?: string;
    atualizadoEm?: string;
  } | null;
  veiculoVinculado?: {
    placa: string;
    idRastreador?: string | null;
    tecnologiaRastreador?: TecnologiaRastreador | null;
    atualizadoEm?: string;
  } | null;
}

export interface Ajudante {
  id: string;
  nome: string;
  cpf: string;
  cargo?: string;
  telefone?: string | null;
  status: StatusMotorista;
  empresaId?: string;
  hashGenesis?: string;
  certificadoFingerprint?: string | null;
  certificadoValidoAte?: string | null;
  createdAt: string;
  excluidoEm?: string | null;
  motivoExclusao?: string | null;
  /** Quando este cadastro antigo virou colaborador (mesmo id). */
  convertidoEmColaboradorEm?: string | null;
  dispositivoVinculado?: {
    deviceUuid: string;
    vinculadoEm?: string;
    atualizadoEm?: string;
  } | null;
}

export interface PaginaAjudantes {
  dados: Ajudante[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RegistroJornada {
  id: string;
  motoristaId: string;
  tipoEvento: TipoEvento;
  timestampEvento: string;
  latitude?: string | null;
  longitude?: string | null;
  precisaoGpsM?: number | null;
  observacao?: string | null;
  sequencial: number;
  hashAnterior: string;
  hashAtual: string;
  assinaturaDigital?: string | null;
  deviceUuidUsado: string;
  /** Fuso do motorista no toque (min a leste do UTC; Brasília = -180). Rodada 146. */
  fusoOffsetMin?: number | null;
  /** Motivo da parada (INICIO_PARADA/FIM_PARADA). */
  motivoParada?: MotivoParada | null;
  /** Correção do motivo pelo gestor (rodada 781): o original acima não muda. */
  motivoParadaVigente?: MotivoParada | null;
  observacaoParadaVigente?: string | null;
  motivoParadaCorrigido?: boolean;
  createdAt: string;
  /** Ponto adulterado. CORRIGIDO = o gestor informou a hora certa (`horaCorrigida`); FORA_DO_CALCULO = alerta de relógio ainda não tratado. */
  situacaoCalculo?: "CORRIGIDO" | "FORA_DO_CALCULO";
  horaCorrigida?: string;
}

export interface DivergenciaIntegridade {
  sequencial: number;
  motivoTecnico: string;
  /** Explicação em linguagem de produção, já traduzida pelo backend (nunca cita detalhe interno de implementação). */
  explicacao: string;
  tipoEvento: string | null;
  timestampEvento: string | null;
  criadoEm: string | null;
  temGps: boolean;
  aceita: boolean;
  aceite: {
    motivo: string;
    aceitoPorNome: string;
    aceitoEm: string;
  } | null;
}

export interface VerificacaoIntegridade {
  motoristaId: string;
  cadeiaValida: boolean;
  motivoCadeia?: string;
  primeiraQuebraSequencial?: number;
  /** Todas as divergências encontradas na cadeia (não só a primeira) , cada uma já indicando se foi aceita/regularizada. */
  divergencias: DivergenciaIntegridade[];
  totalRegistros: number;
  certificadoFingerprintOk: boolean;
  assinaturasInvalidas: number[];
  /** Rodada 800: ajustes de ponto conferidos e os que não conferem com o hash gravado. */
  totalAjustes?: number;
  ajustesDivergentes?: {
    ajusteId: string;
    tipoEvento: string;
    timestampEvento: string;
    criadoEm: string;
    motivo: "HASH_NAO_CONFERE" | "REFERENCIA_FORA_DA_CADEIA";
  }[];
  /** Verdadeiro só quando não há NENHUMA divergência pendente (não aceita) , divergências já aceitas não impedem "integro". */
  integro: boolean;
}

export interface TratamentoPonto {
  id: string;
  motoristaId: string;
  usuarioId: string;
  tipoEvento: TipoEvento;
  timestampEvento: string;
  motivo: string;
  /** Fuso do motorista no instante do ajuste (min a leste do UTC). */
  fusoOffsetMin?: number | null;
  registroReferenciaId?: string | null;
  hashReferencia: string;
  hashRegistro: string;
  createdAt: string;
  usuario?: { id: string; nome: string; email: string };
  motoristaCienciaEm?: string | null;
  evidencias?: TratamentoPontoEvidencia[];
}

export interface TratamentoPontoEvidencia {
  id: string;
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  createdAt?: string;
}

export interface DispositivoStatus {
  deviceUuid?: string;
  vinculadoEm?: string;
  atualizadoEm?: string;
  vinculadoPorUsuarioId?: string;
  /** Telemetria do app (pontos em ERRO guardados no aparelho). */
  errosAppQtd?: number | null;
  errosAppDesde?: string | null;
  errosAppAtualizadoEm?: string | null;
  vinculado?: false;
}

export type TipoAlertaJornada =
  // Refeição pendente e jornada total do dia.
  | "INTERVALO_REFEICAO_PENDENTE"
  | "JORNADA_TOTAL_PROXIMA_LIMITE"
  | "JORNADA_TOTAL_EXCEDIDA"
  | "JORNADA_TOTAL_EXTRAS_LIMITE"
  // Repouso semanal e DSR.
  | "REPOUSO_SEMANAL_PROXIMO_LIMITE"
  | "REPOUSO_SEMANAL_ATRASADO"
  | "DSR_SEM_DESCANSO_SEMANAL"
  | "DIRECAO_CONTINUA_PROXIMA_LIMITE"
  | "DIRECAO_CONTINUA_EXCEDIDA"
  | "DIRECAO_RETOMADA_SEM_PAUSA"
  | "DIRECAO_CONTINUA_REPETIDA_10H"
  | "DIRECAO_CONTINUA_REPETIDA_11H"
  | "FOLGA_VENCIDA"
  | "FOLGA_URGENTE"
  | "SEQUENCIA_EVENTOS_INCONSISTENTE"
  | "JORNADA_ABERTA_PROLONGADA"
  | "JORNADA_DIRECAO_PROXIMA_LIMITE"
  | "JORNADA_DIRECAO_EXCEDIDA"
  | "JORNADA_ATUAL_DIRECAO_PROXIMA_LIMITE"
  | "JORNADA_ATUAL_DIRECAO_EXCEDIDA"
  | "ESPERA_PROXIMA_LIMITE"
  | "ESPERA_LIMITE_LEGAL_ATINGIDO"
  | "DOCUMENTACAO_ACUMULADA"
  | "DOCUMENTACAO_PROXIMA_LIMITE"
  | "DOCUMENTACAO_LIMITE_ATINGIDO"
  | "OCIOSIDADE_DIRECAO_SUSPEITA"
  // Motor de antifraude (AntifraudeService, backend) , ver
  // backend/src/common/antifraude/antifraude.service.ts.
  | "VELOCIDADE_IMPOSSIVEL_ENTRE_REGISTROS"
  | "RELOGIO_DISPOSITIVO_SUSPEITO"
  | "RELOGIO_PONTO_RECUSADO"
  | "PONTO_ACEITO_COM_FLAG"
  | "HORA_NAO_VERIFICADA_APOS_REINICIO"
  | "SEQUENCIA_JORNADA_MUITO_RAPIDA"
  | "ODOMETRO_REGRESSIVO"
  | "INTEGRIDADE_DISPOSITIVO_SUSPEITA"
  // Folga concedida pelo RH conflitando com ponto já batido (ou
  // vice-versa) , ver FolgaConcedidaService/RegistrosJornadaService no backend.
  | "PONTO_REGISTRADO_EM_DIA_DE_FOLGA"
  // Jornada aberta sem etapa em aberto (nem direção, nem
  // descanso, nem espera, nem "aguardando documentação") por tempo
  // demais , ver JornadaLegalService.avaliarTempoIndefinido.
  | "TEMPO_INDEFINIDO_PROXIMO_LIMITE"
  | "TEMPO_INDEFINIDO_PROLONGADO"
  // Descanso interjornada (entre o fim de uma jornada e o
  // início da próxima) abaixo do mínimo legal de 11h , ver
  // JornadaLegalService.avaliarDescansoInterjornada.
  | "DESCANSO_INTERJORNADA_INSUFICIENTE"
  // Início de direção sem CT-e vinculado/emitido
  // recentemente, com um CT-e em aberto (não entregue) pendente , ver
  // RegistrosJornadaService.avaliarCteAbertoSemVinculoRecente.
  | "CTE_EM_ABERTO_SEM_VINCULO_RECENTE"
  // Evento sincronizado com atraso grande demais pra ser
  // só "ficou sem sinal" , ver AntifraudeService.avaliarSincronizacaoTardiaSuspeita.
  | "SINCRONIZACAO_TARDIA_SUSPEITA"
  // Divergência de relógio detectada RETROATIVAMENTE, só
  // depois que uma amostra de hora confiável do mesmo boot do aparelho
  // chegou ao servidor (ver RelogioConfiavelService no backend). O
  // registro que gerou o alerta nunca é alterado/apagado (WORM).
  | "RELOGIO_DIVERGENTE_DETECTADO_RETROATIVAMENTE"
  // Varredura automática achou divergência na cadeia de hashes.
  | "INTEGRIDADE_CADEIA_VIOLADA"
  | "FALHA_AVALIACAO_ALERTAS";

export type SeveridadeAlerta = "INFO" | "ATENCAO" | "CRITICO";

export interface AlertaJornada {
  id: string;
  motoristaId: string;
  tipo: TipoAlertaJornada;
  severidade: SeveridadeAlerta;
  mensagem: string;
  janelaInicio: string;
  janelaFim: string;
  minutosAcumulados: number;
  registroGeradorId: string;
  detalhes?: Record<string, unknown> | null;
  visualizadoEm?: string | null;
  visualizadoPorUsuarioId?: string | null;
  tratadoEm?: string | null;
  tratadoPorUsuarioId?: string | null;
  tratamentoObservacao?: string | null;
  createdAt: string;
  motorista?: { id: string; nome: string; cpf: string };
}

export type ActorType =
  | "USUARIO_EMPRESA"
  | "MOTORISTA"
  | "AJUDANTE"
  | "SISTEMA"
  | "SUPER_ADMIN";

export interface RegistroAuditoria {
  id: string;
  actorType: ActorType;
  actorId?: string | null;
  /** Nome de verdade de quem agiu , null quando o ator já foi excluído ou é o próprio SISTEMA. */
  actorNome?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  grupoId?: string | null;
}

export interface PaginaAuditoria {
  dados: RegistroAuditoria[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OcorrenciaAuditoria {
  acao: string;
  entidade: string;
}

export type StatusSolicitacaoDispositivo =
  | "PENDENTE"
  | "APROVADA"
  | "REJEITADA";

export interface SolicitacaoTrocaDispositivo {
  id: string;
  motoristaId: string;
  deviceUuidSolicitado: string;
  modeloAparelho?: string | null;
  sistemaOperacional?: string | null;
  observacaoMotorista?: string | null;
  status: StatusSolicitacaoDispositivo;
  criadoEm: string;
  motorista?: { id: string; nome: string; cpf: string };
}

// Espelha DashboardService.resumo/tendencia (backend/src/dashboard).
export interface DashboardResumo {
  atualizadoEm: string;
  /** Fuso IANA da transportadora, só para exibição. */
  fusoHorario?: string;
  motoristas: {
    totalAtivos: number;
    semNenhumRegistro: number;
    emDirecao: number;
    emDescanso: number;
    /** Último evento foi uma parada (manutenção, trânsito, posto fiscal, outro). */
    emParada?: number;
    emEspera: number;
    jornadaAbertaSemSubEvento: number;
    aguardandoDocumentacao: number;
    semJornadaAberta: number;
    /** So a 1a pagina; as demais vem de `getJornadasAbertasPagina`. */
    jornadasAbertasHaMuitoTempo: JornadaAbertaHaMuitoTempo[];
    totalJornadasAbertasHaMuitoTempo: number;
  };
  alertas: {
    abertos: { CRITICO: number; ATENCAO: number; INFO: number };
    totalAbertos: number;
    ultimas24h: number;
    riscoFraudeUltimos7d: number;
    topTipos7d: { tipo: TipoAlertaJornada; quantidade: number }[];
  };
}

export interface JornadaAbertaHaMuitoTempo {
  motoristaId: string;
  nome: string;
  desde: string;
  horasAberta: number;
}

export interface PaginaJornadasAbertas {
  atualizadoEm: string;
  itens: JornadaAbertaHaMuitoTempo[];
  total: number;
  page: number;
  pageSize: number;
  totalPaginas: number;
}

export interface DashboardTendenciaDia {
  dia: string;
  registros: number;
  alertasCritico: number;
  alertasAtencao: number;
  alertasInfo: number;
  riscoFraude: number;
  horasDirecao: number;
  horasEspera: number;
  // Jornada aberta sem etapa em aberto (nem direção, nem
  // descanso, nem espera, nem "aguardando documentação").
  horasIndefinido: number;
}

// Espelha CardPainel em backend/src/dashboard/dashboard.service.ts.
export type CardPainel =
  | "ativos"
  | "em-direcao"
  | "em-descanso"
  | "em-parada"
  | "em-espera"
  | "jornada-aberta-sem-sub-evento"
  | "aguardando-documentacao"
  | "sem-jornada-aberta"
  | "sem-nenhum-registro"
  | "alertas-criticos"
  | "alertas-atencao"
  | "alertas-24h"
  | "risco-fraude-7d";

export interface ItemMotoristaCard {
  motoristaId: string;
  nome: string;
  detalhe: string | null;
}

export interface ItemAlertaCard {
  alertaId: string;
  motoristaId: string;
  nome: string;
  tipo: TipoAlertaJornada;
  severidade: SeveridadeAlerta;
  createdAt: string;
}

export type DashboardDetalheCard =
  | { tipo: "motoristas"; itens: ItemMotoristaCard[] }
  | { tipo: "alertas"; itens: ItemAlertaCard[]; truncado?: boolean };

// Espelha ChaveIndicadorTendencia em backend/src/dashboard/dashboard.service.ts.
export type ChaveIndicadorTendencia =
  | "registros"
  | "alertasCritico"
  | "alertasAtencao"
  | "alertasInfo"
  | "riscoFraude"
  | "horasDirecao"
  | "horasEspera"
  | "horasIndefinido";

export interface ItemRegistroTendencia {
  registroId: string;
  motoristaId: string;
  nome: string;
  tipoEvento: TipoEvento;
  timestampEvento: string;
}

export interface ItemTrechoTendencia {
  motoristaId: string;
  nome: string;
  inicio: string;
  fim: string;
  minutos: number;
}

// Detalhe por trás de UM PONTO do gráfico "Evolução ao longo do tempo"
// (dia + indicador clicado) , drill-through, mesmo espírito do
// DashboardDetalheCard acima, só que por data em vez de estado atual.
export type DashboardTendenciaDetalhe =
  | { tipo: "registros"; itens: ItemRegistroTendencia[]; truncado?: boolean }
  | { tipo: "alertas"; itens: ItemAlertaCard[]; truncado?: boolean }
  | { tipo: "trechos"; itens: ItemTrechoTendencia[] };

// ===== Usuários do grupo =====

export interface UsuarioEmpresaListado {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
  telefoneWhatsapp?: string | null;
  telefoneGerenciamentoRisco?: string | null;
  /** Só o ADMIN principal do grupo edita o número da GR. */
  adminPrincipal?: boolean;
  recebeWhatsappAlertas?: boolean;
  recebeWhatsappEquipeGr?: boolean;
  /** Permissões separadas (só aparecem na lista do ADMIN). */
  podeAprovarAjuste?: boolean;
  podeAceitarDivergencia?: boolean;
  /** MFA (TOTP) ativo e aviso de cadastro exigido pela empresa. */
  mfaAtivo?: boolean;
  mfaValidoAte?: string | null;
  mfaExpirado?: boolean;
  mfaCadastroPendente?: boolean;
  /** CPF do usuario; vem so em /me. */
  cpf?: string | null;
  cpfPendente?: boolean;
  createdAt: string;
}

// ===== Super admin da plataforma =====

export interface SuperAdminAutenticado {
  sub: string;
  email: string;
  tipo: "SUPER_ADMIN";
}

export interface GrupoResumo {
  id: string;
  razaoSocial: string;
  createdAt: string;
  totalEmpresas: number;
  totalUsuarios: number;
  totalMotoristas: number;
  ativo?: boolean;
  inativadoEm?: string | null;
}

export type RegimeBancoHoras =
  | "NENHUM"
  | "ACORDO_INDIVIDUAL_6M"
  | "CONVENCAO_COLETIVA_12M"
  | "COMPENSACAO_NO_MES";
export type RegimeDomingoFeriado =
  | "NAO_DEFINIDO"
  | "DOBRA_NO_BANCO"
  | "PAGO_NO_HOLERITE"
  | "COMPENSACAO_1_PARA_1";

/** Regime do banco de horas da empresa (definido só pelo super admin). */
export interface RegimeBancoHorasEmpresa {
  regime: RegimeBancoHoras;
  domingoFeriado: RegimeDomingoFeriado;
  documento: string | null;
  vigenciaInicio: string | null;
  /** Último dia de vigência do instrumento (null = sem fim informado). */
  vigenciaFim?: string | null;
  instrumento?: { situacao: "SEM_FIM" | "VIGENTE" | "VENCE_EM_BREVE" | "VENCIDO"; diasParaFim: number | null };
  tetoMin: number | null;
  fator: number;
  razaoAtivo: boolean;
}

/** Chave de liberacao de uma empresa (ligada/desligada pelo super admin). */
export interface ChaveLiberacaoEstado {
  chave: string;
  rotulo: string;
  descricao: string;
  naoDesliga: boolean;
  ligada: boolean;
}

export interface GrupoDetalhe {
  id: string;
  razaoSocial: string;
  createdAt: string;
  limiteMotoristas?: number | null;
  limiteAjudantes?: number | null;
  ativo?: boolean;
  inativadoEm?: string | null;
  motivoInativacao?: string | null;
  empresas: {
    id: string;
    razaoSocial: string;
    cnpj: string;
    ativo: boolean;
    registroInpiAfd: string | null;
    fusoHorario?: string;
    cidade?: string | null;
    uf?: string | null;
    /** Amostras horárias de localização na direção (opcional, desligado por padrão). */
    amostrasHorariasAtivas?: boolean;
    totalMotoristas: number;
    bancoHoras?: RegimeBancoHorasEmpresa;
    chaves?: ChaveLiberacaoEstado[];
  }[];
  usuarios: UsuarioEmpresaListado[];
}

// Edição, pelo super admin, de um cadastro já existente.
export interface UpdateGrupoInput {
  razaoSocial: string;
  /** null = sem limite; omitido = não altera. */
  limiteMotoristas?: number | null;
  limiteAjudantes?: number | null;
}

export interface UpdateEmpresaInput {
  razaoSocial?: string;
  cnpj?: string;
  registroInpiAfd?: string;
  fusoHorario?: string;
  /** Cidade e UF da empresa (não exigem motivo). */
  cidade?: string;
  uf?: string;
  /** Liga/desliga as amostras horárias de localização (exigem "o tempo todo" no app). */
  amostrasHorariasAtivas?: boolean;
  /** Obrigatório quando algum dado do empregador muda. */
  motivo?: string;
}


export interface UpdateUsuarioSuperAdminInput {
  nome?: string;
  email?: string;
}

export interface CreateEmpresaMaeInput {
  razaoSocialGrupo: string;
  /** Máximo de motoristas da empresa mãe; omitido = sem limite. */
  limiteMotoristas?: number;
  limiteAjudantes?: number;
  cnpjEmpresa: string;
  razaoSocialEmpresa: string;
  nomeAdmin: string;
  /** CPF do admin, obrigatorio (11 digitos). */
  cpfAdmin: string;
  emailAdmin: string;
  senhaAdmin: string;
  registroInpiAfd?: string;
  /** Fuso, cidade e UF da empresa, definidos no cadastro. */
  fusoHorario?: string;
  cidade?: string;
  uf?: string;
}

// Criar/ativar-desativar funcionário de um grupo já
// existente virou exclusividade do super admin.
export interface CreateUsuarioGrupoInput {
  nome: string;
  /** Obrigatorio (11 digitos). */
  cpf: string;
  email: string;
  senha: string;
  papel: PapelUsuario;
  telefoneWhatsapp?: string;
}

// ===== Meu perfil =====

export interface UpdatePerfilProprioInput {
  nome?: string;
  /** Informado uma vez; 11 digitos. */
  cpf?: string;
  email?: string;
  /** Obrigatória só quando o e-mail muda. */
  senhaAtual?: string;
  telefoneWhatsapp?: string;
  /** Só ADMIN; null limpa. */
  telefoneGerenciamentoRisco?: string | null;
}
