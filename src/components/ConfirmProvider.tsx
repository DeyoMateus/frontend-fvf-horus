import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ConfirmOpcoes {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
}

interface PedidoConfirm extends ConfirmOpcoes {
  mensagem: string;
}

type ConfirmFn = (mensagem: string, opcoes?: ConfirmOpcoes) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Substitui window.confirm() por um modal com botões consistente com o
 * resto do painel (Rodada 95, pedido do usuário). `await confirm(...)`
 * se comporta igual ao window.confirm original (resolve `true`/`false`),
 * então os pontos de chamada continuam simples , só trocam
 * `window.confirm(x)` por `await confirm(x)`. Disponível pro app inteiro
 * via o hook useConfirm().
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirm | null>(null);
  const resolverRef = useRef<((resultado: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((mensagem, opcoes) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPedido({ mensagem, ...opcoes });
    });
  }, []);

  function responder(resultado: boolean) {
    resolverRef.current?.(resultado);
    resolverRef.current = null;
    setPedido(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pedido && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => responder(false)}
        >
          <div
            className="confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label={pedido.titulo ?? "Confirmação"}
            onClick={(e) => e.stopPropagation()}
          >
            {pedido.titulo && <h3>{pedido.titulo}</h3>}
            <p>{pedido.mensagem}</p>
            <div className="confirm-modal-acoes">
              <button
                type="button"
                className="secondary"
                onClick={() => responder(false)}
              >
                {pedido.textoCancelar ?? "Cancelar"}
              </button>
              <button
                type="button"
                className={pedido.perigo ? "danger" : ""}
                onClick={() => responder(true)}
                autoFocus
              >
                {pedido.textoConfirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm precisa ser usado dentro de <ConfirmProvider>");
  }
  return ctx;
}
