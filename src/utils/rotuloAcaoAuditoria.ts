// Rodada 665: nomes legíveis para ações da trilha de auditoria que o gestor precisa entender sem
// conhecer o código interno. Qualquer ação sem rótulo continua aparecendo com o nome técnico.

const ROTULOS_ACAO: Record<string, string> = {
  PERMISSAO_AUSENTE_NO_PONTO: "Ponto batido com permissão do aparelho faltando",
};

/** Permissões que o app informa como faltando no instante do toque (PERMISSOES_AUSENTES_PONTO). */
const ROTULOS_PERMISSAO: Record<string, string> = {
  LOCALIZACAO: "Localização negada",
  LOCALIZACAO_SEMPRE: 'Localização sem permissão "o tempo todo"',
  NOTIFICACOES: "Notificações desligadas",
};

export function rotuloAcaoAuditoria(acao: string): string {
  return ROTULOS_ACAO[acao] ?? acao;
}

export function rotuloPermissaoAusente(valor: string): string {
  return ROTULOS_PERMISSAO[valor] ?? valor;
}
