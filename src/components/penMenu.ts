import { useSyncExternalStore } from "react";

/**
 * Rodada 335: pendências por aba do menu lateral. O sininho (NotificationBell)
 * já consulta o servidor de tempos em tempos; ele publica aqui um resumo por
 * rota e o menu lateral mostra uma bolinha na aba que tem pendência
 */
export type PendenciaDaAba = {
  /** Total de itens pendentes na aba
  total: number;
  /** Linhas curtas para o resumo ao passar o cursor na bolinha. */
  resumo: string[];
};

let estado: Record<string, PendenciaDaAba> = {};
const ouvintes = new Set<() => void>();

export function publicarPendenciasDoMenu(novo: Record<string, PendenciaDaAba>) {
  const antigo = JSON.stringify(estado);
  if (antigo === JSON.stringify(novo)) return;
  estado = novo;
  ouvintes.forEach((fn) => fn());
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

export function usePendenciasDoMenu(): Record<string, PendenciaDaAba> {
  return useSyncExternalStore(
    assinar,
    () => estado,
    () => estado,
  );
}
