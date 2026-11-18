/**
 * Leitura e gravação no localStorage sem quebrar quando o navegador não oferece armazenamento
 * (janela anônima, bloqueio de cookies): a leitura devolve null e a gravação é ignorada.
 */
export function lerLocal(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

/** Grava o valor; `null` apaga a chave. */
export function gravarLocal(chave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento: só não lembra.
  }
}

/** Lê um JSON guardado; devolve `padrao` se não houver, estiver corrompido ou sem armazenamento. */
export function lerJsonLocal<T>(chave: string, padrao: T): T {
  const bruto = lerLocal(chave);
  if (bruto === null) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

export function gravarJsonLocal(chave: string, valor: unknown): void {
  gravarLocal(chave, JSON.stringify(valor));
}
