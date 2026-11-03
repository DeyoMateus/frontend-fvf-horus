import { useEffect, useState } from "react";
import { listarTodosMotoristas } from "../api/motoristas";
import { FechamentoModal } from "../components/FechamentoModal";
import { AbasTopo, useAbaAtiva, type AbaDef } from "../components/AbasTopo";
import { DicaAoPassar } from "../components/DicaAoPassar";
import { useSearchParams } from "react-router-dom";
import { BotaoAjuda } from "../components/BalaoAjuda";
import { SolicitacoesAjustePage } from "./SolicitacoesAjustePage";
import { BancoHorasResumoFechamento } from "../components/BancoHorasResumoFechamento";
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

const ABAS_FECHAMENTO: AbaDef[] = [
  { id: "fechamento", rotulo: "Banco de horas: Fechamento, indicadores para decisão" },
  { id: "solicitacoes", rotulo: "Solicitações de ajuste de ponto" },
  { id: "historico", rotulo: "Histórico de solicitações decididas" },
  { id: "fiscalizacao", rotulo: "Documentos para fiscalização" },
];

function hoje(): string {
  return dataLocalIso(new Date());
}
function inicioDoMes(): string {
  const d = new Date();
  return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function IndicadoresPage() {
  // Link das notificações (?secao=solicitacoes-pendentes) abre a aba das solicitações.
  const [params] = useSearchParams();
  const aba = useAbaAtiva(
    ABAS_FECHAMENTO,
    params.get("secao") === "solicitacoes-pendentes" ? "solicitacoes" : undefined,
  );
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);

  useEffect(() => {
    listarTodosMotoristas()
      .then((r) => setMotoristas(r.dados))
      .catch(() => {
        /* seletor fica só com "Todos" , não impede a tela de funcionar */
      });
  }, []);

  return (
    <div>
      <AbasTopo
        abas={ABAS_FECHAMENTO}
        padrao={params.get("secao") === "solicitacoes-pendentes" ? "solicitacoes" : undefined}
      />

      {aba === "fechamento" && (
        <>
          {/* Rodada 489: indicadores do banco de horas no topo do Fechamento. */}
          <BancoHorasResumoFechamento />

          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              marginTop: 32,
              paddingTop: 24,
            }}
          >
            <h2>
              Fechamento
              <DicaAoPassar label="Sobre o fechamento">
                Fechamento de ponto (PDF pronto pra pagar) e
                fiscalização/dossiê de cobrança. Métricas e indicadores (horas,
                extras, noturno, banco de horas, alertas) ficam no Painel.
              </DicaAoPassar>
            </h2>
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
        </>
      )}

      {aba === "solicitacoes" && <SolicitacoesAjustePage modo="pendentes" />}
      {aba === "historico" && <SolicitacoesAjustePage modo="historico" />}
      {aba === "fiscalizacao" && <FiscalizacaoPage />}
    </div>
  );
}
