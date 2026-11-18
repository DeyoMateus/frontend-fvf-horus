import { useEffect, useState } from "react";
import { gravarLocal, lerLocal } from "../utils/armazenamentoLocal";

/**
 * Estado verdadeiro/falso lembrado neste navegador (menu lateral recolhido, gráficos minimizados
 * etc.). Lê na primeira renderização e grava a cada mudança; sem armazenamento disponível (janela
 * anônima, por exemplo), funciona normalmente e só não lembra.
 */
export function useEstadoLembrado(chave: string, inicial = false) {
  const [valor, setValor] = useState<boolean>(() => {
    const salvo = lerLocal(chave);
    return salvo === null ? inicial : salvo === "1";
  });

  useEffect(() => gravarLocal(chave, valor ? "1" : "0"), [chave, valor]);

  return [valor, setValor] as const;
}
