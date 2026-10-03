import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

interface PromptOpcoes {
  titulo?: string;
  /** Valor inicial do campo. */
  valorInicial?: string;
  placeholder?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
  /** Campo de texto maior (ex.: motivo mais longo) em vez de uma linha só. */
  multilinha?: boolean;
  /** Valida o valor digitado; devolve uma mensagem de erro (bloqueia
   * "Confirmar") ou `null`/`undefined` quando está tudo certo. Ausente =
   * qualquer valor (inclusive vazio) é aceito, igual ao window.prompt
   * original. */
  validar?: (valor: string) => string | null | undefined;
}

interface PedidoPrompt extends PromptOpcoes {
  mensagem: string;
}

type PromptFn = (
  mensagem: string,
  opcoes?: PromptOpcoes,
) => Promise<string | null>;

const PromptContext = createContext<PromptFn | null>(null);

/**
 * Substitui window.prompt() por um modal consistente com o resto do
 * painel (mesmo visual do ConfirmProvider) , pedido do usuário: "todos
 * os alerts devem ser substituidos por toast" (window.prompt/confirm são
 * diálogos nativos do navegador, na prática o mesmo problema do
 * window.alert/confirm já resolvido antes: travam a tela toda e destoam
 * do resto da interface). `await prompt(...)` se comporta igual ao
 * window.prompt original , cancelar devolve `null`, confirmar (mesmo
 * com o campo vazio, se não houver `validar` obrigando preencher)
 * devolve a string digitada , então os pontos de chamada continuam
 * simples, só trocam `window.prompt(x)` por `await prompt(x)`.
 */
export function PromptProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoPrompt | null>(null);
  const [valor, setValor] = useState("");
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const resolverRef = useRef<((resultado: string | null) => void) | null>(
    null,
  );

  const prompt = useCallback<PromptFn>((mensagem, opcoes) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setValor(opcoes?.valorInicial ?? "");
      setErroValidacao(null);
      setPedido({ mensagem, ...opcoes });
    });
  }, []);

  function responder(resultado: string | null) {
    resolverRef.current?.(resultado);
    resolverRef.current = null;
    setPedido(null);
    setValor("");
    setErroValidacao(null);
  }

  function onConfirmar(e?: FormEvent) {
    e?.preventDefault();
    const msg = pedido?.validar?.(valor);
    if (msg) {
      setErroValidacao(msg);
      return;
    }
    responder(valor);
  }

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {pedido && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => responder(null)}
        >
          <form
            className="confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label={pedido.titulo ?? "Confirmação"}
            onClick={(e) => e.stopPropagation()}
            onSubmit={onConfirmar}
          >
            {pedido.titulo && <h3>{pedido.titulo}</h3>}
            <p>{pedido.mensagem}</p>
            {pedido.multilinha ? (
              <textarea
                autoFocus
                rows={3}
                placeholder={pedido.placeholder}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErroValidacao(null);
                }}
              />
            ) : (
              <input
                type="text"
                autoFocus
                placeholder={pedido.placeholder}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErroValidacao(null);
                }}
              />
            )}
            {erroValidacao && (
              <p className="error-text" style={{ marginTop: -8 }}>
                {erroValidacao}
              </p>
            )}
            <div className="confirm-modal-acoes">
              <button
                type="button"
                className="secondary"
                onClick={() => responder(null)}
              >
                {pedido.textoCancelar ?? "Cancelar"}
              </button>
              <button type="submit" className={pedido.perigo ? "danger" : ""}>
                {pedido.textoConfirmar ?? "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PromptContext.Provider>
  );
}

export function usePrompt(): PromptFn {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    throw new Error("usePrompt precisa ser usado dentro de <PromptProvider>");
  }
  return ctx;
}
