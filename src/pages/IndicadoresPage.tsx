import { useEffect, useState } from "react";
import { useColaboradores } from "../hooks/useColaboradores";
import { FechamentoModal } from "../components/FechamentoModal";
import { AbasTopo, useAbaAtiva, type AbaDef } from "../components/AbasTopo";
import { DicaAoPassar } from "../components/DicaAoPassar";
import { useSearchParams } from "react-router-dom";
import { BotaoAjuda } from "../components/BalaoAjuda";
import { SolicitacoesAjustePage } from "./SolicitacoesAjustePage";
import { BancoHorasResumoFechamento } from "../components/BancoHorasResumoFechamento";
import { FiscalizacaoPage } from "./FiscalizacaoPage";
import type { Motorista } from "../api/types";
import { ROTULO_FUNCAO } from "../api/types";
import { dataLocalIso } from '../utils/mascaras';
import { MotoristaDetailPage } from "./MotoristaDetailPage";
import { BancoHorasPainel } from "../components/BancoHorasPainel";
import { BancoHorasRazaoPainel } from "../components/BancoHorasRazaoPainel";
import { FechamentosPeriodoPainel } from "../components/FechamentosPeriodoPainel";
import { useAuth } from "../context/AuthContext";

/**
 * "Fechamento" (nav) , fechamento de ponto (holerite em PDF, por
 * motorista ou frota inteira), solicitações de ajuste de ponto do
 * motorista e fiscalização/relatório de espera. Deliberadamente
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
  // Rodada 739: vieram da ficha do motorista; cada aba tem o seletor de motorista.
  { id: "tratamento", rotulo: "Tratamento de ponto" },
  { id: "banco", rotulo: "Banco de horas" },
  { id: "relatorio", rotulo: "Relatório de horas apuradas" },
  { id: "periodos", rotulo: "Fechamentos de período" },
];

const ABAS_POR_MOTORISTA = new Set(["tratamento", "banco", "relatorio", "periodos"]);

/**
 * Rodada 739: seletor de motorista das abas que tratam um motorista por vez. A escolha fica
 * na URL (`?motorista=`), então continua a mesma ao trocar de aba e os links das
 * notificações conseguem abrir o motorista certo.
 */
function SeletorMotorista({
  motoristas,
  valor,
  onEscolher,
}: {
  motoristas: Motorista[];
  valor: string;
  onEscolher: (id: string) => void;
}) {
  const ordenados = [...motoristas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <label>
        Colaborador
        <br />
        <select value={valor} onChange={(e) => onEscolher(e.target.value)} style={{ minWidth: 280 }}>
          <option value="">Escolha um colaborador</option>
          {ordenados.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} · {ROTULO_FUNCAO[m.funcao ?? "MOTORISTA"]} ({m.cpf})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function hoje(): string {
  return dataLocalIso(new Date());
}
function inicioDoMes(): string {
  const d = new Date();
  return dataLocalIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function IndicadoresPage() {
  // Link das notificações (?secao=solicitacoes-pendentes) abre a aba das solicitações.
  const [params, setParams] = useSearchParams();
  const { usuario } = useAuth();
  const motoristaEscolhido = params.get("motorista") ?? "";
  const escolherMotorista = (id: string) => {
    const novo = new URLSearchParams(params);
    if (id) novo.set("motorista", id);
    else novo.delete("motorista");
    novo.delete("secao");
    novo.delete("data");
    setParams(novo);
  };
  const aba = useAbaAtiva(
    ABAS_FECHAMENTO,
    params.get("secao") === "solicitacoes-pendentes" ? "solicitacoes" : undefined,
  );
  const motoristas = useColaboradores();
  const [inicio, setInicio] = useState(inicioDoMes());
  const [fim, setFim] = useState(hoje());
  const [modalFechamentoAberto, setModalFechamentoAberto] = useState(false);


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
                fiscalização/relatório de espera. Métricas e indicadores (horas,
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

      {ABAS_POR_MOTORISTA.has(aba) && (
        <>
          <SeletorMotorista
            motoristas={motoristas}
            valor={motoristaEscolhido}
            onEscolher={escolherMotorista}
          />
          {!motoristaEscolhido ? (
            <p style={{ color: "#000000" }}>Escolha um colaborador para ver esta seção.</p>
          ) : (
            <>
              {aba === "tratamento" && (
                <MotoristaDetailPage key={motoristaEscolhido} motoristaId={motoristaEscolhido} somente="tratamento" />
              )}
              {aba === "relatorio" && (
                <MotoristaDetailPage key={motoristaEscolhido} motoristaId={motoristaEscolhido} somente="relatorio" />
              )}
              {aba === "banco" && (
                <>
                  <BancoHorasPainel key={`b-${motoristaEscolhido}`} motoristaId={motoristaEscolhido} />
                  <BancoHorasRazaoPainel
                    key={`r-${motoristaEscolhido}`}
                    motoristaId={motoristaEscolhido}
                    empresaId={motoristas.find((m) => m.id === motoristaEscolhido)?.empresaId}
                    ehAdmin={usuario?.papel === "ADMIN"}
                  />
                </>
              )}
              {aba === "periodos" && (
                <FechamentosPeriodoPainel key={motoristaEscolhido} motoristaId={motoristaEscolhido} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
