import { useEffect, useState } from "react";
import { listMotoristas } from "../api/motoristas";
import { FechamentoModal } from "../components/FechamentoModal";
import { BotaoAjuda } from "../components/BalaoAjuda";
import { SolicitacoesAjustePage } from "./SolicitacoesAjustePage";
import { FiscalizacaoPage } from "./FiscalizacaoPage";
import type { Motorista } from "../api/types";
import { dataLocalIso } from '../utils/mascaras';

/**
 * "Fechamento" (nav) , fechamento de ponto (holerite em PDF, por
 * motorista ou frota inteira), solicitações de ajuste de ponto do
 * motorista e fiscalização/dossiê de cobrança. Deliberadamente
 * SEM as métricas/indicadores (horas, extras, noturno, banco de
 * horas, alertas) , Rodada 72, pedido do usuário: "separe o
 * fechamento de ponto e extração de relatório da parte de
 * indicadores... melhor deixar separado". As métricas foram para o
 * Painel (`DashboardPage.tsx` → `PainelIndicadores`), pra essa página
 * ficar só com "fechar a folha e extrair relatório/tratar pendência",
 * não misturado com "acompanhar indicador".
 */

function hoje(): string {
  return dataLocalIso(new Date());
}
function inicioDoMes(): string {
  const d = new Date();
  return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function IndicadoresPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);

  useEffect(() => {
    listMotoristas()
      .then((r) => setMotoristas(r.dados))
      .catch(() => {
        /* seletor fica só com "Todos" , não impede a tela de funcionar */
      });
  }, []);

  return (
    <div>
      {/* Pedido do usuário: trazer "Solicitações de ajuste de ponto" pro
          topo da página (onde antes ficava "Fechamento") e deixar o
          Fechamento abaixo dela , a caixa de entrada do RH é o que
          precisa de atenção com mais frequência. */}
      <SolicitacoesAjustePage />

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <h2>Fechamento</h2>
        <p style={{ color: "#000000", marginTop: -8 }}>
          Fechamento de ponto (PDF pronto pra pagar) e fiscalização/dossiê de
          cobrança. Métricas e indicadores (horas, extras, noturno, banco de
          horas, alertas) agora ficam no Painel.
        </p>

        <div
          className="card"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <label>
            Início
            <br />
            <input
              type="date"
              value={inicio}
              max={fim}
              onChange={(e) => setInicio(e.target.value)}
            />
          </label>
          <label>
            Fim
            <br />
            <input
              type="date"
              value={fim}
              min={inicio}
              max={hoje()}
              onChange={(e) => setFim(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BotaoAjuda titulo="Fechamento" label="Ajuda sobre o fechamento">
              <p style={{ margin: 0 }}>
                O <strong>Fechamento</strong> gera um PDF pronto pra fechar a
                folha de ponto: escolha o período, marque um motorista pra
                baixar o holerite individual, ou não marque nenhum pra fechar
                a <strong>frota inteira de uma vez</strong> (um PDF com o
                resumo de todos + o detalhe diário de cada um). Clique em
                "Fechamento (PDF)" pra abrir a janela.
              </p>
            </BotaoAjuda>
            <button onClick={() => setModalFechamentoAberto(true)}>
              Fechamento (PDF)
            </button>
          </div>
        </div>

        {modalFechamentoAberto && (
          <FechamentoModal
            motoristas={motoristas}
            inicioInicial={inicio}
            fimInicial={fim}
            onFechar={() => setModalFechamentoAberto(false)}
          />
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <FiscalizacaoPage />
      </div>
    </div>
  );
}
