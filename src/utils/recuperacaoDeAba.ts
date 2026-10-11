/**
 * Recupera a aba do painel quando o navegador a congela/descarta em segundo
 * plano (economia de memória) e ela volta como tela cinza/vazia, o que
 * antes exigia F5 manual (ex.: clicar na notificação do desktop).
 *
 * - Ao voltar a ficar visível/focada: se o #root estiver vazio, ou a aba
 *   ficou oculta por mais de 10 min, recarrega a página (a sessão fica no
 *   armazenamento do navegador, então o login é mantido).
 * - Restauração do bfcache (pageshow persisted) também recarrega.
 * - Falha ao carregar chunk após novo deploy (vite:preloadError) recarrega.
 */
const LIMITE_OCULTA_MS = 10 * 60 * 1000;
const CHAVE_RELOAD = "fvf_recuperacao_aba_ts";

function recarregarComTrava() {
  try {
    const ultimo = Number(sessionStorage.getItem(CHAVE_RELOAD) ?? 0);
    if (Date.now() - ultimo < 15_000) return; // evita loop de recarga
    sessionStorage.setItem(CHAVE_RELOAD, String(Date.now()));
  } catch {
    // sem sessionStorage: segue e recarrega mesmo assim
  }
  window.location.reload();
}

function raizVazia(): boolean {
  const raiz = document.getElementById("root");
  return !raiz || raiz.childElementCount === 0;
}

export function iniciarRecuperacaoDeAba() {
  if (typeof window === "undefined") return;
  let ocultaDesde: number | null = document.hidden ? Date.now() : null;

  const aoVoltar = () => {
    const ficouOculta = ocultaDesde !== null ? Date.now() - ocultaDesde : 0;
    ocultaDesde = null;
    if (raizVazia() || ficouOculta > LIMITE_OCULTA_MS) recarregarComTrava();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) ocultaDesde = Date.now();
    else aoVoltar();
  });
  window.addEventListener("focus", () => {
    if (raizVazia()) recarregarComTrava();
  });
  window.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) recarregarComTrava();
  });
  window.addEventListener("vite:preloadError", () => recarregarComTrava());
}
