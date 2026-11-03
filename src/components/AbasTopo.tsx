import { createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";

/**
 * Rodada 626: barra de abas no topo do conteúdo (mesma linha do sino de
 * notificações), no estilo do menu lateral. O `Layout` entrega o elemento onde
 * as abas são desenhadas (portal) e cada página declara suas abas. A aba
 * ativa fica na URL (`?aba=`), então o tour guiado e os links das
 * notificações conseguem abrir a aba certa.
 */
export const SlotAbasContext = createContext<HTMLElement | null>(null);

export interface AbaDef {
  id: string;
  rotulo: string;
}

export function useAbaAtiva(abas: AbaDef[], padrao?: string): string {
  const [params] = useSearchParams();
  const pedida = params.get("aba");
  if (pedida && abas.some((a) => a.id === pedida)) return pedida;
  if (padrao && abas.some((a) => a.id === padrao)) return padrao;
  return abas[0].id;
}

export function AbasTopo({ abas, padrao }: { abas: AbaDef[]; padrao?: string }) {
  const slot = useContext(SlotAbasContext);
  const [params, setParams] = useSearchParams();
  const ativa = useAbaAtiva(abas, padrao);
  if (!slot) return null;
  return createPortal(
    <nav className="abas-topo" role="tablist" aria-label="Seções desta página">
      {abas.map((a) => (
        <button
          key={a.id}
          type="button"
          role="tab"
          aria-selected={a.id === ativa}
          className={a.id === ativa ? "aba-topo ativa" : "aba-topo"}
          onClick={() => {
            const novo = new URLSearchParams(params);
            novo.set("aba", a.id);
            novo.delete("secao");
            setParams(novo);
          }}
        >
          {a.rotulo}
        </button>
      ))}
    </nav>,
    slot,
  );
}
