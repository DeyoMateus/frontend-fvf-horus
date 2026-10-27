import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { listarContestacoesBanco, responderContestacaoBanco } from "../api/bancoHoras";
import type { ContestacaoBanco } from "../api/bancoHoras";
import { minParaHoras } from "../utils/formatarDuracao";

const dia = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function msg(e: unknown, padrao: string) {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return padrao;
}

/**
 * F15: contestações que o motorista fez no app sobre lançamentos do banco de horas.
 * Responder NÃO altera o saldo; se o lançamento estiver errado, corrija com um lançamento novo.
 */
export function ContestacoesBancoHoras({ motoristaId }: { motoristaId: string }) {
  const [lista, setLista] = useState<ContestacaoBanco[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLista(await listarContestacoesBanco(motoristaId));
      setErro(null);
    } catch (e) {
      setErro(msg(e, "Não foi possível carregar as contestações."));
    }
  }, [motoristaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) return <p role="alert">{erro}</p>;
  if (lista.length === 0) return null;

  async function enviar(c: ContestacaoBanco) {
    setOcupado(true);
    try {
      await responderContestacaoBanco(motoristaId, c.id, texto.trim());
      setRespondendo(null);
      setTexto("");
      await carregar();
    } catch (e) {
      setErro(msg(e, "Não foi possível enviar a resposta."));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h4>Contestações do motorista</h4>
      <table>
        <thead>
          <tr><th>Lançamento</th><th>Contestação</th><th>Situação</th></tr>
        </thead>
        <tbody>
          {lista.map((c) => (
            <tr key={c.id}>
              <td>
                nº {c.sequencial} · {dia(c.dataEvento)} · {minParaHoras(c.minutosEquivalentes)}
              </td>
              <td>{c.texto}</td>
              <td>
                {c.respondida ? (
                  "Respondida"
                ) : respondendo === c.id ? (
                  <div>
                    <textarea
                      minLength={10}
                      maxLength={400}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Resposta ao motorista (10 a 400 caracteres)"
                    />
                    <button type="button" disabled={ocupado || texto.trim().length < 10} onClick={() => void enviar(c)}>
                      Enviar resposta
                    </button>{" "}
                    <button type="button" disabled={ocupado} onClick={() => { setRespondendo(null); setTexto(""); }}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setRespondendo(c.id); setTexto(""); }}>
                    Responder
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, marginTop: 6 }}>
        Responder não altera o saldo. Para corrigir um erro, registre uma correção (lançamento novo).
      </p>
    </div>
  );
}
