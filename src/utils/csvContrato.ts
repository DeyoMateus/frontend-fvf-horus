import type { LinhaContratoImportacao } from "../api/dadosContrato";

/**
 * Rodada 389: lê o CSV de dados de contrato (separador ";" ou ","; primeira
 * linha com os nomes das colunas). Colunas aceitas: cpf, admissao, cargo,
 * matricula, matricula_esocial, horario. Datas em AAAA-MM-DD ou DD/MM/AAAA.
 * Função pura: devolve as linhas válidas e os problemas de leitura.
 */
function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function dividir(linha: string, sep: string): string[] {
  const saida: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') aspas = false;
      else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      saida.push(atual);
      atual = "";
    } else atual += c;
  }
  saida.push(atual);
  return saida.map((x) => x.trim());
}

const CAMPOS: Record<string, keyof LinhaContratoImportacao> = {
  cpf: "cpf",
  admissao: "dataAdmissao",
  dataadmissao: "dataAdmissao",
  cargo: "cargo",
  matricula: "matricula",
  matriculaesocial: "matriculaEsocial",
  horario: "codigoHorario",
  codigohorario: "codigoHorario",
};

export function lerCsvContrato(texto: string): {
  linhas: LinhaContratoImportacao[];
  problemas: string[];
} {
  const problemas: string[] = [];
  const brutas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (brutas.length < 2) {
    return { linhas: [], problemas: ["O arquivo precisa ter a linha de títulos e ao menos uma linha de dados."] };
  }
  const sep = (brutas[0].match(/;/g)?.length ?? 0) >= (brutas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const colunas = dividir(brutas[0], sep).map((c) => CAMPOS[normalizar(c)]);
  if (!colunas.includes("cpf")) {
    return { linhas: [], problemas: ['Falta a coluna "cpf" na primeira linha.'] };
  }
  const linhas: LinhaContratoImportacao[] = [];
  for (let i = 1; i < brutas.length; i++) {
    const celulas = dividir(brutas[i], sep);
    const l: Partial<LinhaContratoImportacao> = {};
    colunas.forEach((campo, k) => {
      const v = (celulas[k] ?? "").trim();
      if (campo && v) (l as Record<string, string>)[campo] = v;
    });
    l.cpf = (l.cpf ?? "").replace(/\D/g, "");
    if (!/^\d{11}$/.test(l.cpf)) {
      problemas.push(`Linha ${i + 1}: CPF inválido (precisa ter 11 números).`);
      continue;
    }
    if (l.dataAdmissao) {
      const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(l.dataAdmissao);
      if (br) l.dataAdmissao = `${br[3]}-${br[2]}-${br[1]}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(l.dataAdmissao)) {
        problemas.push(`Linha ${i + 1}: data de admissão inválida (use AAAA-MM-DD ou DD/MM/AAAA).`);
        continue;
      }
    }
    linhas.push(l as LinhaContratoImportacao);
  }
  return { linhas, problemas };
}
