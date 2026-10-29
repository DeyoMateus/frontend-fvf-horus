import { useEffect, useMemo, useState } from "react";
import { getIndicadoresPainel, getPeriodoBancoHoras } from "../api/indicadores";
import type { IndicadoresPainel } from "../api/indicadores";
import { minParaHoras } from "../utils/formatarDuracao";

/**
 * Rodada 489: indicadores-chave do banco de horas no topo do Fechamento, para decidir
 * (pagar, compensar, ajustar) antes de fechar a folha. Usa os mesmos dados do Painel
 * (`/indicadores`), so horas, nunca valor em R$.
 */
const INTERVALO_ATUALIZACAO_MS = 30_000; // igual ao Painel (tempo real)

function Kpi({
  titulo,
  valor,
  subtitulo,
  cor,
  ajuda,
}: {
  titulo: string;
  valor: string;
  subtitulo?: string;
  cor?: string;
  ajuda?: string;
}) {
  return (
    <div
      title={ajuda}
      style={{
        flex: "1 1 170px",
        minWidth: 160,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "10px 12px",
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#374151" }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor ?? "#111827" }}>{valor}</div>
      {subtitulo && <div style={{ fontSize: 11, color: "#4b5563" }}>{subtitulo}</div>}
    </div>
  );
}

export function BancoHorasResumoFechamento() {
  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string } | null>(null);
  const [painel, setPainel] = useState<IndicadoresPainel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // Periodo automatico (primeiro registro do banco ate agora), atualizado como o Painel.
  useEffect(() => {
    let cancelado = false;
    async function carregar(primeira: boolean) {
      try {
        const p = await getPeriodoBancoHoras();
        const dados = p.semDados
          ? null
          : await getIndicadoresPainel(p.inicio, p.fim);
        if (cancelado) return;
        setPeriodo(p.semDados ? null : { inicio: p.inicio, fim: p.fim });
        setPainel(dados);
        setErro(false);
      } catch {
        if (!cancelado && primeira) setErro(true);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    void carregar(true);
    const t = setInterval(() => void carregar(false), INTERVALO_ATUALIZACAO_MS);
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, []);

  const resumo = useMemo(() => {
    const ativos = (painel?.motoristas ?? []).filter((m) => m.bancoHoras.ativo);
    const credito = ativos.reduce((s, m) => s + m.bancoHoras.creditoExtraMin, 0);
    const correcao = ativos.reduce((s, m) => s + m.bancoHoras.creditoCorrecaoMin, 0);
    const debito = ativos.reduce((s, m) => s + m.bancoHoras.debitoMin, 0);
    const saldo = ativos.reduce((s, m) => s + m.bancoHoras.saldoMin, 0);
    const acumulado = credito + correcao;
    const top = [...ativos].sort((a, b) => b.bancoHoras.saldoMin - a.bancoHoras.saldoMin).slice(0, 5);
    return {
      ativos: ativos.length,
      positivos: ativos.filter((m) => m.bancoHoras.saldoMin > 0).length,
      negativos: ativos.filter((m) => m.bancoHoras.saldoMin < 0).length,
      credito,
      correcao,
      debito,
      saldo,
      mediaSaldo: ativos.length > 0 ? Math.round(saldo / ativos.length) : 0,
      taxaCompensacao: acumulado > 0 ? Math.round((debito / acumulado) * 100) : 0,
      concentracaoTop5:
        saldo > 0
          ? Math.round((top.reduce((s, m) => s + Math.max(0, m.bancoHoras.saldoMin), 0) / saldo) * 100)
          : 0,
      top,
    };
  }, [painel]);

  const maxTop = Math.max(1, ...resumo.top.map((m) => Math.abs(m.bancoHoras.saldoMin)));

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <h3 style={{ margin: 0, flex: "1 1 auto" }}>Banco de horas: indicadores para decisão</h3>
        {periodo && (
          <span style={{ fontSize: 12, color: "#374151" }}>
            Desde o primeiro registro ({new Date(periodo.inicio).toLocaleDateString("pt-BR")}) até agora, atualizado automaticamente
          </span>
        )}
      </div>

      {carregando && <p>Carregando…</p>}
      {erro && <p className="error-text">Não foi possível carregar os indicadores do banco de horas.</p>}
      {!carregando && !erro && resumo.ativos === 0 && (
        <p style={{ margin: 0 }}>
          Nenhum registro de banco de horas ainda (ative o banco na regra sindical da empresa).
        </p>
      )}

      {!carregando && !erro && resumo.ativos > 0 && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Kpi
              titulo="Saldo total do banco"
              valor={minParaHoras(resumo.saldo)}
              subtitulo={`média de ${minParaHoras(resumo.mediaSaldo)} por motorista`}
              cor={resumo.saldo >= 0 ? "#059669" : "#b91c1c"}
              ajuda="Créditos de hora extra e correções menos o que já foi compensado ou pago. É a obrigação em horas da empresa com a frota."
            />
            <Kpi
              titulo="Crédito de hora extra"
              valor={minParaHoras(resumo.credito)}
              subtitulo={`+ ${minParaHoras(resumo.correcao)} de correções`}
              ajuda="Extra apurado no período que entrou no banco (na unidade da regra: fictas ou reais)."
            />
            <Kpi
              titulo="Já compensado ou pago"
              valor={minParaHoras(resumo.debito)}
              subtitulo={`${resumo.taxaCompensacao}% do que entrou`}
              cor={resumo.taxaCompensacao >= 50 ? "#059669" : "#ea580c"}
              ajuda="Débitos registrados (compensação em folga ou pagamento). Taxa baixa = banco acumulando."
            />
            <Kpi
              titulo="Motoristas com saldo"
              valor={`${resumo.positivos} / ${resumo.ativos}`}
              subtitulo={`${resumo.negativos} negativo(s)`}
              cor={resumo.negativos > 0 ? "#b91c1c" : undefined}
              ajuda="Quantos motoristas têm saldo positivo, entre os que têm banco ativo. Saldo negativo = motorista devendo horas."
            />
            <Kpi
              titulo="Concentração no top 5"
              valor={`${resumo.concentracaoTop5}%`}
              subtitulo="do saldo positivo está nos 5 maiores"
              ajuda="Se muito alto, poucos motoristas concentram o passivo: priorize a compensação neles."
            />
          </div>

          <h4 style={{ margin: "0 0 8px" }}>Top 5 motoristas com mais horas no banco</h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 12 }}>
                <th style={{ width: 28 }}>#</th>
                <th>Motorista</th>
                <th style={{ width: "40%" }}>Saldo</th>
                <th style={{ textAlign: "right" }}>Crédito</th>
                <th style={{ textAlign: "right" }}>Compensado/pago</th>
              </tr>
            </thead>
            <tbody>
              {resumo.top.map((m, i) => (
                <tr key={m.motoristaId}>
                  <td>{i + 1}</td>
                  <td>{m.nome}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          height: 10,
                          width: `${Math.max(3, (Math.abs(m.bancoHoras.saldoMin) / maxTop) * 100)}%`,
                          background: m.bancoHoras.saldoMin >= 0 ? "#059669" : "#b91c1c",
                          borderRadius: 4,
                        }}
                      />
                      <strong>{minParaHoras(m.bancoHoras.saldoMin)}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>{minParaHoras(m.bancoHoras.creditoExtraMin + m.bancoHoras.creditoCorrecaoMin)}</td>
                  <td style={{ textAlign: "right" }}>{minParaHoras(m.bancoHoras.debitoMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
