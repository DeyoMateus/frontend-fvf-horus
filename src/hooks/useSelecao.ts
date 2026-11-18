import { useCallback, useState } from "react";

/** Conjunto de itens marcados com caixa de seleção: marca/desmarca um item por vez. */
export function useSelecao<T = string>() {
  const [selecionados, setSelecionados] = useState<Set<T>>(() => new Set());
  const alternar = useCallback((item: T) => {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(item)) novo.delete(item);
      else novo.add(item);
      return novo;
    });
  }, []);
  return { selecionados, setSelecionados, alternar };
}
