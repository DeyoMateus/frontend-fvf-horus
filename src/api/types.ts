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
  | "OUTRO";

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
];

export interface UsuarioAutenticado {
  sub: string;
  email: string;
  // Tenant real é o Grupo (holding) , um grupo pode ter vários CNPJs
  // (Empresa) sob o mesmo login. Renomeado de empresaId em 2026-09.
  grupoId: string;
  papel: PapelUsuario;
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  cnpj: string;
  grupoId: string;
  registroInpiAfd?: string | null;
  fusoHorario?: string;
  createdAt: string;
  regraSindicalId?: string | null;
  regraSindical?: { id: string; nome: string } | null;
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

export interface RegraSindical {
  id: string;
  grupoId: string;
  nome: string;
  categoriaTransporte: CategoriaTransporteSindical;
  toleranciaMarcacaoMin: number;
  limiteJornadaNormalMin: number;
  limiteHoraExtraFaixa1Min: number;
  percentualHoraExtra1: string;
  percentualHoraExtra2: string;
  percentualHoraExtraDomingoFeriado?: string | null;
  percentualAdicionalNoturno: string;
  duracaoMinutoNoturnoMin: string;
  bancoHorasAtivo: boolean;
  bancoHorasPrazoExpiracaoMeses?: number | null;
  bancoHorasLimiteAlertaMin?: number | null;
  primeiroPeriodoDescansoMinimoMin: number;
  intervaloRefeicaoMinimoMin: number;
  percentualHoraEspera: string;
  percentualHoraEsperaRefeicao?: string | null;
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
  cpf: string;
  cnh?: string;
  telefone?: string | null;
  status: StatusMotorista;
  empresaId?: string;
  hashGenesis?: string;
  certificadoFingerprint?: string | null;
  certificadoValidoAte?: string | null;
  createdAt: string;
  /** Rodada 65 , "Excluir cadastro": não nulo quando o cadastro foi excluído (soft-delete, histórico intacto). */
  excluidoEm?: string | null;
  motivoExclusao?: string | null;
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
  telefone?: string | null;
  status: StatusMotorista;
  empresaId?: string;
  hashGenesis?: string;
  certificadoFingerprint?: string | null;
  certificadoValidoAte?: string | null;
  createdAt: string;
  excluidoEm?: string | null;
  motivoExclusao?: string | null;
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
  createdAt: string;
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
  vinculado?: false;
}

export type TipoAlertaJornada =
  | "DIRECAO_CONTINUA_PROXIMA_LIMITE"
  | "DIRECAO_CONTINUA_EXCEDIDA"
  | "DIRECAO_RETOMADA_SEM_PAUSA"
  | "JORNADA_DIRECAO_PROXIMA_LIMITE"
  | "JORNADA_DIRECAO_EXCEDIDA"
  | "ESPERA_PROXIMA_LIMITE"
  | "ESPERA_LIMITE_LEGAL_ATINGIDO"
  | "OCIOSIDADE_DIRECAO_SUSPEITA"
  // Motor de antifraude (AntifraudeService, backend) , ver
  // backend/src/common/antifraude/antifraude.service.ts.
  | "VELOCIDADE_IMPOSSIVEL_ENTRE_REGISTROS"
  | "RELOGIO_DISPOSITIVO_SUSPEITO"
  | "SEQUENCIA_JORNADA_MUITO_RAPIDA"
  | "ODOMETRO_REGRESSIVO"
  | "INTEGRIDADE_DISPOSITIVO_SUSPEITA"
  // Folga concedida pelo RH conflitando com ponto já batido (ou
  // vice-versa) , ver FolgaConcedidaService/RegistrosJornadaService no backend.
  | "PONTO_REGISTRADO_EM_DIA_DE_FOLGA"
  // GPS do "Fim de descarregamento" fora da cerca virtual (500m) do
  // endereço do destinatário do CT-e , ver RegistrosJornadaService.avaliarCercaVirtualEntrega.
  | "ENTREGA_FORA_DA_CERCA_VIRTUAL"
  // Rodada 68 , jornada aberta sem etapa em aberto (nem direção, nem
  // descanso, nem espera, nem "aguardando documentação") por tempo
  // demais , ver JornadaLegalService.avaliarTempoIndefinido.
  | "TEMPO_INDEFINIDO_PROXIMO_LIMITE"
  | "TEMPO_INDEFINIDO_PROLONGADO"
  // Rodada 71 , descanso interjornada (entre o fim de uma jornada e o
  // início da próxima) abaixo do mínimo legal de 11h , ver
  // JornadaLegalService.avaliarDescansoInterjornada.
  | "DESCANSO_INTERJORNADA_INSUFICIENTE"
  // Rodada 72 , início de direção sem CT-e vinculado/emitido
  // recentemente, com um CT-e em aberto (não entregue) pendente , ver
  // RegistrosJornadaService.avaliarCteAbertoSemVinculoRecente.
  | "CTE_EM_ABERTO_SEM_VINCULO_RECENTE"
  // Rodada 87 , evento sincronizado com atraso grande demais pra ser
  // só "ficou sem sinal" , ver AntifraudeService.avaliarSincronizacaoTardiaSuspeita.
  | "SINCRONIZACAO_TARDIA_SUSPEITA"
  // Rodada 92 , divergência de relógio detectada RETROATIVAMENTE, só
  // depois que uma amostra de hora confiável do mesmo boot do aparelho
  // chegou ao servidor (ver RelogioConfiavelService no backend). O
  // registro que gerou o alerta nunca é alterado/apagado (WORM).
  | "RELOGIO_DIVERGENTE_DETECTADO_RETROATIVAMENTE"
  // Rodada 165 , varredura automática achou divergência na cadeia de hashes.
  | "INTEGRIDADE_CADEIA_VIOLADA";

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
  | "SISTEMA"
  | "SUPER_ADMIN";

export interface RegistroAuditoria {
  id: string;
  actorType: ActorType;
  actorId?: string | null;
  /** Nome de verdade de quem agiu (Rodada 74) , null quando o ator já foi excluído ou é o próprio SISTEMA. */
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
  /** Fuso IANA da transportadora (Rodada 146), só para exibição. */
  fusoHorario?: string;
  motoristas: {
    totalAtivos: number;
    semNenhumRegistro: number;
    emDirecao: number;
    emDescanso: number;
    emEspera: number;
    jornadaAbertaSemSubEvento: number;
    semJornadaAberta: number;
    jornadasAbertasHaMuitoTempo: {
      motoristaId: string;
      nome: string;
      desde: string;
      horasAberta: number;
    }[];
  };
  alertas: {
    abertos: { CRITICO: number; ATENCAO: number; INFO: number };
    totalAbertos: number;
    ultimas24h: number;
    riscoFraudeUltimos7d: number;
    topTipos7d: { tipo: TipoAlertaJornada; quantidade: number }[];
  };
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
  // Rodada 68 , jornada aberta sem etapa em aberto (nem direção, nem
  // descanso, nem espera, nem "aguardando documentação").
  horasIndefinido: number;
}

// Espelha CardPainel em backend/src/dashboard/dashboard.service.ts.
export type CardPainel =
  | "ativos"
  | "em-direcao"
  | "em-descanso"
  | "em-espera"
  | "jornada-aberta-sem-sub-evento"
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
  | { tipo: "alertas"; itens: ItemAlertaCard[] };

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
  | { tipo: "registros"; itens: ItemRegistroTendencia[] }
  | { tipo: "alertas"; itens: ItemAlertaCard[] }
  | { tipo: "trechos"; itens: ItemTrechoTendencia[] };

// ===== Usuários do grupo (Rodada 31) =====

export interface UsuarioEmpresaListado {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
  telefoneWhatsapp?: string | null;
  telefoneGerenciamentoRisco?: string | null;
  recebeWhatsappAlertas?: boolean;
  recebeWhatsappEquipeGr?: boolean;
  createdAt: string;
}

// ===== Super admin da plataforma (Rodada 31) =====

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
}

