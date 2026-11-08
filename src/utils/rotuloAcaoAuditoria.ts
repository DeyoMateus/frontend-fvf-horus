// Rodada 665: nomes legíveis para ações da trilha de auditoria que o gestor precisa entender sem
// conhecer o código interno. Qualquer ação sem rótulo continua aparecendo com o nome técnico.

const ROTULOS_ACAO: Record<string, string> = {
  PERMISSAO_AUSENTE_NO_PONTO: "Ponto batido com permissão do aparelho faltando",
  // Rodada 671: o app avisou (relógio e/ou localização) antes do ponto e a pessoa tocou "Continuar".
  AVISO_CONFIRMADO_NO_PONTO: "Ponto batido após aviso de possível divergência (a pessoa foi avisada e continuou)",
  INTEGRIDADE_DISPOSITIVO_SUSPEITA: "Sinal de integridade do aparelho a conferir",
};

/** Permissões que o app informa como faltando no instante do toque (PERMISSOES_AUSENTES_PONTO). */
const ROTULOS_PERMISSAO: Record<string, string> = {
  LOCALIZACAO: "Localização negada",
  LOCALIZACAO_SEMPRE: 'Localização sem permissão "o tempo todo"',
  NOTIFICACOES: "Notificações desligadas",
  // Rodada 671: avisos confirmados e sinais de integridade enviados pelo app.
  RELOGIO_DIVERGENTE: "Horário do aparelho diferente do oficial",
  POSICAO_POSSIVELMENTE_FALSA: "Localização possivelmente alterada",
  POSICAO_MARCADA_COMO_FALSA: "Localização marcada pelo Android como possivelmente alterada",
  ROOT_OU_JAILBREAK_DETECTADO: "Aparelho com root ou jailbreak",
  HOOKING_OU_INSTRUMENTACAO_DETECTADO: "Ferramenta de instrumentação detectada",
  BANCO_LOCAL_ADULTERADO: "Banco local do app alterado fora do aplicativo",
  KEYSTORE_INDISPONIVEL: "Cofre de chaves do aparelho indisponível",
};

export function rotuloAcaoAuditoria(acao: string): string {
  return ROTULOS_ACAO[acao] ?? acao;
}

export function rotuloPermissaoAusente(valor: string): string {
  return ROTULOS_PERMISSAO[valor] ?? valor;
}
