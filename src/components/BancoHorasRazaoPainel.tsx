import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  abrirRazao,
  snapshotRazao,
  corrigirRazao,
  creditarPeriodoRazao,
  debitarRazao,
  expirarVencidosRazao,
  listarRazao,
  verificarRazao,
  vencimentosRazao,
} from "../api/bancoHoras";
import type { LancamentoBanco, TipoLancamentoBanco, VencimentosRazao, VerificacaoRazao } from "../api/bancoHoras";
import { minParaHoras } from "../utils/formatarDuracao";
import { dataLocalIso } from "../utils/mascaras";

const ROTULO: Record<TipoLancamentoBanco, string> = {
  ABERTURA: "Abertura (saldo inicial)",
  CREDITO_HORAS: "Crédito de horas",
  DEBITO_COMPENSACAO: "Compensação (folga)",
  DEBITO_PAGAMENTO: "Pagamento",
  DEBITO_EXPIRACAO: "Expiração do prazo",
  CORRECAO_CREDITO: "Correção (crédito)",
  CORRECAO_DEBITO: "Correção (débito)",
  SNAPSHOT_FECHAMENTO: "Fechamento",
};

function msg(e: unknown, padrao: string) {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return padrao;
}
const dia = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

/**
 * Rodada 379 (passo 31, interface): razão de lançamentos do banco de horas.
 * Só funciona quando o super admin ativou o razão para a empresa; senão o
 * servidor responde com a explicação e o painel mostra essa mensagem.
 */
