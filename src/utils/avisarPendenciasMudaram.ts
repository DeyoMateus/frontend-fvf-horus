/**
 * Avisa o sino do painel que uma pendencia foi decidida (aprovada, negada, respondida), para ele
 * consultar de novo na hora em vez de esperar o ciclo de 2 minutos.
 */
export const EVENTO_PENDENCIAS_ATUALIZADAS = "pendencias-do-painel-atualizadas";

export function avisarPendenciasMudaram(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_PENDENCIAS_ATUALIZADAS));
}
