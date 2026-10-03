import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { listarAuditoria, listarOcorrenciasAuditoria } from "../api/auditoria";
import type {
  ActorType,
  OcorrenciaAuditoria,
  RegistroAuditoria,
} from "../api/types";
import { PaginacaoPopup } from "../components/PaginacaoPopup";

const ROTULO_ACTOR_TYPE: Record<ActorType, string> = {
  USUARIO_EMPRESA: "Usuário do painel",
  MOTORISTA: "Motorista (app)",
  SISTEMA: "Sistema (automático)",
  SUPER_ADMIN: "Super admin",
};

function formatarValorDetalhe(valor: unknown): string {
  if (Array.isArray(valor)) return valor.join(", ");
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString("pt-BR");
  }
  if (typeof valor === "object" && valor !== null) return JSON.stringify(valor);
  return String(valor);
}

/**
 * Painel visual de trilha de auditoria (Rodada 66) , pedido do usuário:
 * "verificar a trilha de auditoria de forma visual selecionando os
 * ocorridos". `ocorridos` = combinações ação/entidade que já existem de
 * fato no grupo (vindas de GET /auditoria/ocorrencias, não uma lista
 * fixa no código) , o gestor marca quais quer ver e a lista já filtra.
 *
 * Reaproveitável pela área super admin: `AuditoriaPage` (aqui) sempre
 * chama os endpoints do painel do grupo (sempre restritos ao grupo de
 * quem está logado); `SuperAdminAuditoriaPage` é a versão irmã, que
 * chama os endpoints equivalentes de super admin (sem essa restrição).
 */
