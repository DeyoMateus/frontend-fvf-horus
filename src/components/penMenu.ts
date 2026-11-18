import { useSyncExternalStore } from "react";

/**
 * Pendências por aba do menu lateral. O sininho (NotificationBell)
 * já consulta o servidor de tempos em tempos; ele publica aqui um resumo por
 * rota e o menu lateral mostra uma bolinha na aba que tem pendência
 */
export type PendenciaDaAba = {
  /** Total de itens pendentes na aba. */
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

/**
 * Fila única de pendências. O sino já busca tudo no servidor; aqui ele publica
 * também a lista item a item, e a tela "Pendências" só lê (nenhuma consulta nova).
 */
export type TipoItemDaFila = "alerta" | "ajuste" | "folga" | "privacidade" | "banco" | "radar";

export type ItemDaFila = {
  chave: string;
  tipo: TipoItemDaFila;
  quem: string;
  descricao: string;
  /** Quando a pendência nasceu (ISO); ausente em avisos sem data. */
  desde?: string;
  /** Onde a pendência é tratada. */
  to: string;
  /** Id do pedido (ajuste ou folga), para a decisão em lote. */
  id?: string;
  /** Colaborador da pendência, quando há um. */
  motoristaId?: string;
  /** Ajuste de ponto: horário do evento pedido (a aprovação segue essa ordem). */
  ordem?: string;
};

let fila: ItemDaFila[] = [];
const ouvintesFila = new Set<() => void>();

export function publicarFilaDePendencias(nova: ItemDaFila[]) {
  if (JSON.stringify(fila) === JSON.stringify(nova)) return;
  fila = nova;
  ouvintesFila.forEach((fn) => fn());
}

function assinarFila(fn: () => void) {
  ouvintesFila.add(fn);
  return () => {
    ouvintesFila.delete(fn);
  };
}

export function useFilaDePendencias(): ItemDaFila[] {
  return useSyncExternalStore(
    assinarFila,
    () => fila,
    () => fila,
  );
}
