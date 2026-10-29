import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { confirmarMfa, desativarMfa, iniciarMfa } from "../api/mfa";

function mensagem(e: unknown, padrao: string): string {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return padrao;
}

/**
 * Rodada 375 (passo 40): verificação em duas etapas (TOTP) do próprio usuário.
 * Sem biblioteca de QR: mostra a chave para digitar no aplicativo autenticador
 * (Google Authenticator, Microsoft Authenticator, Authy etc.) e o link otpauth.
 */
export interface AcoesMfa {
  iniciar: typeof iniciarMfa;
  confirmar: typeof confirmarMfa;
  desativar: typeof desativarMfa;
}

export function MfaCard({
  ativo,
  validoAte,
  expirado,
  onMudou,
  acoes,
}: {
  ativo: boolean;
  /** ISO da data em que a verificação expira (quando ativa). */
  validoAte?: string | null;
  /** Verificação expirou e precisa ser refeita. */
  expirado?: boolean;
  onMudou: () => void;
  /** Rodada 384: padrão é o MFA do painel; o super admin passa as suas. */
  acoes?: AcoesMfa;
}) {
  const a = acoes ?? { iniciar: iniciarMfa, confirmar: confirmarMfa, desativar: desativarMfa };
  const [etapa, setEtapa] = useState<"inicial" | "cadastro" | "reservas" | "desativar">("inicial");
  const [segredo, setSegredo] = useState("");
  const [uri, setUri] = useState("");
  const [codigo, setCodigo] = useState("");
  // Rodada 493: por quantos dias o MFA vale; vencido, e preciso cadastrar de novo.
  const [validadeDias, setValidadeDias] = useState(90);
  const [senha, setSenha] = useState("");
  const [reservas, setReservas] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function comecar() {
    setErro(null);
    setOcupado(true);
    try {
      const r = await a.iniciar();
      setSegredo(r.segredo);
      setUri(r.uri);
      setCodigo("");
      setEtapa("cadastro");
    } catch (e) {
      setErro(mensagem(e, "Não foi possível iniciar o cadastro."));
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const r = await a.confirmar(codigo.trim(), validadeDias);
      setReservas(r.codigosReserva);
      setSegredo("");
      setUri("");
      setCodigo("");
      setEtapa("reservas");
      onMudou();
    } catch (e) {
      setErro(mensagem(e, "Código inválido."));
    } finally {
      setOcupado(false);
    }
  }

  async function desativar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await a.desativar(senha, codigo.trim());
      setSenha("");
      setCodigo("");
      setEtapa("inicial");
      onMudou();
    } catch (e) {
      setErro(mensagem(e, "Não foi possível desativar."));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: "16px auto 0" }}>
      <h3 style={{ marginTop: 0 }}>Verificação em duas etapas</h3>

      {etapa === "reservas" ? (
        <>
          <p style={{ color: "#166534" }}>Verificação em duas etapas ativada.</p>
          <p style={{ fontSize: 13 }}>
            Guarde estes códigos de reserva em lugar seguro. Cada um vale uma vez e
            só aparece agora; use um deles se perder o celular.
          </p>
          <pre style={{ background: "#f3f4f6", padding: 8, borderRadius: 6 }}>
            {reservas.join("\n")}
          </pre>
          <button onClick={() => { setReservas([]); setEtapa("inicial"); }}>
            Já guardei
          </button>
        </>
      ) : etapa === "cadastro" ? (
        <form onSubmit={confirmar}>
          <p style={{ fontSize: 13 }}>
            1) No aplicativo autenticador, escolha "adicionar conta" e digite esta
            chave (tipo baseado em tempo):
          </p>
          <pre style={{ background: "#f3f4f6", padding: 8, borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {segredo}
          </pre>
          <p style={{ fontSize: 12 }}>
            No celular, este link também abre o aplicativo:{" "}
            <a href={uri}>abrir no autenticador</a>
          </p>
          <label>2) Digite o código de 6 números que o aplicativo mostra</label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
          <label style={{ marginTop: 8, display: "block" }}>
            3) Por quantos dias o MFA vale (de 1 a 365)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={validadeDias}
            onChange={(e) => setValidadeDias(Math.min(365, Math.max(1, Number(e.target.value) || 1)))}
            required
          />
          <p style={{ fontSize: 12, margin: "4px 0 0" }}>
            Ao fim desse prazo o MFA é revogado e você precisa cadastrar de novo antes de acessar.
          </p>
          {erro && <p className="error-text">{erro}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="submit" disabled={ocupado}>
              {ocupado ? "Confirmando…" : "Confirmar e ativar"}
            </button>
            <button type="button" className="secondary" onClick={() => setEtapa("inicial")}>
              Cancelar
            </button>
          </div>
        </form>
      ) : etapa === "desativar" ? (
        <form onSubmit={desativar}>
          <label>Senha atual</label>
          <input
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Código do autenticador (ou código de reserva)
          </label>
          <input
            autoComplete="one-time-code"
            maxLength={16}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
          {erro && <p className="error-text">{erro}</p>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="submit" disabled={ocupado}>
              {ocupado ? "Desativando…" : "Desativar"}
            </button>
            <button type="button" className="secondary" onClick={() => setEtapa("inicial")}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p style={{ fontSize: 14 }}>
            {expirado
              ? "Expirada. A validade escolhida terminou e a verificação foi revogada: cadastre de novo para continuar usando o sistema."
              : ativo
              ? `Ativada. No login, além da senha, é pedido o código do aplicativo autenticador.${validoAte ? ` Válida até ${new Date(validoAte).toLocaleDateString("pt-BR")}.` : ""}`
              : "Desativada. Ative para exigir, além da senha, um código do seu celular no login."}
          </p>
          {erro && <p className="error-text">{erro}</p>}
          {ativo ? (
            <button className="secondary" onClick={() => { setErro(null); setEtapa("desativar"); }}>
              Desativar
            </button>
          ) : (
            <button onClick={comecar} disabled={ocupado}>
              {ocupado ? "Preparando…" : "Ativar"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