export function AuditoriaPage() {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaAuditoria[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [actorType, setActorType] = useState<ActorType | "">("");
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // Rodada 94 , faltava o seletor "mostrar N por vez" que as outras
  // páginas paginadas já têm (ver qtdTratamentosPorPagina em
  // MotoristaDetailPage.tsx) , aqui é paginação de servidor (manda
  // page/pageSize pro backend), não fatiamento no cliente, mas o
  // controle visual é o mesmo.
  const [pageSize, setPageSize] = useState<10 | 20 | 50 | 100>(50);
  // Rodada 108 , pedido do usuário: ordenar do mais recente pro mais
  // antigo (ou o inverso) em toda tabela de listagem do painel. Esta
  // tela já pagina no servidor, então o toggle vai direto pro backend
  // (ver `ordem` em FiltroAuditoria/ListarAuditoriaDto).
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc");
  const [popupPaginacaoAberto, setPopupPaginacaoAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  useEffect(() => {
    listarOcorrenciasAuditoria()
      .then(setOcorrencias)
      .catch(() => setOcorrencias([]));
  }, []);

  // Rodada 99 , pedido do usuário: mudar um filtro não pode "piscar" a
  // tela inteira trocando a tabela por "Carregando…" , só a carga
  // INICIAL (mount) passa por essa tela cheia (mesmo padrão já usado em
  // MotoristaDetailPage.tsx/DocumentosCargaPage.tsx desde a Rodada 77);
  // toda atualização depois (filtro, página, itens por página) troca os
  // dados da tabela já montada no lugar, sem desmontar nada.
  async function carregar(comCarregamentoTelaCheia = false) {
    if (comCarregamentoTelaCheia) setCarregando(true);
    setErro(null);
    try {
      const acoesSelecionadas = ocorrencias
        .filter((o) => selecionadas.has(`${o.entidade}::${o.acao}`))
        .map((o) => o.acao);
      const resultado = await listarAuditoria({
        page,
        pageSize,
        actorType: actorType || undefined,
        acoes: acoesSelecionadas.length > 0 ? acoesSelecionadas : undefined,
        dataInicio: dataInicio ? new Date(dataInicio).toISOString() : undefined,
        dataFim: dataFim
          ? new Date(`${dataFim}T23:59:59`).toISOString()
          : undefined,
        ordem,
      });
      setRegistros(resultado.dados);
      setTotal(resultado.total);
    } catch {
      setErro("Não foi possível carregar a trilha de auditoria.");
    } finally {
      setCarregando(false);
    }
  }

  const primeiraCargaFeita = useRef(false);
  useEffect(() => {
    carregar(!primeiraCargaFeita.current);
    primeiraCargaFeita.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, actorType, ordem]);

  const porEntidade = useMemo(() => {
    const mapa = new Map<string, OcorrenciaAuditoria[]>();
    for (const o of ocorrencias) {
      const lista = mapa.get(o.entidade) ?? [];
      lista.push(o);
      mapa.set(o.entidade, lista);
    }
    return mapa;
  }, [ocorrencias]);

  function alternarSelecao(chave: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function aplicarFiltros() {
    // Rodada 94 , antes chamava `carregar()` logo depois de `setPage(1)`:
    // como `setPage` é assíncrono, `carregar()` ainda lia o `page` ANTIGO
    // nesse mesmo tick (buscava a página errada), e o `useEffect` abaixo
    // disparava de novo logo em seguida quando `page` finalmente mudava
    // pra 1 , duas requisições, uma delas pra página errada. Se já
    // estamos na página 1, `setPage(1)` não muda nada (o efeito não
    // dispara sozinho), então chama `carregar()` direto só nesse caso.
    if (page === 1) {
      carregar();
    } else {
      setPage(1);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2>Trilha de auditoria</h2>
      <p style={{ fontSize: 13, color: "#000000" }}>
        Todo evento relevante gravado automaticamente pelo sistema (login,
        alteração de cadastro, exclusão, alertas, etc.). É imutável, nunca pode
        ser editado nem apagado. Mostra sempre quem de fato fez cada ação, pelo
        nome (não só "usuário do painel" ou "motorista"). É restrita aos eventos
        do seu grupo: ações do super admin da plataforma não aparecem aqui (elas
        têm uma trilha própria, separada). Marque abaixo quais tipos de
        ocorrência você quer ver e, opcionalmente, um período; a lista já
        filtra.
      </p>

      {ocorrencias.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 16 }}>
          <strong style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
            Selecionar os ocorridos:
          </strong>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {Array.from(porEntidade.entries()).map(([entidade, itens]) => (
              <div key={entidade}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 12,
                    color: "#374151",
                    marginBottom: 4,
                  }}
                >
                  {entidade}
                </div>
                {itens.map((o) => {
                  const chave = `${o.entidade}::${o.acao}`;
                  return (
                    <label
                      key={chave}
                      style={{ display: "block", fontSize: 12.5 }}
                    >
                      <input
                        type="checkbox"
                        checked={selecionadas.has(chave)}
                        onChange={() => alternarSelecao(chave)}
                      />{" "}
                      {o.acao}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <label>
          De:{" "}
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </label>
        <label>
          Até:{" "}
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </label>
        <label>
          Quem fez:{" "}
          <select
            value={actorType}
            onChange={(e) => setActorType(e.target.value as ActorType | "")}
          >
            <option value="">Todos</option>
            {(Object.keys(ROTULO_ACTOR_TYPE) as ActorType[])
              .filter((t) => t !== "SUPER_ADMIN")
              .map((t) => (
                <option key={t} value={t}>
                  {ROTULO_ACTOR_TYPE[t]}
                </option>
              ))}
          </select>
        </label>
        <label>
          Ordem:{" "}
          <select
            value={ordem}
            onChange={(e) => {
              setOrdem(e.target.value as "asc" | "desc");
              setPage(1);
            }}
          >
            <option value="desc">Mais recentes primeiro</option>
            <option value="asc">Mais antigos primeiro</option>
          </select>
        </label>
        <label>
          Mostrar{" "}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as 10 | 20 | 50 | 100);
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>{" "}
          por página
        </label>
        <button onClick={aplicarFiltros}>Filtrar</button>
      </div>

      {erro && <p style={{ color: "#b91c1c" }}>{erro}</p>}
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Papel</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const detalhesEntradas = r.detalhes
                  ? Object.entries(r.detalhes)
                  : [];
                const expandido = expandidoId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td>{new Date(r.createdAt).toLocaleString("pt-BR")}</td>
                      <td>
                        {r.actorNome ?? (
                          <span style={{ color: "#000000" }}>,</span>
                        )}
                      </td>
                      <td>{ROTULO_ACTOR_TYPE[r.actorType]}</td>
                      <td>{r.acao}</td>
                      <td>
                        {r.entidade}
                        {r.entidadeId ? ` (${r.entidadeId.slice(0, 8)}…)` : ""}
                      </td>
                      <td>
                        {(detalhesEntradas.length > 0 || r.ip) && (
                          <button
                            onClick={() =>
                              setExpandidoId(expandido ? null : r.id)
                            }
                          >
                            {expandido ? "Fechar" : "Detalhes"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandido && (
                      <tr>
                        <td colSpan={6} style={{ background: "#f9fafb" }}>
                          <div style={{ padding: "10px 14px", fontSize: 13 }}>
                            {r.ip && <div>IP: {r.ip}</div>}
                            {r.userAgent && (
                              <div>Aparelho/navegador: {r.userAgent}</div>
                            )}
                            {detalhesEntradas.length > 0 && (
                              <table style={{ marginTop: 8 }}>
                                <tbody>
                                  {detalhesEntradas.map(([chave, valor]) => (
                                    <tr key={chave}>
                                      <td
                                        style={{
                                          fontWeight: 600,
                                          paddingRight: 12,
                                        }}
                                      >
                                        {chave}
                                      </td>
                                      <td>{formatarValorDetalhe(valor)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "#000000" }}>
                    Nenhuma ocorrência encontrada com este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              padding: "10px 0 0",
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            <span style={{ fontSize: 13, color: "#000000" }}>
              Página {page} de {totalPaginas} ({total} ocorrências)
            </span>
            <button
              disabled={page >= totalPaginas}
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            >
              Próxima →
            </button>
            {/* Rodada 108 , popup dedicado de página, igual às outras tabelas do painel, pra pular direto pra uma página distante sem clicar "Próxima" várias vezes. */}
            {totalPaginas > 1 && (
              <button
                type="button"
                className="secondary"
                onClick={() => setPopupPaginacaoAberto(true)}
              >
                Ir para página…
              </button>
            )}
          </div>

          {popupPaginacaoAberto && (
            <PaginacaoPopup
              paginaAtual={page}
              totalPaginas={totalPaginas}
              onSelecionarPagina={setPage}
              onFechar={() => setPopupPaginacaoAberto(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
