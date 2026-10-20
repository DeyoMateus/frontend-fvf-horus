const PARTICULAS = new Set(["da", "de", "di", "do", "du", "das", "dos", "e"]);

/**
 * Rodada 296: nome curto para tabelas, sempre com primeiro e segundo nome.
 * "Karen Cristina Lima" -> "Karen Cristina"; "Maria da Silva Souza" ->
 * "Maria da Silva" (a partícula "da/de/do..." não conta como nome).
 */
export function primeiroESegundoNome(nomeCompleto: string | null | undefined): string {
  const partes = (nomeCompleto ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(" ");
  const segundo = partes[1].toLowerCase();
  if (PARTICULAS.has(segundo)) return partes.slice(0, 3).join(" ");
  return partes.slice(0, 2).join(" ");
}