export function BancoHorasRazaoPainel({
  motoristaId,
  ehAdmin,
}: {
  motoristaId: string;
  ehAdmin: boolean;
}) {
  const [venc, setVenc] = useState<VencimentosRazao | null>(null);
  const [lista, setLista] = useState<LancamentoBanco[]>([]);
  const [ver, setVer] = useState<VerificacaoRazao | null>(null);
  const [indisponivel, setIndisponivel] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [cInicio, setCInicio] = useState(dataLocalIso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [cFim, setCFim] = useState(dataLocalIso(new Date()));
  const [dTipo, setDTipo] = useState<"COMPENSACAO" | "PAGAMENTO">("COMPENSACAO");
  const [dHoras, setDHoras] = useState("1");
  const [dData, setDData] = useState(dataLocalIso(new Date()));
  const [dObs, setDObs] = useState("");
  const [kSentido, setKSentido] = useState<"CREDITO" | "DEBITO">("CREDITO");
  const [kHoras, setKHoras] = useState("1");
  const [kObs, setKObs] = useState("");
  const [aData, setAData] = useState(dataLocalIso(new Date()));

  async function carregar() {
    try {
      const [v, l] = await Promise.all([vencimentosRazao(motoristaId), listarRazao(motoristaId)]);
      setVenc(v);
      setLista(l);
      setIndisponivel(null);
    } catch (e) {
      setIndisponivel(msg(e, "Não foi possível carregar o razão."));
    }
  }
  useEffect(() => {
    void carregar();
  }, [motoristaId]);

  async function executar(fn: () => Promise<unknown>, ok?: string) {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
      await carregar();
      if (ok) setErro(null);
    } catch (e) {
      setErro(msg(e, "Não foi possível concluir."));
    } finally {
      setOcupado(false);
    }
  }

  const minutos = (h: string) => Math.round(Number(h.replace(",", ".")) * 60);

  // Razão desligado para a empresa (ou sem permissão): nada a mostrar, para não poluir o perfil.
  if (indisponivel) return null;
  if (!venc) return null;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Razão do banco de horas</h3>
      <p style={{ fontSize: 16 }}>
        <strong>Saldo: {minParaHoras(venc.saldoMin)}</strong>
      </p>
      {venc.vencidos.length > 0 && (
        <p style={{ color: "#b91c1c", fontSize: 13 }}>
          Vencido: {venc.vencidos.map((l) => `${minParaHoras(l.restanteMin)} (venceu em ${dia(l.venceEm)})`).join("; ")}
        </p>
      )}
      {venc.aVencer.length > 0 && (
        <p style={{ color: "#92400e", fontSize: 13 }}>
          A vencer em 30 dias: {venc.aVencer.map((l) => `${minParaHoras(l.restanteMin)} (${dia(l.venceEm)})`).join("; ")}
        </p>
      )}
      {erro && <p className="error-text">{erro}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button className="secondary" disabled={ocupado} onClick={() => executar(async () => setVer(await verificarRazao(motoristaId)))}>
          Conferir integridade
        </button>
        {ehAdmin && venc.vencidos.length > 0 && (
          <button className="secondary" disabled={ocupado} onClick={() => executar(() => expirarVencidosRazao(motoristaId))}>
            Dar baixa nos vencidos
          </button>
        )}
      </div>
      {ver && (
        <p style={{ fontSize: 13, color: ver.conciliado ? "#166534" : "#b91c1c" }}>
          {ver.conciliado ? "Razão conciliado: soma dos lançamentos igual ao saldo gravado." : "Atenção: a soma dos lançamentos não bate com o saldo gravado."}
        </p>
      )}

      {ehAdmin && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <div><label>Data de referência</label><input type="date" value={aData} onChange={(e) => setAData(e.target.value)} /></div>
          <button
            type="button"
            className="secondary"
            disabled={ocupado}
            title="Lança o saldo inicial do razão a partir do saldo atual do banco de horas."
            onClick={() => { if (window.confirm("Abrir o razão com o saldo atual? O lançamento não poderá ser apagado.")) void executar(() => abrirRazao(motoristaId, aData)); }}
          >
            Abrir razão (saldo inicial)
          </button>
          <button
            type="button"
            className="secondary"
            disabled={ocupado}
            title="Registra o saldo na data como lançamento de fechamento."
            onClick={() => { if (window.confirm("Registrar o fechamento do saldo nesta data? O lançamento não poderá ser apagado.")) void executar(() => snapshotRazao(motoristaId, aData)); }}
          >
            Registrar fechamento
          </button>
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => { e.preventDefault(); void executar(() => creditarPeriodoRazao(motoristaId, cInicio, cFim)); }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}
      >
        <div><label>Creditar horas apuradas de</label><input type="date" value={cInicio} onChange={(e) => setCInicio(e.target.value)} /></div>
        <div><label>até</label><input type="date" value={cFim} onChange={(e) => setCFim(e.target.value)} /></div>
        <button type="submit" disabled={ocupado}>Creditar período</button>
      </form>

      <form
        onSubmit={(e: FormEvent) => { e.preventDefault(); void executar(() => debitarRazao(motoristaId, { tipo: dTipo, minutos: minutos(dHoras), data: dData, observacao: dObs.trim() || undefined })); }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}
      >
        <div>
          <label>Débito</label>
          <select value={dTipo} onChange={(e) => setDTipo(e.target.value as "COMPENSACAO" | "PAGAMENTO")}>
            <option value="COMPENSACAO">Compensação (folga tirada)</option>
            <option value="PAGAMENTO">Pagamento (fora da plataforma)</option>
          </select>
        </div>
        <div><label>Horas</label><input inputMode="decimal" value={dHoras} onChange={(e) => setDHoras(e.target.value)} style={{ width: 70 }} /></div>
        <div><label>Data</label><input type="date" value={dData} onChange={(e) => setDData(e.target.value)} /></div>
        <div><label>Observação</label><input maxLength={400} value={dObs} onChange={(e) => setDObs(e.target.value)} /></div>
        <button type="submit" disabled={ocupado}>Registrar débito</button>
      </form>

      {ehAdmin && (
        <form
          onSubmit={(e: FormEvent) => { e.preventDefault(); void executar(() => corrigirRazao(motoristaId, { sentido: kSentido, minutos: minutos(kHoras), data: dData, observacao: kObs.trim() })); }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}
        >
          <div>
            <label>Correção manual</label>
            <select value={kSentido} onChange={(e) => setKSentido(e.target.value as "CREDITO" | "DEBITO")}>
              <option value="CREDITO">Crédito</option>
              <option value="DEBITO">Débito</option>
            </select>
          </div>
          <div><label>Horas</label><input inputMode="decimal" value={kHoras} onChange={(e) => setKHoras(e.target.value)} style={{ width: 70 }} /></div>
          <div><label>Motivo (mín. 10 caracteres)</label><input minLength={10} maxLength={400} value={kObs} onChange={(e) => setKObs(e.target.value)} required /></div>
          <button type="submit" disabled={ocupado}>Registrar correção</button>
        </form>
      )}

      <table>
        <thead>
          <tr><th>Nº</th><th>Data</th><th>Lançamento</th><th>Horas</th><th>Saldo</th><th>Vence</th><th>Obs.</th></tr>
        </thead>
        <tbody>
          {[...lista].reverse().map((l) => (
            <tr key={l.id}>
              <td>{l.sequencial}</td>
              <td>{dia(l.dataEvento)}</td>
              <td>{ROTULO[l.tipoLancamento] ?? l.tipoLancamento}</td>
              <td>{minParaHoras(l.minutosEquivalentes)}</td>
              <td>{minParaHoras(l.saldoAposMin)}</td>
              <td>{dia(l.venceEm)}</td>
              <td>{l.observacao ?? ""}</td>
            </tr>
          ))}
          {lista.length === 0 && <tr><td colSpan={7}>Nenhum lançamento ainda.</td></tr>}
        </tbody>
      </table>
      <p style={{ fontSize: 12, marginTop: 6 }}>
        Os lançamentos não se apagam nem se editam: um erro se corrige com outro lançamento.
      </p>
    </div>
  );
}
