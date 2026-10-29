import { useEffect } from "react";

// Rodada 268 (inputs removidos na 280: só campos de texto longo) , mostra "n/limite" embaixo de TODO campo de texto que tem
// limite de caracteres (`maxLength`), em qualquer tela, atual ou futura.
// Os contadores ficam numa camada própria (fora da árvore do React), então
// não interferem nos formulários. O contador some quando o campo está
// escondido ou coberto por um popup. Fica amarelo a partir de 90% e
// vermelho no limite. Se o campo tem mínimo (`minLength`) e ainda não
// chegou nele, mostra também o mínimo.

type Campo = HTMLInputElement | HTMLTextAreaElement;

const TIPOS_COM_TEXTO = new Set([
  "text",
  "email",
  "password",
  "search",
  "tel",
  "url",
]);

function campoComLimite(el: Element): el is Campo {
  if (el instanceof HTMLTextAreaElement) return el.maxLength > 0;
  if (el instanceof HTMLInputElement) {
    return TIPOS_COM_TEXTO.has(el.type) && el.maxLength > 0;
  }
  return false;
}

export function ContadorDeCaracteres() {
  useEffect(() => {
    const camada = document.createElement("div");
    camada.setAttribute("data-contador-camada", "1");
    camada.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;z-index:9000;pointer-events:none;";
    document.body.appendChild(camada);

    const contadores = new Map<Campo, HTMLSpanElement>();
    let quadro = 0;
    let ultimaVarredura = 0;

    function varrer() {
      document
        .querySelectorAll<Campo>("textarea[maxlength]")
        .forEach((el) => {
          if (!campoComLimite(el) || contadores.has(el)) return;
          const span = document.createElement("span");
          span.style.cssText =
            "position:fixed;font:11px/1.2 system-ui,sans-serif;white-space:nowrap;display:none;";
          camada.appendChild(span);
          contadores.set(el, span);
        });
      contadores.forEach((span, el) => {
        if (!el.isConnected) {
          span.remove();
          contadores.delete(el);
        }
      });
    }

    function atualizar(agora: number) {
      if (agora - ultimaVarredura > 250) {
        ultimaVarredura = agora;
        varrer();
      }
      contadores.forEach((span, el) => {
        const r = el.getBoundingClientRect();
        const dentroDaTela =
          r.width > 0 &&
          r.height > 0 &&
          r.bottom > 0 &&
          r.top < window.innerHeight &&
          r.right > 0 &&
          r.left < window.innerWidth;
        let visivel = dentroDaTela && !el.disabled && !el.readOnly;
        if (visivel) {
          // coberto por popup/tour? então não mostra o contador por cima.
          const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1);
          const y = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1);
          const topo = document.elementFromPoint(x, y);
          visivel = !!topo && (topo === el || el.contains(topo) || topo.contains(el));
        }
        if (!visivel) {
          if (span.style.display !== "none") span.style.display = "none";
          return;
        }
        const tamanho = el.value.length;
        const max = el.maxLength;
        const min = el.minLength > 0 ? el.minLength : 0;
        let texto = `${tamanho}/${max}`;
        if (min > 0 && tamanho < min) texto += ` (mínimo ${min})`;
        if (span.textContent !== texto) span.textContent = texto;
        const cor =
          tamanho >= max
            ? "#b91c1c"
            : tamanho >= max * 0.9
              ? "#b45309"
              : "#000";
        const peso = tamanho >= max ? "700" : "400";
        if (span.style.color !== cor) span.style.color = cor;
        if (span.style.fontWeight !== peso) span.style.fontWeight = peso;
        span.style.display = "block";
        // canto direito, logo abaixo do campo (na folga de 12px entre campos)
        span.style.top = `${Math.round(r.bottom + 1)}px`;
        span.style.left = "auto";
        span.style.right = `${Math.round(window.innerWidth - r.right + 2)}px`;
      });
      agendar();
    }

    // Rodada 512 (N200): o laco por quadro so roda enquanto ha atividade (rolagem, digitacao,
    // redimensionamento, foco); parado, confere a cada 400 ms (1 s com a aba oculta).
    let ativoAte = 0;
    let temporizador = 0;
    function agendar() {
      cancelAnimationFrame(quadro);
      window.clearTimeout(temporizador);
      if (document.hidden) {
        temporizador = window.setTimeout(() => atualizar(performance.now()), 1000);
      } else if (performance.now() < ativoAte) {
        quadro = requestAnimationFrame(atualizar);
      } else {
        temporizador = window.setTimeout(() => atualizar(performance.now()), 400);
      }
    }
    function acordar() {
      ativoAte = performance.now() + 1000;
      agendar();
    }
    const eventos: Array<[EventTarget, string, boolean]> = [
      [window, "scroll", true],
      [window, "resize", false],
      [document, "input", true],
      [document, "focusin", true],
      [document, "click", true],
      [document, "visibilitychange", false],
    ];
    eventos.forEach(([alvo, nome, captura]) => alvo.addEventListener(nome, acordar, captura));

    acordar();
    return () => {
      cancelAnimationFrame(quadro);
      window.clearTimeout(temporizador);
      eventos.forEach(([alvo, nome, captura]) => alvo.removeEventListener(nome, acordar, captura));
      camada.remove();
    };
  }, []);

  return null;
}
