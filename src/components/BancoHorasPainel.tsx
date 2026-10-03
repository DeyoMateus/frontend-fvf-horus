import { FormEvent, useEffect, useRef, useState } from "react";
import {
  getSaldoBancoHoras,
  listarAjustesBancoHoras,
  registrarAjusteBancoHoras,
} from "../api/bancoHoras";
import type {
  AjusteBancoHoras,
  SaldoBancoHoras,
  TipoAjusteBancoHoras,
} from "../api/bancoHoras";
import { minParaHoras } from "../utils/formatarDuracao";

const ROTULO_TIPO: Record<TipoAjusteBancoHoras, string> = {
  COMPENSACAO: "Compensação (folga tirada)",
  PAGAMENTO: "Pagamento (fora da plataforma)",
  CORRECAO_CREDITO: "Correção manual (crédito)",
  CORRECAO_DEBITO: "Correção manual (débito)",
};

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}
function inicioDoMes(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
/**
 * Banco de horas do motorista (Rodada 37) , só relevante quando a CCT
 * vinculada ao CNPJ dele tem o toggle ligado (configurado na tela de
 * Regras Sindicais). Mostra o saldo do período (crédito de hora extra
 * apurada + correções manuais - débitos) e deixa o gestor registrar um
 * ajuste (compensação/pagamento/correção) , é assim que "descontar e
 * pagar de acordo com a lei ou o sindicato" acontece na prática: o
 * sistema nunca decide sozinho, o gestor registra quando a compensação
 * ou o pagamento de fato ocorreu.
 */
export function BancoHorasPainel({ motoristaId }: { motoristaId: string }) {
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());
  const [saldo, setSaldo] = useState<SaldoBancoHoras | null>(null);
  const [ajustes, setAjustes] = useState<AjusteBancoHoras[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoAjusteBancoHoras>("COMPENSACAO");
  const [minutos, setMinutos] = useState(60);
  const [dataAjuste, setDataAjuste] = useState(hoje());
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Rodada 99 , pedido do usuário: trocar o período (início/fim) não
  // pode "piscar" trocando o painel inteiro por "Carregando…" , só a
  // carga INICIAL passa pela tela cheia (mesmo padrão já usado em
  // MotoristaDetailPage.tsx/AuditoriaPage.tsx); mudar o período depois
  // só atualiza o saldo/ajustes no lugar.
  const primeiraCargaFeita = useRef(false);

  async function carregar() {
    if (!primeiraCargaFeita.current) setCarregando(true);
    setErro(null);
    try {
      const [s, a] = await Promise.all([
        getSaldoBancoHoras(
          motoristaId,
          new Date(inicio).toISOString(),
          new Date(`${fim}T23:59:59.999Z`).toISOString(),
        ),
        listarAjustesBancoHoras(motoristaId),
      ]);
      setSaldo(s);
      setAjustes(a);
    } catch {
      setErro("Não foi possível carregar o banco de horas agora.");
    } finally {
      setCarregando(false);
      primeiraCargaFeita.current = true;
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoristaId, inicio, fim]);

  async function onRegistrar(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);
    try {
      await registrarAjusteBancoHoras(motoristaId, {
        tipo,
        minutos,
        data: new Date(dataAjuste).toISOString(),
        observacao: observacao || undefined,
      });
      setObservacao("");
      await carregar();
    } catch {
      setErroForm("Não foi possível registrar o ajuste agora.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Banco de horas</h3>
      <p style={{ fontSize: 13, color: "#000000" }}>
        Quando a convenção coletiva deste motorista tem o banco de horas ligado
        (configurado em Regras Sindicais), a hora extra apurada vira crédito
        aqui, a compensar em folga ou pagar de acordo com a lei/CCT. Registre
        abaixo quando isso acontecer de verdade. Só horas, nenhum valor em R$.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: 12,
        }}
      >
        <div>
          <label>Início</label>
          <input
            type="date"
            value={inicio}
            max={fim}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label>Fim</label>
          <input
            type="date"
            value={fim}
            min={inicio}
            max={hoje()}
            onChange={(e) => setFim(e.target.value)}
          />
        </div>
      </div>

      {erro && <p className="error-text">{erro}</p>}
      {carregando && <p>Carregando…</p>}

      {!carregando && saldo && !saldo.ativo && (
        <p style={{ color: "#000000" }}>
          Banco de horas desligado para este motorista (a convenção coletiva do
          CNPJ dele não tem o toggle ligado em Regras Sindicais). A hora extra
          apurada continua só sendo apurada/paga direto, como sempre.
        </p>
      )}

      {!carregando && saldo && saldo.ativo && (
        <>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div
              className="card"
              style={{ padding: "10px 16px", minWidth: 140 }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#000000",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Saldo do período
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: saldo.saldoMin >= 0 ? "#111827" : "#b91c1c",
                }}
              >
                {minParaHoras(saldo.saldoMin)}
              </div>
            </div>
            <div
              className="card"
              style={{ padding: "10px 16px", minWidth: 140 }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#000000",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Crédito (hora extra)
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {minParaHoras(saldo.creditoExtraMin)}
              </div>
            </div>
            <div
              className="card"
              style={{ padding: "10px 16px", minWidth: 140 }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#000000",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Débito (compensado/pago)
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {minParaHoras(saldo.debitoMin)}
              </div>
            </div>
          </div>

          <form
            onSubmit={onRegistrar}
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
              marginBottom: 16,
            }}
          >
            <div>
              <label>Tipo</label>
              <select
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as TipoAjusteBancoHoras)
                }
              >
                {(Object.keys(ROTULO_TIPO) as TipoAjusteBancoHoras[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {ROTULO_TIPO[t]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label>Minutos</label>
              <input
                type="number"
                min={1}
                value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
                style={{ width: 90 }}
              />
            </div>
            <div>
              <label>Data</label>
              <input
                type="date"
                value={dataAjuste}
                max={hoje()}
                onChange={(e) => setDataAjuste(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label>Observação (opcional)</label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Registrar ajuste"}
            </button>
          </form>
          {erroForm && <p className="error-text">{erroForm}</p>}

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Minutos</th>
                <th>Registrado por</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {ajustes.map((a) => (
                <tr key={a.id}>
                  <td>{a.data.slice(0, 10)}</td>
                  <td>{ROTULO_TIPO[a.tipo]}</td>
                  <td>{minParaHoras(a.minutos)}</td>
                  <td>{a.registradoPorUsuario?.nome ?? ","}</td>
                  <td>{a.observacao ?? ""}</td>
                </tr>
              ))}
              {ajustes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#000000" }}>
                    Nenhum ajuste registrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
