import { useEffect, useState } from "react";
import { listarColaboradoresParaSeletor } from "../api/motoristas";
import type { Motorista } from "../api/types";

/**
 * Lista de colaboradores para seletores e filtros (antes cada tela repetia o mesmo
 * useEffect). Usa a lista em memória de `listarColaboradoresParaSeletor`, então telas e
 * componentes que pedem ao mesmo tempo fazem uma requisição só. Em falha devolve lista vazia:
 * o seletor fica só com "Todos" e a tela continua funcionando.
 */
export function useColaboradores(): Motorista[] {
  const [colaboradores, setColaboradores] = useState<Motorista[]>([]);
  useEffect(() => {
    let ativo = true;
    listarColaboradoresParaSeletor()
      .then((lista) => {
        if (ativo) setColaboradores(lista);
      })
      .catch(() => {
        if (ativo) setColaboradores([]);
      });
    return () => {
      ativo = false;
    };
  }, []);
  return colaboradores;
}
