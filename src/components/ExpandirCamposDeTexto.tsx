import { useEffect } from "react";

// Rodada 270 , todo campo de texto de várias linhas (textarea) cresce em
// altura conforme o texto, nunca esconde o que foi digitado. Quando o
// campo fica maior que a tela, é a própria página (ou o popup) que rola.
// Vale para os textareas atuais e futuros, sem mexer em cada um.

export function ExpandirCamposDeTexto() {
  useEffect(() => {
    let quadro = 0;
    const ultimo = new WeakMap<HTMLTextAreaElement, string>();

    function ajustar(el: HTMLTextAreaElement) {
      el.style.overflowY = "hidden";
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    }

    function ciclo() {
      document.querySelectorAll<HTMLTextAreaElement>("textarea").forEach((el) => {
        if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") {
          return; // escondido
        }
        const chave = `${el.value}|${el.clientWidth}`;
        if (ultimo.get(el) === chave) return;
        ultimo.set(el, chave);
        ajustar(el);
      });
      quadro = requestAnimationFrame(ciclo);
    }
    quadro = requestAnimationFrame(ciclo);
    return () => cancelAnimationFrame(quadro);
  }, []);

  return null;
}
