import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  baixarFechamentoPdf,
  compararFechamento,
  fecharPeriodo,
  listarFechamentos,
  verificarFechamento,
} from "../api/fechamentosPeriodo";
import type { ComparacaoFechamento, FechamentoPeriodo, VerificacaoFechamento } from "../api/fechamentosPeriodo";

const dia = (s: string) => s.slice(0, 10).split("-").reverse().join("/");

function msg(e: unknown, padrao: string) {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return padrao;
}

/** Rodada 712 (N529): fechamentos do motorista, verificacao de integridade e comparacao com a apuracao viva. */
export function FechamentosPeriodoPainel({ motoristaId }: { motoristaId: string }) {
  const [lista, setLista] = useState<FechamentoPeriodo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verif, setVerif] = useState<Record<string, VerificacaoFechamento>>({});
  const [comp, setComp] = useState<Record<string, ComparacaoFechamento>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [incompleto, setIncompleto] = useState(false);

  async function carregar() {
    try {
      setLista(await listarFechamentos(motoristaId));
    } catch (e) {
      setErro(msg(e, "Não foi possível carregar os fechamentos."));
    }
  }

  useEffect(() => {
    setLista([]);
    setVerif({});
    setComp({});
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoristaId]);

  async function acao(id: string, fn: () => Promise<void>) {
    setErro(null);
    setOcupado(id);
    try {
      await fn();
    } catch (e) {
      setErro(msg(e, "Não foi possível concluir a operação."));
    } finally {
      setOcupado(null);
    }
  }

  async function fechar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setAviso(null);
    setOcupado("novo");
    try {
      await fecharPeriodo({
        motoristaId,
        inicio,
        fim,
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        ...(incompleto ? { aceitarIncompleto: true } : {}),
      });
      setAviso("Período fechado.");
      setMotivo("");
      await carregar();
    } catch (e) {
      setErro(msg(e, "Não foi possível fechar o período."));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Fechamentos de período</h3>
      {erro && <p className="error-text">{erro}</p>}
      {aviso && <p style={{ color: "#166534", fontSize: 13 }}>{aviso}</p>}

      <form onSubmit={fechar} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label>
          Início
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </label>
        <label>
          Fim
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
        </label>
        <label style={{ minWidth: 240 }}>
          Motivo (obrigatório ao reabrir)
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={1000} />
        </label>
        <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" checked={incompleto} onChange={(e) => setIncompleto(e.target.checked)} />
          Aceitar pontos suspeitos fora do cálculo
        </label>
        <button type="submit" disabled={ocupado === "novo"}>
          Fechar período
        </button>
      </form>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Período</th>
            <th>Versão</th>
            <th>Regra do período</th>
            <th>Criado em</th>
            <th>Motivo da reabertura</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum fechamento.</td>
            </tr>
          )}
          {lista.map((f) => {
            const v = verif[f.id];
            const c = comp[f.id];
            return (
              <tr key={f.id}>
                <td>
                  {dia(f.periodoInicio)} a {dia(f.periodoFim)}
                </td>
                <td>{f.versao}</td>
                <td>
                  {f.regrasAplicadas && f.regrasAplicadas.length > 0
                    ? f.regrasAplicadas.map((t) => (
                        <div key={`${t.de}-${t.regraId ?? "lei"}`} style={{ fontSize: 13 }}>
                          {t.de.split("-").reverse().join("/")} a {t.ate.split("-").reverse().join("/")}:{" "}
                          {t.nome ? `${t.nome}${t.versao ? ` (v${t.versao})` : ""}` : "Mínimos da lei"}
                        </div>
                      ))
                    : "—"}
                </td>
                <td>{dia(f.criadoEm)}</td>
                <td>{f.motivoReabertura ?? "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={ocupado === f.id}
                      onClick={() => acao(f.id, async () => setVerif({ ...verif, [f.id]: await verificarFechamento(f.id) }))}
                    >
                      Verificar integridade
                    </button>
                    <button
                      type="button"
                      disabled={ocupado === f.id}
                      onClick={() => acao(f.id, async () => setComp({ ...comp, [f.id]: await compararFechamento(f.id) }))}
                    >
                      Comparar com apuração atual
                    </button>
                    <button
                      type="button"
                      disabled={ocupado === f.id}
                      onClick={() =>
                        acao(f.id, () =>
                          baixarFechamentoPdf(f.id, `fechamento-${f.periodoInicio.slice(0, 10)}-v${f.versao}.pdf`),
                        )
                      }
                    >
                      PDF
                    </button>
                  </div>
                  {v && (
                    <p style={{ fontSize: 13, color: v.integro ? "#166534" : "#b91c1c" }}>
                      {v.integro ? "Íntegro: o conteúdo gravado não foi alterado." : "ATENÇÃO: o conteúdo gravado não confere com o hash."}
                    </p>
                  )}
                  {c && (
                    <div style={{ fontSize: 13 }}>
                      {c.igual ? (
                        <p style={{ color: "#166534" }}>Igual à apuração atual.</p>
                      ) : (
                        <>
                          <p style={{ color: "#92400e" }}>
                            Diferente da apuração atual (ponto, ajuste ou regra mudaram depois do fechamento):
                          </p>
                          <ul>
                            {c.diferencas.map((d) => (
                              <li key={d.campo}>
                                {d.campo}: fechado {String(d.snapshot)}, agora {String(d.vivo)}
                                {d.diferenca !== null ? ` (${d.diferenca > 0 ? "+" : ""}${d.diferenca})` : ""}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      {!c.snapshotIntegro && <p style={{ color: "#b91c1c" }}>O fechamento gravado não está íntegro.</p>}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
