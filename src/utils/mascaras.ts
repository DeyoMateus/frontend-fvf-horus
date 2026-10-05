/**
 * Máscaras de digitação (Rodada 53, pedido do usuário) , funções puras,
 * sem dependência de UI. O painel web não tem campo de data digitado
 * (todo `<input type="date">` já usa o seletor nativo do navegador),
 * então este arquivo só cobre CPF por enquanto.
 */

/** "12345678901" -> "123.456.789-01" (também funciona parcial, conforme a pessoa digita). */
export function aplicarMascaraCpf(textoDigitado: string): string {
  const digitos = textoDigitado.replace(/\D/g, "").slice(0, 11);
  const p1 = digitos.slice(0, 3);
  const p2 = digitos.slice(3, 6);
  const p3 = digitos.slice(6, 9);
  const p4 = digitos.slice(9, 11);
  if (digitos.length <= 3) return p1;
  if (digitos.length <= 6) return `${p1}.${p2}`;
  if (digitos.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}

/** Tira tudo que não for dígito , o CPF "cru" é o que a API espera (11 dígitos, sem pontuação). */
export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/**
 * Rodada 141 , datas "só dia" (folga) chegam da API como
 * "2026-10-04T00:00:00.000Z". `new Date(...).toLocaleDateString` converte
 * pro fuso local (UTC-3) e mostrava o dia ANTERIOR (03/10). Aqui só se
 * reformata o texto "AAAA-MM-DD", sem conversão de fuso.
 */
export function dataCalendarioBr(dataIso: string): string {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : dataIso;
}

/**
 * "AAAA-MM-DD" do dia no relógio LOCAL do navegador (Brasília para os
 * usuários do sistema). `toISOString().slice(0, 10)` devolve o dia UTC, que
 * já é "amanhã" a partir das 21h em Brasília (Rodada 144).
 */
export function dataLocalIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
