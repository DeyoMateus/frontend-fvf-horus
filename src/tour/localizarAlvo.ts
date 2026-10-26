// Rodada 264 , encontra, na tela, o elemento que um passo do tour destaca.
//
// Expressões aceitas (tipo:valor, com sufixo opcional @n para o n-ésimo)
//   css:<seletor>      qualquer seletor CSS
//   titulo:<texto>     h1 a h4 (ou strong) cujo texto começa com o valor
//   rotulo:<texto>     label cujo texto começa com o valor (e o campo ao lado)
//   botao:<texto>      botão cujo texto contém o valor
//   coluna:<texto>     cabeçalho de tabela (th) cujo texto começa com o valor
//   selectcom:<texto>  select que tem uma opção com esse texto
//   texto:<texto>      menor elemento visível que contém o texto

function normalizar(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function visivel(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const estilo = window.getComputedStyle(el);
  return estilo.visibility !== "hidden" && estilo.display !== "none";
}

function escolher<T extends Element>(lista: T[], n: number): T | null {
  const v = lista.filter(visivel);
  return v[n] ?? null;
}

function subirSePequeno(el: HTMLElement): HTMLElement {
  // Um rótulo solto dentro de um cartão pequeno fica melhor destacando o
  // cartão todo (até 3 níveis, enquanto o texto continuar curto).
  let atual = el;
  for (let i = 0; i < 3; i++) {
    const pai = atual.parentElement;
    if (!pai || pai === document.body || pai.tagName === "MAIN") break;
    if (normalizar(pai.textContent ?? "").length > 90) break;
    atual = pai;
  }
  return atual;
}

export function localizarAlvo(expressao: string): HTMLElement[] | null {
  const pos = expressao.indexOf(":");
  if (pos < 0) return null;
  const tipo = expressao.slice(0, pos);
  let valor = expressao.slice(pos + 1);
  let n = 0;
  const m = valor.match(/@(\d+)$/);
  if (m) {
    n = Number(m[1]);
    valor = valor.slice(0, -m[0].length);
  }
  const alvo = normalizar(valor);

  // Rodada 340: nunca considera o que está dentro do próprio tour (balão,
  // escolha de módulo). Antes só o tipo "texto" fazia isso; os demais podiam
  // achar o título do balão ("Fechamento de ponto") quando o campo real ainda
  // não estava na tela, e o balão passava a apontar para si mesmo, pulando de
  // lugar a cada quadro.
  // Rodada 347: com uma tela de exemplo (palco) aberta, só o que está dentro
  // dela conta; a página real fica escondida por baixo.
  const palco = document.querySelector("[data-tour-palco]");
  const todos = (seletor: string) =>
    Array.from((palco ?? document).querySelectorAll<HTMLElement>(seletor)).filter(
      (e) => !e.closest("[data-tour-camada]"),
    );

  switch (tipo) {
    case "css": {
      try {
        const el = escolher(todos(valor), n);
        return el ? [el] : null;
      } catch {
        return null;
      }
    }
    case "titulo": {
      const el = escolher(
        todos("h1, h2, h3, h4, strong").filter((e) =>
          normalizar(e.textContent ?? "").startsWith(alvo),
        ),
        n,
      );
      return el ? [el] : null;
    }
    case "rotulo": {
      const lab = escolher(
        todos("label").filter((e) =>
          normalizar(e.textContent ?? "").startsWith(alvo),
        ),
        n,
      );
      if (!lab) return null;
      if (lab.querySelector("input, select, textarea")) return [lab];
      const prox = lab.nextElementSibling as HTMLElement | null;
      return prox && visivel(prox) ? [lab, prox] : [lab];
    }
    case "botao": {
      const el = escolher(
        todos("button").filter((e) =>
          normalizar(e.textContent ?? "").includes(alvo),
        ),
        n,
      );
      return el ? [el] : null;
    }
    case "coluna": {
      const el = escolher(
        todos("th").filter((e) =>
          normalizar(e.textContent ?? "").startsWith(alvo),
        ),
        n,
      );
      if (!el) return null;
      const tabela = el.closest("table");
      return [tabela && visivel(tabela) ? (tabela as HTMLElement) : el];
    }
    case "selectcom": {
      const el = escolher(
        todos("select").filter((s) =>
          Array.from((s as unknown as HTMLSelectElement).options).some(
            (o) => normalizar(o.text) === alvo,
          ),
        ),
        n,
      );
      return el ? [el] : null;
    }
    case "texto": {
      const candidatos = todos("body *").filter((e) => {
        if (e.closest("[data-tour-camada]")) return false;
        if (!normalizar(e.textContent ?? "").includes(alvo)) return false;
        // menor elemento que contém o texto (nenhum filho contém também)
        return !Array.from(e.children).some((f) =>
          normalizar(f.textContent ?? "").includes(alvo),
        );
      });
      const el = escolher(candidatos, n);
      return el ? [subirSePequeno(el)] : null;
    }
    default:
      return null;
  }
}

export interface Retangulo {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function retanguloDe(els: HTMLElement[]): Retangulo | null {
  const rs = els.filter((e) => e.isConnected).map((e) => e.getBoundingClientRect());
  if (rs.length === 0) return null;
  const top = Math.min(...rs.map((r) => r.top));
  const left = Math.min(...rs.map((r) => r.left));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  return { top, left, width: right - left, height: bottom - top };
}