export interface GrupoDetalhe {
  id: string;
  razaoSocial: string;
  createdAt: string;
  empresas: {
    id: string;
    razaoSocial: string;
    cnpj: string;
    ativo: boolean;
    registroInpiAfd: string | null;
    fusoHorario?: string;
    totalMotoristas: number;
  }[];
  usuarios: UsuarioEmpresaListado[];
}

// Edição, pelo super admin, de um cadastro já existente (Rodada 32).
export interface UpdateGrupoInput {
  razaoSocial: string;
}

export interface UpdateEmpresaInput {
  razaoSocial?: string;
  cnpj?: string;
  registroInpiAfd?: string;
  fusoHorario?: string;
}

export interface UpdateUsuarioSuperAdminInput {
  nome?: string;
  email?: string;
}

export interface CreateEmpresaMaeInput {
  razaoSocialGrupo: string;
  cnpjEmpresa: string;
  razaoSocialEmpresa: string;
  nomeAdmin: string;
  emailAdmin: string;
  senhaAdmin: string;
  registroInpiAfd?: string;
}

// Rodada 38: criar/ativar-desativar funcionário de um grupo já
// existente virou exclusividade do super admin.
export interface CreateUsuarioGrupoInput {
  nome: string;
  email: string;
  senha: string;
  papel: PapelUsuario;
  telefoneWhatsapp?: string;
}

// ===== Meu perfil (Rodada 38) =====

export interface UpdatePerfilProprioInput {
  nome?: string;
  email?: string;
  telefoneWhatsapp?: string;
  /** Só ADMIN; null limpa. */
  telefoneGerenciamentoRisco?: string | null;
}
