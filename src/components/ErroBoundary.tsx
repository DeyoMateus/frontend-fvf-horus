import * as Sentry from "@sentry/react";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * Rede de segurança: um erro de renderização numa tela não deixa mais o
 * painel inteiro em branco; mostra o aviso e um botão para recarregar.
 */
export class ErroBoundary extends Component<
  { children: ReactNode },
  { erro: boolean }
> {
  state = { erro: false };

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Erro de renderização", erro, info.componentStack);
    Sentry.captureException(erro);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, textAlign: "center" }}>
        <h2>Algo deu errado nesta tela</h2>
        <p style={{ fontSize: 14 }}>
          Seus dados não foram perdidos. Recarregue a página; se o problema
          continuar, avise o suporte informando o que você estava fazendo.
        </p>
        <button onClick={() => window.location.reload()}>Recarregar</button>{" "}
        <button
          className="secondary"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Ir para o painel
        </button>
      </div>
    );
  }
}
