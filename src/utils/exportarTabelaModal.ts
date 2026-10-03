/**
 * Exportação client-side (CSV / impressão) dos dados já carregados num
 * popup de detalhe (drill-down de indicador/card do painel) , pedido do
 * usuário: "deve ser possível imprimir ou baixar esses dados dos
 * indicadores que abrem nessas telas". Não depende de nenhum endpoint
 * novo: usa as linhas que o popup já tem na tela.
 */

function escaparCelulaCsv(valor: string): string {
  if (/[",\n;]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function baixarCsvTabela(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: string[][],
) {
  const todasLinhas = [cabecalhos, ...linhas];
  const conteudo = todasLinhas
    .map((linha) => linha.map(escaparCelulaCsv).join(";"))
    .join("\r\n");
  // BOM pra abrir certo no Excel com acentuação.
  const blob = new Blob(["﻿" + conteudo], {
    type: "text/csv;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function imprimirTabela(
  titulo: string,
  subtitulo: string | null,
  cabecalhos: string[],
  linhas: string[][],
) {
  const janela = window.open("", "_blank", "width=900,height=700");
  if (!janela) return;
  const linhasHtml = linhas
    .map(
      (linha) =>
        `<tr>${linha.map((c) => `<td>${escaparHtml(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  const cabecalhoHtml = cabecalhos
    .map((c) => `<th>${escaparHtml(c)}</th>`)
    .join("");
  janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHtml(titulo)}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.subtitulo { font-size: 12px; color: #4b5563; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; }
</style>
</head>
<body>
  <h1>${escaparHtml(titulo)}</h1>
  ${subtitulo ? `<p class="subtitulo">${escaparHtml(subtitulo)}</p>` : ""}
  <table>
    <thead><tr>${cabecalhoHtml}</tr></thead>
    <tbody>${linhasHtml}</tbody>
  </table>
</body>
</html>`);
  janela.document.close();
  janela.focus();
  // Pequeno atraso pra garantir que o conteúdo renderizou antes do print.
  setTimeout(() => janela.print(), 200);
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Trava a rolagem do `body` enquanto um popup/modal está aberto , pedido
 * do usuário: "ao abrir não pode ser possível mover a tela de trás com a
 * rolagem ou clics". O clique já era bloqueado (o conteúdo do modal faz
 * `stopPropagation` e o fundo cobre a tela inteira), mas a ROLAGEM da
 * página de trás continuava funcionando por baixo do overlay. Chamar no
 * `useEffect` de montagem do modal e sempre restaurar no cleanup (mesmo
 * se dois modais abrirem em sequência, o `useEffect` de cada um só mexe
 * no próprio ciclo de vida).
 */
export function travarRolagemFundo(): () => void {
  const overflowOriginal = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = overflowOriginal;
  };
}
