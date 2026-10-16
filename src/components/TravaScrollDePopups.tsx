import { useEffect } from "react";

// Rodada 266 , quando um popup (modal) está aberto, a página de fundo
// não pode rolar: só o conteúdo de dentro do popup. Detecta sozinho
// qualquer camada fixa que cobre a tela inteira (os popups do sistema,
// o modal de confirmação e o tour), então vale para todos os popups
// atuais e futuros sem precisar mexer em cada um.

const SELETOR_CANDIDATOS =
  '[style*="position: fixed"], [style*="position:fixed"], .confirm-overlay, [data-tour-camada], [role="dialog"]';

const CLASSE_TRAVA = "fvf-scroll-travado";

function cobreATela(el: Element): boolean {
  const estilo = window.getComputedStyle(el);
  if (estilo.position !== "fixed" || estilo.display === "none") return false;
  if (estilo.visibility === "hidden") return false;
  const r = el.getBoundingClientRect();
  return (
    r.left <= 1 &&
    r.top <= 1 &&
    r.width >= window.innerWidth - 2 &&
    r.height >= window.innerHeight - 2
  );
}

function haPopupAberto(): boolean {
  const candidatos = document.querySelectorAll(SELETOR_CANDIDATOS);
  for (const el of Array.from(candidatos)) {
    if (cobreATela(el)) return true;
  }
  return false;
}

export function TravaScrollDePopups() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let travado = false;
    let agendado = false;
    let paddingOriginal = "";

    function travar() {
      if (travado) return;
      travado = true;
      // compensa a barra de rolagem que some, para a página não "pular"
      const larguraBarra = window.innerWidth - html.clientWidth;
      paddingOriginal = body.style.paddingRight;
      if (larguraBarra > 0) body.style.paddingRight = `${larguraBarra}px`;
      html.classList.add(CLASSE_TRAVA);
    }

    function destravar() {
      if (!travado) return;
      travado = false;
      html.classList.remove(CLASSE_TRAVA);
      body.style.paddingRight = paddingOriginal;
    }

    function verificar() {
      agendado = false;
      if (haPopupAberto()) travar();
      else destravar();
    }

    function agendar() {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(verificar);
    }

    const observador = new MutationObserver(agendar);
    observador.observe(body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    window.addEventListener("resize", agendar);
    agendar();

    return () => {
      observador.disconnect();
      window.removeEventListener("resize", agendar);
      destravar();
    };
  }, []);

  return null;
}
