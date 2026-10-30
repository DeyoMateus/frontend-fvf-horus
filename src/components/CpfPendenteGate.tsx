import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { aplicarMascaraCpf, somenteDigitos } from "../utils/mascaras";
import { cpfValido } from "../utils/cpf";

/**
 * Rodada 537 (N136): quem altera dados que vao no AFD (empresa, cadastro de motorista) precisa ter
 * CPF no cadastro; ele vai no campo "CPF do responsavel". Quem ja existia e ainda nao informou fica
 * preso nesta tela no proximo acesso ate informar. O servidor tambem recusa essas alteracoes sem CPF,
 * entao a tela e so a forma de resolver. Se o servidor nao responder, o painel nao abre (falha fechada).
 */
export function CpfPendenteGate({
  carregarPendencia,
  salvarCpf,
  children,
}: {
  carregarPendencia: () => Promise<boolean>;
  salvarCpf: (cpf: string) => Promise<void>;
  children: ReactNode;
}) {
  const [estado, setEstado] = useState<"carregando" | "pendente" | "liberado" | "erro">("carregando");
  const [tentativa, setTentativa] = useState(0);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setEstado("carregando");
    carregarPendencia()
      .then((pendente) => {
        if (!cancelado) setEstado(pendente ? "pendente" : "liberado");
      })
      .catch(() => {
        if (!cancelado) setEstado("erro");
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const digitos = somenteDigitos(texto);
    if (!cpfValido(digitos)) {
      setErro("CPF inválido. Confira os números.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await salvarCpf(digitos);
      setEstado("liberado");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErro(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Não foi possível salvar o CPF."));
    } finally {
      setSalvando(false);
    }
  }

  if (estado === "carregando") return <p style={{ padding: 24 }}>Carregando...</p>;
  if (estado === "erro") {
    return (
      <div style={{ padding: 24 }}>
        <p>Não foi possível confirmar o seu cadastro. Verifique a conexão e tente novamente.</p>
        <button type="button" onClick={() => setTentativa((t) => t + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (estado === "pendente") {
    return (
      <div style={{ maxWidth: 460, margin: "48px auto", padding: 24 }}>
        <h2>Informe o seu CPF</h2>
        <p>
          O CPF de quem altera dados da empresa ou o cadastro de motoristas é registrado no arquivo
          fiscal (AFD). Para continuar, informe o seu CPF. Depois de salvo, só o suporte consegue
          corrigi-lo.
        </p>
        <form onSubmit={enviar}>
          <label>CPF</label>
          <input
            inputMode="numeric"
            autoComplete="off"
            value={texto}
            onChange={(e) => setTexto(aplicarMascaraCpf(e.target.value))}
            maxLength={14}
            required
          />
          {erro && <p style={{ color: "#b00020" }}>{erro}</p>}
          <button type="submit" disabled={salvando} style={{ marginTop: 12 }}>
            {salvando ? "Salvando..." : "Salvar CPF"}
          </button>
        </form>
      </div>
    );
  }
  return <>{children}</>;
}
