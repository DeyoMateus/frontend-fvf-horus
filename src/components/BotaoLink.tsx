import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/** Rodada 271: no lugar de um link solto, um botão secundário que navega. */
export function BotaoLink({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="secondary" onClick={() => navigate(to)}>
      {children}
    </button>
  );
}
