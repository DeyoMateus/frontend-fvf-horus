import { useEffect, useState } from "react";
import { listarTrilha, type AmostraTrilha } from "../api/trilha";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { abrirNoMapa } from "../utils/mapa";
import { ControlesListaPaginada } from "./ControlesListaPaginada";

/**
 * Aba "Trilha" da ficha do colaborador: as coletas de localização que o aparelho fez durante a
 * direção (uma por hora, só entre "Início de direção" e "Fim de direção"). Mesmo padrão da lista
 * de registros: mais recentes primeiro (alternável), período De/Até, limite de linhas por página
 * e "Ver no mapa" abrindo o Google Maps. Cada abertura desta aba fica registrada no log de
 * consultas de localização.
 */
export function TrilhaMotorista({ motoristaId }: { motoristaId: string }) {
  const [amostras, setAmostras] = useState<AmostraTrilha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    listarTrilha(motoristaId)
      .then((dados) => {
        if (ativo) setAmostras(dados);
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar a trilha.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [motoristaId]);

  const lista = useListaPaginada(amostras, (a) => a.capturadoEm, {
    qtdInicial: 20,
    ordemInicial: "recente",
  });

  const tabela = (
    <table>
      <thead>
        <tr>
          <th>Coletado em</th>
          <th>Precisão</th>
          <th>Localização</th>
        </tr>
      </thead>
      <tbody>
        {lista.itensExibidos.map((a) => (
          <tr key={a.id}>
            <td>{new Date(a.capturadoEm).toLocaleString("pt-BR")}</td>
            <td>
              {a.precisaoGpsM != null
                ? `±${Math.round(Number(a.precisaoGpsM))} m`
                : "não informada"}
            </td>
            <td>
              {a.latitude != null && a.longitude != null ? (
                <button
                  type="button"
                  className="botao-link-externo"
                  title={`${a.latitude}, ${a.longitude}`}
                  onClick={() => abrirNoMapa(a.latitude!, a.longitude!)}
                >
                  Ver no mapa
                </button>
              ) : (
                <span style={{ color: "#000000" }}>Sem permissão</span>
              )}
            </td>
          </tr>
        ))}
        {!carregando && lista.itensFiltrados.length === 0 && (
          <tr>
            <td colSpan={3} style={{ color: "#000000" }}>
              {amostras.length === 0
                ? "Nenhuma coleta de localização deste colaborador ainda."
                : "Nenhuma coleta no período filtrado."}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Trilha de localização</h3>
      <p style={{ fontSize: 13, color: "#000000" }}>
        Coletas feitas pelo aparelho durante a direção, uma por hora, apenas entre o
        início e o fim de direção. As mais recentes aparecem primeiro. Cada abertura
        desta aba fica registrada no log de consultas de localização.
      </p>
      {erro && <p style={{ color: "#b91c1c" }}>{erro}</p>}
      <ControlesListaPaginada
        ordem={lista.ordem}
        onAlternarOrdem={lista.alternarOrdem}
        qtdPorPagina={lista.qtdPorPagina}
        onMudarQtdPorPagina={lista.mudarQtdPorPagina}
        pagina={lista.pagina}
        totalPaginas={lista.totalPaginas}
        popupAberto={lista.popupAberto}
        onAbrirPopup={lista.abrirPopup}
        onFecharPopup={lista.fecharPopup}
        onSelecionarPagina={lista.irParaPagina}
        filtroData={{
          dataInicio: lista.dataInicio,
          onDataInicio: lista.setDataInicio,
          dataFim: lista.dataFim,
          onDataFim: lista.setDataFim,
          rotulo: "data da coleta",
        }}
        tituloPopup="Trilha de localização"
      >
        {tabela}
      </ControlesListaPaginada>
    </div>
  );
}
