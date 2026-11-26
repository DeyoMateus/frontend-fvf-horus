import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mensagemDoErro } from "../utils/mensagemDoErro";

type TipoToast = "sucesso" | "erro" | "info";

interface ToastItem {
  id: number;
  tipo: TipoToast;
  mensagem: string;
}

interface ToastContextValor {
  sucesso: (mensagem: string) => void;
  erro: (mensagem: string) => void;
  info: (mensagem: string) => void;
}

const ToastContext = createContext<ToastContextValor | null>(null);

const DURACAO_MS = 5000;

/**
 * Substitui window.alert() por um toast não-bloqueante no canto da tela
 * (Rodada 95, pedido do usuário: "troque os alerts... por toast"). Fica
 * disponível pro app inteiro , ver <ToastProvider> em App.tsx , via o
 * hook useToast().
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const proximoId = useRef(1);

  const remover = useCallback((id: number) => {
    setItens((atual) => atual.filter((i) => i.id !== id));
  }, []);

  const adicionar = useCallback(
    (tipo: TipoToast, mensagem: string) => {
      const id = proximoId.current++;
      setItens((atual) => [...atual, { id, tipo, mensagem }]);
      window.setTimeout(() => remover(id), DURACAO_MS);
    },
    [remover],
  );

  // Rodada 790: rede de segurança. Ação do painel que chama a API sem `catch` (ex.: baixar PDF,
  // aprovar troca de aparelho) deixava o erro só no console, sem aviso nenhum. Qualquer erro de
  // requisição que ninguém tratou vira um aviso com a mensagem do servidor. 401 fica de fora
  // (o interceptor já leva ao login) e requisição cancelada também.
  useEffect(() => {
    function aoRejeitarSemTratamento(evento: PromiseRejectionEvent) {
      const r = evento.reason as {
        isAxiosError?: boolean;
        code?: string;
        response?: { status?: number };
      } | null;
      if (!r?.isAxiosError) return;
      if (r.code === "ERR_CANCELED" || r.response?.status === 401) return;
      adicionar(
        "erro",
        mensagemDoErro(
          r,
          r.response
            ? "Não foi possível concluir a ação."
            : "Sem conexão com o servidor. Tente de novo.",
        ),
      );
    }
    window.addEventListener("unhandledrejection", aoRejeitarSemTratamento);
    return () =>
      window.removeEventListener("unhandledrejection", aoRejeitarSemTratamento);
  }, [adicionar]);

  const valor: ToastContextValor = {
    sucesso: (mensagem) => adicionar("sucesso", mensagem),
    erro: (mensagem) => adicionar("erro", mensagem),
    info: (mensagem) => adicionar("info", mensagem),
  };

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-container" role="region" aria-live="polite">
        {itens.map((item) => (
          <div
            key={item.id}
            className={`toast toast-${item.tipo}`}
            role="status"
          >
            <span className="toast-mensagem">{item.mensagem}</span>
            <button
              type="button"
              className="toast-fechar"
              aria-label="Fechar aviso"
              onClick={() => remover(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValor {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast precisa ser usado dentro de <ToastProvider>");
  }
  return ctx;
}
