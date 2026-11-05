/**
 * setInterval que só roda com a aba visível. Ao voltar a ficar visível,
 * executa na hora (para o sino não mostrar dado velho) e retoma o ritmo.
 * Devolve a função de limpeza, para uso direto em useEffect.
 */
export function intervaloVisivel(
  tarefa: () => void,
  intervaloMs: number,
  opcoes?: { jitterMs?: number },
) {
  let id: ReturnType<typeof setInterval> | null = null;
  let adiar: ReturnType<typeof setTimeout> | null = null;
  const jitterMs = opcoes?.jitterMs ?? 0;

  function iniciar() {
    if (id !== null || adiar !== null) return;
    if (jitterMs > 0) {
      // Rodada 647: cada aba comeca o ritmo num instante aleatorio (0 a jitterMs), para os paineis
      // abertos ao mesmo tempo nao baterem no servidor todos juntos a cada ciclo.
      adiar = setTimeout(() => {
        adiar = null;
        id = setInterval(tarefa, intervaloMs);
      }, Math.random() * jitterMs);
    } else {
      id = setInterval(tarefa, intervaloMs);
    }
  }
  function parar() {
    if (adiar !== null) {
      clearTimeout(adiar);
      adiar = null;
    }
    if (id !== null) {
      clearInterval(id);
      id = null;
    }
  }
  function aoMudarVisibilidade() {
    if (document.visibilityState === "visible") {
      tarefa();
      iniciar();
    } else {
      parar();
    }
  }

  if (document.visibilityState === "visible") iniciar();
  document.addEventListener("visibilitychange", aoMudarVisibilidade);
  return () => {
    parar();
    document.removeEventListener("visibilitychange", aoMudarVisibilidade);
  };
}
