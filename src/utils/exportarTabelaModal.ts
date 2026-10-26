/**
 * Exportação client-side (planilha Excel / impressão) dos dados já carregados num
 * popup de detalhe (drill-down de indicador/card do painel) , pedido do
 * usuário: "deve ser possível imprimir ou baixar esses dados dos
 * indicadores que abrem nessas telas". Não depende de nenhum endpoint
 * novo: usa as linhas que o popup já tem na tela.
 */

/** N45: texto iniciado por = + - @ tab ou CR vira fórmula no Excel; prefixa apóstrofo. */
function neutralizarCelula(valor: string): string {
  if (/^-?\d+([.,]\d+)?$/.test(valor)) return valor;
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

function escaparCelulaCsv(valorBruto: string): string {
  const valor = neutralizarCelula(valorBruto);
  if (/[",\n;]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/** Contexto opcional para o título/subtítulo da planilha (padrão: derivado do nome do arquivo). */
export interface OpcoesExportacaoTabela {
  titulo?: string;
  /** Período/filtro aplicado (ex.: "Período: 01/10/2026 a 13/10/2026"). */
  subtitulo?: string | null;
  campos?: Array<[string, string]>;
  /** Índices das linhas a destacar em negrito (ex.: totais). */
  linhasEmNegrito?: number[];
}

function tituloDoArquivo(nomeArquivo: string): string {
  const base = nomeArquivo
    .replace(/\.(csv|xlsx)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Relatório";
}

function baixarArquivo(blob: Blob, nome: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function baixarCsvSimples(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: string[][],
) {
  const conteudo = [cabecalhos, ...linhas]
    .map((linha) => linha.map(escaparCelulaCsv).join(";"))
    .join("\r\n");
  // BOM pra abrir certo no Excel com acentuação.
  baixarArquivo(
    new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8" }),
    nomeArquivo.replace(/\.xlsx$/i, ".csv"),
  );
}

/**
 * Rodada 233: o nome da função foi mantido (dezenas de chamadas), mas o
 * arquivo agora é uma planilha Excel (.xlsx) no mesmo modelo visual dos
 * PDFs. Se a biblioteca de planilha não carregar (ex.: sem rede), cai no
 * CSV antigo para o usuário nunca ficar sem o arquivo.
 */
export async function baixarCsvTabela(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: string[][],
  opcoes: OpcoesExportacaoTabela = {},
): Promise<void> {
  try {
    const { baixarPlanilhaXlsx } = await import("./exportarPlanilhaXlsx");
    await baixarPlanilhaXlsx({
      nomeArquivo,
      titulo: opcoes.titulo ?? tituloDoArquivo(nomeArquivo),
      subtitulo: opcoes.subtitulo,
      campos: opcoes.campos,
      cabecalhos,
      linhas,
      linhasEmNegrito: opcoes.linhasEmNegrito,
    });
  } catch {
    baixarCsvSimples(nomeArquivo, cabecalhos, linhas);
  }
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
  const geradoEm = new Date().toLocaleString("pt-BR");
  janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHtml(titulo)}</title>
<style>
  @page { margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111827; }
  .marca { font-size: 9px; font-weight: bold; letter-spacing: 2px; color: #6b7280; margin: 0 0 4px; }
  h1 { font-size: 20px; font-weight: bold; color: #1f2937; margin: 0 0 4px; }
  p.subtitulo { font-size: 11px; color: #6b7280; margin: 0 0 4px; }
  p.gerado { font-size: 11px; margin: 0 0 16px; }
  p.gerado b { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #1f2937; color: #ffffff; font-weight: bold; text-align: left; padding: 6px 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { padding: 6px 8px; border-bottom: 1px solid #d1d5db; text-align: left; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f3f4f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rodape { margin-top: 16px; font-size: 9px; font-style: italic; color: #6b7280; }
</style>
</head>
<body>
  <p class="marca">FVF HÓRUS</p>
  <h1>${escaparHtml(titulo)}</h1>
  ${subtitulo ? `<p class="subtitulo">${escaparHtml(subtitulo)}</p>` : ""}
  <p class="gerado"><b>Gerado em:</b> ${escaparHtml(geradoEm)}</p>
  <table>
    <thead><tr>${cabecalhoHtml}</tr></thead>
    <tbody>${linhasHtml}</tbody>
  </table>
  <p class="rodape">FVF Hórus - ${escaparHtml(titulo)} - gerado em ${escaparHtml(geradoEm)}</p>
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
