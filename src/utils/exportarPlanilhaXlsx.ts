/**
 * Rodada 233: planilha Excel (.xlsx) no MESMO modelo visual dos PDFs do
 * FVF Hórus (ver backend/src/common/pdf/relatorio-pdf.ts): marca pequena,
 * título grande, subtítulo cinza, pares "Rótulo: valor", faixa de cabeçalho
 * escura, linhas zebradas com filete cinza e nota final em cinza.
 *
 * A biblioteca `exceljs` é carregada por import dinâmico, só quando o
 * usuário clica em baixar, para não pesar o bundle inicial do painel.
 */
import type { Workbook, Worksheet, Cell } from "exceljs";

export const COR_TEXTO = "FF111827";
export const COR_SUAVE = "FF6B7280";
export const COR_LINHA = "FFD1D5DB";
export const COR_CABECALHO = "FF1F2937";
export const COR_FAIXA = "FFF3F4F6";
const COR_BRANCO = "FFFFFFFF";
const FONTE = "Arial";

export type CelulaPlanilha = string | number | null | undefined;

export interface OpcoesPlanilhaXlsx {
  /** Nome do arquivo; a extensão é forçada para .xlsx. */
  nomeArquivo: string;
  titulo: string;
  subtitulo?: string | null;
  /** Pares "rótulo: valor" abaixo do subtítulo ("Gerado em" é acrescentado sozinho). */
  campos?: Array<[string, string]>;
  cabecalhos: string[];
  linhas: CelulaPlanilha[][];
  /** Índices (0-based, em `linhas`) a destacar em negrito (ex.: linhas de total). */
  linhasEmNegrito?: number[];
  /** Texto da nota final; padrão: "FVF Hórus - <título> - gerado em <data>". */
  nota?: string;
  /** Nome da aba (máx. 31 caracteres); padrão: o título. */
  nomeAba?: string;
  /** Formato numérico das células numéricas (ex.: "0.00"). */
  formatoNumero?: string;
}

const NUMERO_TEXTO = /^-?\d+([.,]\d+)?$/;

function textoCelula(v: CelulaPlanilha): string {
  return v === null || v === undefined ? "" : String(v);
}

function nomeAbaSeguro(nome: string): string {
  const limpo = nome.replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim();
  return (limpo || "Dados").slice(0, 31);
}

