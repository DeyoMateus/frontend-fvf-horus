import { createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { useLocation, useSearchParams } from "react-router-dom";

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

const PREFIXO_ABA_LEMBRADA = "fvfhorus.aba.";

/** Rodada 755: última aba usada em cada tela, guardada só neste navegador. */
function lerAbaLembrada(caminho: string): string | null {
  try {
    return window.localStorage.getItem(PREFIXO_ABA_LEMBRADA + caminho);
  } catch {
    return null;
  }
}

function guardarAbaLembrada(caminho: string, aba: string): void {
  try {
    window.localStorage.setItem(PREFIXO_ABA_LEMBRADA + caminho, aba);
  } catch {
    // Navegador sem armazenamento (janela anônima etc.): só não lembra.
  }
}

/**
 * Ordem de escolha da aba: a da URL (`?aba=`); a `padrao`, quando o link pede uma seção
 * específica; a última usada nesta tela (rodada 755); a `inicial` da tela; a primeira.
 */
export function useAbaAtiva(abas: AbaDef[], padrao?: string, inicial?: string): string {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const existe = (id: string | null | undefined): id is string =>
    Boolean(id) && abas.some((a) => a.id === id);
  const pedida = params.get("aba");
  if (existe(pedida)) return pedida;
  if (existe(padrao)) return padrao;
  const lembrada = lerAbaLembrada(pathname);
  if (existe(lembrada)) return lembrada;
  if (existe(inicial)) return inicial;
  return abas[0].id;
}

export function AbasTopo({
  abas,
  padrao,
  inicial,
}: {
  abas: AbaDef[];
  padrao?: string;
  inicial?: string;
}) {
  const slot = useContext(SlotAbasContext);
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const ativa = useAbaAtiva(abas, padrao, inicial);
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
            guardarAbaLembrada(pathname, a.id);
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
