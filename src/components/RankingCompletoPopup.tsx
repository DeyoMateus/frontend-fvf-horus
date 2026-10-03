import { Link } from "react-router-dom";
import { minParaHoras } from "../utils/formatarDuracao";
import { baixarCsvTabela, travarRolagemFundo } from "../utils/exportarTabelaModal";
import { useEffect } from "react";

/**
 * Popup dedicado (pedido do usuário) que mostra o RELATÓRIO COMPLETO por
 * trás de um ranking resumido (os cards de "Ranking de mais tempo..." em
 * `PainelIndicadores.tsx` mostram só um recorte ajustável de até 10
 * motoristas) , aqui entram TODOS os motoristas do período filtrado,
 * ordenados do maior pro menor valor, com opção de baixar o CSV
 * completo.
 */
interface ItemRankingCompleto {
  motoristaId: string;
  nome: string;
  valorMin: number;
}

interface RankingCompletoPopupProps {
  titulo: string;
  itens: ItemRankingCompleto[];
  onFechar: () => void;
}

export function RankingCompletoPopup({
  titulo,
  itens,
  onFechar,
}: RankingCompletoPopupProps) {
  useEffect(() => travarRolagemFundo(), []);

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "80vh",
          overflow: "auto",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <strong style={{ fontSize: 15 }}>{titulo} , relatório completo</strong>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              disabled={itens.length === 0}
              onClick={() =>
                baixarCsvTabela(
                  `${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
                  ["Posição", "Motorista", "Valor"],
                  itens.map((item, i) => [
                    String(i + 1),
                    item.nome,
                    minParaHoras(item.valorMin),
                  ]),
                )
              }
            >
              Baixar CSV
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={onFechar}
            >
              Fechar
            </button>
          </div>
        </div>

        {itens.length === 0 ? (
          <p style={{ fontSize: 13, color: "#000000" }}>
            Nenhum motorista com dados no período.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Motorista</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => (
                <tr key={item.motoristaId}>
                  <td>{i + 1}</td>
                  <td>
                    <Link to={`/motoristas/${item.motoristaId}`} onClick={onFechar}>
                      {item.nome}
                    </Link>
                  </td>
                  <td>{minParaHoras(item.valorMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
