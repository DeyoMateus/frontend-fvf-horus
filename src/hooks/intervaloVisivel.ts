/**
 * setInterval que só roda com a aba visível. Ao voltar a ficar visível,
 * executa na hora (para o sino não mostrar dado velho) e retoma o ritmo.
 * Devolve a função de limpeza, para uso direto em useEffect.
 */
export function intervaloVisivel(tarefa: () => void, intervaloMs: number) {
  let id: ReturnType<typeof setInterval> | null = null;

  function iniciar() {
    if (id === null) id = setInterval(tarefa, intervaloMs);
  }
  function parar() {
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
