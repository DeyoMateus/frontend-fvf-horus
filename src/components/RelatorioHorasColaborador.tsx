import { FormEvent, useState } from "react";
import { inicioDoDiaLocalIso, fimDoDiaLocalIso } from "../utils/fusoHorario";
import { baixarHoleritePdf, calcularHolerite } from "../api/holerite";
import type { OpcoesHolerite, ResultadoHolerite } from "../api/holerite";
import type { AlertaJornada, Motorista } from "../api/types";

/**
 * Rodada 747: "Relatório de horas apuradas (folha de ponto)" do colaborador, tirado de
 * MotoristaDetailPage (era a seção `somente="relatorio"`, usada só no Fechamento). Mesmo
 * comportamento; o estado do relatório vive aqui.
 */
export function RelatorioHorasColaborador({
  motoristaId,
  motorista,
  alertas,
}: {
  motoristaId: string;
  motorista: Motorista;
  alertas: AlertaJornada[];
}) {
  const [holeriteInicio, setHoleriteInicio] = useState("");
  const [holeriteFim, setHoleriteFim] = useState("");
  const [holeriteDirecaoEspera, setHoleriteDirecaoEspera] = useState(true);
  const [holeriteNormalExtra, setHoleriteNormalExtra] = useState(true);
  const [holeriteAdicionalNoturno, setHoleriteAdicionalNoturno] =
    useState(true);
  const [holeritePrevia, setHoleritePrevia] =
    useState<ResultadoHolerite | null>(null);
  const [gerandoHolerite, setGerandoHolerite] = useState(false);
  const [baixandoHolerite, setBaixandoHolerite] = useState(false);
  const [erroHolerite, setErroHolerite] = useState<string | null>(null);

  // Rodada 740: ajudante não tem direção nem espera; o relatório dele sai sem essas colunas.
  const holeriteMostraDirecaoEspera =
    holeriteDirecaoEspera && motorista?.funcao !== "AJUDANTE";
  const opcoesHolerite: OpcoesHolerite = {
    direcaoEspera: holeriteMostraDirecaoEspera,
    normalExtra: holeriteNormalExtra,
    adicionalNoturno: holeriteAdicionalNoturno,
  };

  async function onGerarPreviaHolerite(e: FormEvent) {
    e.preventDefault();
    setErroHolerite(null);
    setGerandoHolerite(true);
    try {
      const resultado = await calcularHolerite(
        motoristaId,
        inicioDoDiaLocalIso(holeriteInicio),
        fimDoDiaLocalIso(holeriteFim),
        opcoesHolerite,
      );
      setHoleritePrevia(resultado);
    } catch {
      setErroHolerite(
        "Não foi possível calcular o relatório de horas (confira o período escolhido).",
      );
    } finally {
      setGerandoHolerite(false);
    }
  }

  async function onBaixarHolerite() {
    if (!motorista) return;
    setBaixandoHolerite(true);
    try {
      await baixarHoleritePdf(
        motoristaId,
        motorista.nome,
        inicioDoDiaLocalIso(holeriteInicio),
        fimDoDiaLocalIso(holeriteFim),
        opcoesHolerite,
      );
    } finally {
      setBaixandoHolerite(false);
    }
  }

  function formatarHorasHolerite(minutos: number) {
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${h}h${String(m).padStart(2, "0")}`;
  }

  // `d.dia` vem como "AAAA-MM-DD" (chave interna do backend, usada pra
  // ordenar) , exibir isso direto saía com a data "invertida" pro
  // padrão brasileiro (Rodada 80, pedido do usuário). Só formata na
  // exibição, sem mexer na chave.
  function formatarDiaHoleriteBr(diaIso: string) {
    const [ano, mes, dia] = diaIso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Relatório de horas apuradas (folha de ponto)</h3>
        <p style={{ fontSize: 13, color: "#000000" }}>
          Junta o ledger real de pontos do motorista com os tratamentos
          (fechamentos) lançados pelo gestor no período, pra empresa conseguir
          pagar corretamente. Escolha o período e quais categorias entram no
          PDF, cada empresa paga de um jeito diferente, então as 3 são
          opcionais.
        </p>
        <form onSubmit={onGerarPreviaHolerite}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label>Início</label>
              <input
                type="date"
                value={holeriteInicio}
                onChange={(e) => setHoleriteInicio(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Fim</label>
              <input
                type="date"
                value={holeriteFim}
                onChange={(e) => setHoleriteFim(e.target.value)}
                required
              />
            </div>
            {motorista?.funcao !== "AJUDANTE" && (
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={holeriteDirecaoEspera}
                onChange={(e) => setHoleriteDirecaoEspera(e.target.checked)}
              />
              Direção / espera
            </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={holeriteNormalExtra}
                onChange={(e) => setHoleriteNormalExtra(e.target.checked)}
              />
              Hora normal / extra
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={holeriteAdicionalNoturno}
                onChange={(e) => setHoleriteAdicionalNoturno(e.target.checked)}
              />
              Hora noturna
            </label>
          </div>
          {erroHolerite && <p className="error-text">{erroHolerite}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={gerandoHolerite}>
              {gerandoHolerite ? "Calculando..." : "Ver prévia"}
            </button>
            <button
              type="button"
              onClick={onBaixarHolerite}
              disabled={baixandoHolerite || !holeriteInicio || !holeriteFim}
            >
              {baixandoHolerite ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </form>

        {holeriteInicio && holeriteFim && (() => {
          // Rodada 452: o período só fecha depois de tratar estes alertas.
          const ini = new Date(holeriteInicio).getTime();
          const fim = new Date(holeriteFim).getTime() + 86_400_000; // mesmo corte do backend (fim + 1 dia)
          const pendentes = alertas.filter(
            (a) =>
              a.tipo === "PONTO_ACEITO_COM_FLAG" &&
              !a.tratadoEm &&
              new Date(a.janelaInicio).getTime() >= ini &&
              new Date(a.janelaInicio).getTime() < fim,
          ).length;
          return pendentes > 0 ? (
            <p className="error-text" style={{ marginTop: 12 }}>
              {pendentes} ponto(s) com divergência de relógio ainda sem
              tratamento neste período. Eles contam no cálculo, mas o período
              só poderá ser fechado depois que o gestor tratar os alertas
              (confirmar o horário ou corrigir a hora) na seção de alertas.
            </p>
          ) : null;
        })()}
        {holeritePrevia &&
          (holeritePrevia.pontosSuspeitosPendentes ?? 0) > 0 && (
            <p className="error-text" style={{ marginTop: 12 }}>
              {holeritePrevia.pontosSuspeitosPendentes} ponto(s) com divergência
              de relógio ficaram FORA do cálculo até o gestor corrigir a hora
              (tela de Alertas, "Lançar ajuste e liberar aparelho"). Este
              holerite está incompleto.
            </p>
          )}
        {holeritePrevia && (
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Dia</th>
                {holeriteMostraDirecaoEspera && <th>Direção</th>}
                {holeriteMostraDirecaoEspera && <th>Espera</th>}
                {holeriteNormalExtra && <th>H. normal</th>}
                {holeriteNormalExtra && <th>H. extra</th>}
                {holeriteAdicionalNoturno && <th>Hora noturna</th>}
                <th>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {holeritePrevia.dias.map((d) => (
                <tr key={d.dia}>
                  <td>{formatarDiaHoleriteBr(d.dia)}</td>
                  {holeriteMostraDirecaoEspera && (
                    <td>{formatarHorasHolerite(d.direcaoMin)}</td>
                  )}
                  {holeriteMostraDirecaoEspera && (
                    <td>{formatarHorasHolerite(d.esperaMin)}</td>
                  )}
                  {holeriteNormalExtra && (
                    <td>{formatarHorasHolerite(d.normalMin)}</td>
                  )}
                  {holeriteNormalExtra && (
                    <td>{formatarHorasHolerite(d.extraMin)}</td>
                  )}
                  {holeriteAdicionalNoturno && (
                    <td>{formatarHorasHolerite(d.noturnoMin)}</td>
                  )}
                  <td>{d.teveFechamentoGestor ? "Fechado p/ gestor" : ""}</td>
                </tr>
              ))}
              {holeritePrevia.dias.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: "#000000" }}>
                    Nenhum ponto no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
  );
}
