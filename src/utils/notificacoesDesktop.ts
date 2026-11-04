/**
 * Notificações nativas do navegador (bandeja do Windows/macOS) para alertas,
 * pedidos de ajuste, LGPD e radar. Desligadas por padrão enquanto durarem os
 * testes de carga (geram dezenas de avisos de dados de teste). Para religar,
 * defina VITE_NOTIFICACOES_DESKTOP=true no build do painel. O sininho dentro
 * do painel continua funcionando normalmente.
 */
export function notificacoesDesktopAtivas(
  valor: string | undefined = import.meta.env.VITE_NOTIFICACOES_DESKTOP,
): boolean {
  return (valor ?? "").trim().toLowerCase() === "true";
}