/** Troca/força a extensão .xlsx e remove caracteres inválidos no nome do arquivo. */
export function nomeArquivoXlsx(nome: string): string {
  const base = nome
    .replace(/\.(csv|xlsx)$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();
  return `${base || "planilha"}.xlsx`;
}

/** Largura (em caracteres) pelo maior texto da coluna, com mínimo e máximo. */
function larguraColuna(cabecalho: string, valores: string[]): number {
  let maior = cabecalho.length + 3; // folga para o botão do autofiltro
  for (const v of valores) {
    for (const parte of v.split("\n")) {
      if (parte.length > maior) maior = parte.length;
    }
  }
  return Math.min(60, Math.max(10, maior + 2));
}

const BORDA_FINA = {
  style: "thin" as const,
  color: { argb: COR_LINHA },
};

export async function montarPlanilhaXlsx(
  opcoes: OpcoesPlanilhaXlsx,
): Promise<Workbook> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("exceljs");
  const ExcelJS = mod.default ?? mod;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "FVF Hórus";
  wb.created = new Date();
  wb.title = opcoes.titulo;

  const ws: Worksheet = wb.addWorksheet(
    nomeAbaSeguro(opcoes.nomeAba ?? opcoes.titulo),
    {
      views: [{ showGridLines: false }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      },
    },
  );

  const totalCols = Math.max(1, opcoes.cabecalhos.length);
  const geradoEm = new Date().toLocaleString("pt-BR");

  // Larguras e alinhamento a partir do conteúdo da tabela.
  const textos = opcoes.linhas.map((l) =>
    opcoes.cabecalhos.map((_, i) => textoCelula(l[i])),
  );
  const colunaNumerica = opcoes.cabecalhos.map((_, i) => {
    let temValor = false;
    for (let r = 0; r < opcoes.linhas.length; r++) {
      const bruto = opcoes.linhas[r][i];
      const t = textos[r][i];
      if (t === "") continue;
      temValor = true;
      if (typeof bruto !== "number" && !NUMERO_TEXTO.test(t)) return false;
    }
    return temValor;
  });
  ws.columns = opcoes.cabecalhos.map((c, i) => ({
    width: larguraColuna(
      c,
      textos.map((t) => t[i]),
    ),
  }));

  // Bloco de cabeçalho do documento.
  let linha = 1;
  const marca = ws.getCell(linha, 1);
  marca.value = "FVF HÓRUS";
  marca.font = { name: FONTE, size: 9, bold: true, color: { argb: COR_SUAVE } };
  linha++;

  const titulo = ws.getCell(linha, 1);
  titulo.value = opcoes.titulo;
  titulo.font = {
    name: FONTE,
    size: 20,
    bold: true,
    color: { argb: COR_CABECALHO },
  };
  titulo.alignment = { vertical: "middle" };
  ws.getRow(linha).height = 30;
  linha++;

  if (opcoes.subtitulo) {
    const sub = ws.getCell(linha, 1);
    sub.value = opcoes.subtitulo;
    sub.font = { name: FONTE, size: 10, color: { argb: COR_SUAVE } };
    linha++;
  }

  const campos: Array<[string, string]> = [
    ...(opcoes.campos ?? []),
    ["Gerado em", geradoEm],
  ];
  for (const [rotulo, valor] of campos) {
    const c = ws.getCell(linha, 1);
    c.value = {
      richText: [
        {
          text: `${rotulo}: `,
          font: { name: FONTE, size: 9, bold: true, color: { argb: COR_SUAVE } },
        },
        {
          text: valor,
          font: { name: FONTE, size: 10, color: { argb: COR_TEXTO } },
        },
      ],
    };
    linha++;
  }

  linha++; // linha em branco

  // Faixa de cabeçalho da tabela.
  const linhaCab = linha;
  const rowCab = ws.getRow(linhaCab);
  rowCab.height = 20;
  opcoes.cabecalhos.forEach((texto, i) => {
    const c: Cell = rowCab.getCell(i + 1);
    c.value = texto;
    c.font = { name: FONTE, size: 10, bold: true, color: { argb: COR_BRANCO } };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COR_CABECALHO },
    };
    c.alignment = {
      vertical: "middle",
      horizontal: colunaNumerica[i] ? "right" : "left",
      wrapText: true,
    };
  });
  linha++;

  // Linhas de dados zebradas.
  const negrito = new Set(opcoes.linhasEmNegrito ?? []);
  opcoes.linhas.forEach((dados, r) => {
    const row = ws.getRow(linha);
    for (let i = 0; i < opcoes.cabecalhos.length; i++) {
      const c = row.getCell(i + 1);
      const bruto = dados[i];
      if (typeof bruto === "number") {
        c.value = bruto;
        if (opcoes.formatoNumero) c.numFmt = opcoes.formatoNumero;
      } else {
        c.value = textos[r][i];
      }
      c.font = {
        name: FONTE,
        size: 10,
        bold: negrito.has(r),
        color: { argb: COR_TEXTO },
      };
      c.alignment = {
        vertical: "top",
        wrapText: true,
        horizontal: colunaNumerica[i] ? "right" : "left",
      };
      if (r % 2 === 1) {
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COR_FAIXA },
        };
      }
      c.border = { bottom: BORDA_FINA };
    }
    linha++;
  });

  // Painel congelado abaixo do cabeçalho da tabela + autofiltro.
  ws.views = [
    { state: "frozen", ySplit: linhaCab, showGridLines: false },
  ];
  ws.autoFilter = {
    from: { row: linhaCab, column: 1 },
    to: { row: linhaCab, column: totalCols },
  };

  // Nota final.
  linha++;
  const nota = ws.getCell(linha, 1);
  nota.value =
    opcoes.nota ?? `FVF Hórus - ${opcoes.titulo} - gerado em ${geradoEm}`;
  nota.font = {
    name: FONTE,
    size: 9,
    italic: true,
    color: { argb: COR_SUAVE },
  };

  ws.pageSetup.printTitlesRow = `${linhaCab}:${linhaCab}`;
  return wb;
}

export async function baixarPlanilhaXlsx(
  opcoes: OpcoesPlanilhaXlsx,
): Promise<void> {
  const wb = await montarPlanilhaXlsx(opcoes);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivoXlsx(opcoes.nomeArquivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
