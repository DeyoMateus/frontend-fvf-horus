import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJornadasAbertasPagina } from "../api/dashboard";
import type { JornadaAbertaHaMuitoTempo } from "../api/types";
import { Paginador } from "./Paginador";

/** Linhas por pagina; o resumo do painel ja traz a 1a pagina com este mesmo tamanho (backend: TAMANHO_PAGINA_JORNADAS_ABERTAS). */
export const LINHAS_POR_PAGINA_JORNADAS_ABERTAS = 10;

/**
 * Rodada 641: "Jornadas aguardando encerramento pelo gestor". A lista nao cresce mais sem limite na tela:
 * a 1a pagina e o total vem no resumo do painel (atualizado a cada 30 s); as demais paginas sao buscadas
 * so quando o gestor navega ate elas.
 */
export function JornadasAbertasPainel({
  primeiraPagina,
  total,
  atualizadoEm,
}: {
  primeiraPagina: JornadaAbertaHaMuitoTempo[];
  total: number;
  atualizadoEm: string;
}) {
  const [pagina, setPagina] = useState(1);
  const [outraPagina, setOutraPagina] = useState<{
    itens: JornadaAbertaHaMuitoTempo[];
    total: number;
  } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (pagina === 1) return;
    let cancelado = false;
    setCarregando(true);
    getJornadasAbertasPagina(pagina, LINHAS_POR_PAGINA_JORNADAS_ABERTAS)
      .then((r) => {
        if (cancelado) return;
        setErro(false);
        // As jornadas encerradas desde a pagina anterior podem ter encurtado a lista.
        if (r.itens.length === 0 && pagina > r.totalPaginas) {
          setPagina(Math.max(1, r.totalPaginas));
          return;
        }
        setOutraPagina({ itens: r.itens, total: r.total });
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
    // Recarrega a pagina aberta a cada atualizacao do resumo (mesmo ritmo do resto do painel).
  }, [pagina, atualizadoEm]);

  const totalAtual = pagina === 1 ? total : (outraPagina?.total ?? total);
  const totalPaginas = Math.max(
    1,
    Math.ceil(totalAtual / LINHAS_POR_PAGINA_JORNADAS_ABERTAS),
  );

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  if (total === 0 && totalAtual === 0) return null;

  const itens = pagina === 1 ? primeiraPagina : (outraPagina?.itens ?? []);

  return (
    <div className="card" style={{ borderColor: "#fca5a5", marginBottom: 24 }}>
      <strong style={{ color: "#b91c1c" }}>
        Jornadas aguardando encerramento pelo gestor
      </strong>
      <p style={{ fontSize: 12, color: "#000000", marginTop: 4 }}>
        Início de jornada batido há mais de 14h sem o fim correspondente. O
        sistema nunca encerra a jornada sozinho: é preciso encerrá-la aqui,
        lançando o Fim de jornada com a justificativa. Enquanto estiver aberta,
        o alerta crítico desta jornada não pode ser dispensado.
      </p>
      <table style={{ opacity: carregando ? 0.6 : 1 }}>
        <thead>
          <tr>
            <th>Motorista</th>
            <th>Início da jornada</th>
            <th>Horas em aberto</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((j) => (
            <tr key={j.motoristaId}>
              <td>
                <Link to={`/motoristas/${j.motoristaId}`}>{j.nome}</Link>
              </td>
              <td>{new Date(j.desde).toLocaleString("pt-BR")}</td>
              <td style={{ color: "#b91c1c", fontWeight: 600 }}>
                {j.horasAberta}h
              </td>
              <td>
                <Link
                  to={`/motoristas/${j.motoristaId}?secao=encerrar-jornada`}
                >
                  Encerrar jornada
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {erro && (
        <p style={{ fontSize: 12, color: "#b91c1c" }}>
          Não foi possível carregar esta página agora. Tente novamente.
        </p>
      )}
      {totalPaginas > 1 && (
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          onMudarPagina={setPagina}
          sufixo={`(${totalAtual} jornadas)`}
        />
      )}
    </div>
  );
}
