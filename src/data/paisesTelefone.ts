// Lista de países pro seletor de telefone (Rodada 41) , o usuário
// escolhe o país (bandeira + código de discagem) e digita só o DDD +
// número; o valor final enviado ao backend é sempre a concatenação em
// formato E.164 ("+<código><resto>"). Não é uma lista exaustiva dos
// ~195 países do mundo , cobre o Brasil (primeiro/padrão, é o público
// principal do sistema) e os países mais prováveis de aparecer num
// cadastro de transporte rodoviário/logística (Mercosul, resto das
// Américas, principais parceiros comerciais). Adicionar um país novo é
// só acrescentar uma linha aqui.
export interface PaisTelefone {
  nome: string;
  sigla: string;
  codigo: string; // com "+", ex.: "+55"
}

export const PAISES_TELEFONE: PaisTelefone[] = [
  { nome: "Brasil", sigla: "BR", codigo: "+55" },
  { nome: "Argentina", sigla: "AR", codigo: "+54" },
  { nome: "Bolívia", sigla: "BO", codigo: "+591" },
  { nome: "Chile", sigla: "CL", codigo: "+56" },
  { nome: "Colômbia", sigla: "CO", codigo: "+57" },
  { nome: "Equador", sigla: "EC", codigo: "+593" },
  { nome: "Paraguai", sigla: "PY", codigo: "+595" },
  { nome: "Peru", sigla: "PE", codigo: "+51" },
  { nome: "Uruguai", sigla: "UY", codigo: "+598" },
  { nome: "Venezuela", sigla: "VE", codigo: "+58" },
  { nome: "Estados Unidos", sigla: "US", codigo: "+1" },
  { nome: "Canadá", sigla: "CA", codigo: "+1" },
  { nome: "México", sigla: "MX", codigo: "+52" },
  { nome: "Portugal", sigla: "PT", codigo: "+351" },
  { nome: "Espanha", sigla: "ES", codigo: "+34" },
  { nome: "Itália", sigla: "IT", codigo: "+39" },
  { nome: "França", sigla: "FR", codigo: "+33" },
  { nome: "Alemanha", sigla: "DE", codigo: "+49" },
  { nome: "Reino Unido", sigla: "GB", codigo: "+44" },
  { nome: "China", sigla: "CN", codigo: "+86" },
  { nome: "Japão", sigla: "JP", codigo: "+81" },
];

export const PAIS_PADRAO = PAISES_TELEFONE[0]; // Brasil

/**
 * URL de uma imagem de bandeira (flagcdn.com) a partir da sigla do
 * país , usada no painel web em vez do emoji de bandeira porque o
 * Windows não tem os glifos de bandeira nas fontes do sistema: em
 * vez de desenhar a bandeira, o Chrome/Edge no Windows cai pro
 * fallback de mostrar as duas letras da sigla soltas, o que também
 * distorcia o tamanho do botão do país. Uma imagem real resolve os
 * dois problemas de uma vez.
 */
export function urlBandeira(sigla: string): string {
  return `https://flagcdn.com/24x18/${sigla.toLowerCase()}.png`;
}

/**
 * Tenta identificar o país e o número local a partir de um valor E.164
 * já salvo (ex.: "+5511999998888" → { pais: Brasil, numeroLocal:
 * "11999998888" }) , usado pra preencher o formulário na edição.
 * Quando nada bate (número antigo salvo fora do padrão, ou vazio),
 * cai no país padrão com o número local vazio.
 */
export function separarTelefone(valorE164: string | null | undefined): {
  pais: PaisTelefone;
  numeroLocal: string;
} {
  if (!valorE164 || !valorE164.startsWith("+")) {
    return { pais: PAIS_PADRAO, numeroLocal: "" };
  }
  // Ordena os códigos do mais longo pro mais curto antes de comparar,
  // pra "+1" não "roubar" um número que na verdade começa com "+591".
  const candidatos = [...PAISES_TELEFONE].sort(
    (a, b) => b.codigo.length - a.codigo.length,
  );
  for (const pais of candidatos) {
    if (valorE164.startsWith(pais.codigo)) {
      return { pais, numeroLocal: valorE164.slice(pais.codigo.length) };
    }
  }
  return { pais: PAIS_PADRAO, numeroLocal: valorE164.slice(1) };
}

export function montarTelefone(
  codigoPais: string,
  numeroLocal: string,
): string {
  const digitos = numeroLocal.replace(/\D/g, "");
  return digitos ? `${codigoPais}${digitos}` : "";
}
