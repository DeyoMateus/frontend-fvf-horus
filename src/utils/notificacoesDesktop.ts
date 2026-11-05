/**
 * Notificações nativas do navegador (bandeja do Windows/macOS) para alertas,
 * pedidos de ajuste, LGPD e radar. Ligadas por padrão. Para desligar (por
 * exemplo durante testes de carga, que geram muitos avisos de dados de teste),
 * defina VITE_NOTIFICACOES_DESKTOP=false no build do painel. Retirar a
 * variável religa. O sininho dentro do painel não depende disso.
 */
export function notificacoesDesktopAtivas(
  valor: string | undefined = import.meta.env.VITE_NOTIFICACOES_DESKTOP,
): boolean {
  return (valor ?? "").trim().toLowerCase() !== "false";
}
