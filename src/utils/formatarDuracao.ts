/**
 * Rodada 61 , pedido do usuário: os cards de horas mostravam sempre
 * hora decimal (ex.: "0.4h"), formato que confunde quem não está
 * acostumado a converter fração de hora pra minutos de cabeça. Agora:
 * - abaixo de 1 hora: "MM:SS" (ex.: 21min30s → "21:30")
 * - a partir de 1 hora: "HH:MM" (ex.: 60min → "01:00")
 *
 * Aceita minutos fracionados (ex.: 21.5) , comum em somas de duração
 * real (direção/espera), não só valores inteiros , convertendo pra
 * segundos antes de formatar, sem perder a precisão.
 *
 * Rodada 63 , o próprio formato "MM:SS" gerou confusão real: um
 * card de "26 minutos e 0 segundos" de espera aparecia como "26:00",
 * e foi lido como "26 horas" (formato HH:MM), abrindo uma investigação
 * de bug que não existia , o dado sempre esteve correto, só a leitura
 * do texto sem unidade é ambígua. Por isso agora sempre acompanha uma
 * unidade textual (" m" abaixo de 1h, " h" a partir de 1h), sem
 * mudar os números em si , só remove a ambiguidade entre os dois
 * formatos.
 */
export function minParaHoras(minutos: number): string {
  const sinal = minutos < 0 ? "-" : "";
  // Rodada 159: abaixo de 1h mostra só o número de minutos ("55 m", nunca
  // "55:00 m"); a partir de 1h, "HH:MM h".
  const totalMin = Math.round(Math.abs(minutos));
  if (totalMin >= 60) {
    const horas = Math.floor(totalMin / 60);
    const resto = totalMin % 60;
    return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")} h`;
  }
  return `${sinal}${totalMin} m`;
}
