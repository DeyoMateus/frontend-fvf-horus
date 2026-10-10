import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  listarAuditoriaSuperAdmin,
  listarOcorrenciasAuditoriaSuperAdmin,
} from "../api/auditoria";
import { listarGrupos } from "../api/superAdmin";
import type {
  ActorType,
  GrupoResumo,
  OcorrenciaAuditoria,
  RegistroAuditoria,
} from "../api/types";
import { ListaEmPopup } from "../components/ListaEmPopup";
import { Paginador } from "../components/Paginador";
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
 * Versão SUPER_ADMIN do painel visual de auditoria (Rodada 66) , ver
 * `AuditoriaPage` (irmã, painel ADMIN/GESTOR do grupo). Diferença
 * central: sem restrição de grupo por padrão (vê a plataforma inteira,
 * grupoId nulo , eventos de sistema/login antes de saber o grupo ,
 * incluso); o seletor "Grupo" deixa investigar um grupo específico sem
 * precisar logar como ele.
 */
export function SuperAdminAuditoriaPage() {
  const [grupos, setGrupos] = useState<GrupoResumo[]>([]);
  const [grupoId, setGrupoId] = useState("");
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
  // Rodada 108 , ver comentário equivalente em AuditoriaPage.tsx.
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc");
  const [popupPaginacaoAberto, setPopupPaginacaoAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  useEffect(() => {
    listarGrupos()
      .then(setGrupos)
      .catch(() => setGrupos([]));
  }, []);

  useEffect(() => {
    listarOcorrenciasAuditoriaSuperAdmin(grupoId || undefined)
      .then(setOcorrencias)
      .catch(() => setOcorrencias([]));
    setSelecionadas(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId]);

  // Rodada 99 , mesmo bug/correção de AuditoriaPage.tsx: ver comentário
  // completo lá. Só a carga INICIAL passa pela tela cheia; filtro,
  // página, grupo ou itens por página só trocam os dados no lugar.
  async function carregar(comCarregamentoTelaCheia = false) {
    if (comCarregamentoTelaCheia) setCarregando(true);
    setErro(null);
    try {
      const acoesSelecionadas = ocorrencias
        .filter((o) => selecionadas.has(`${o.entidade}::${o.acao}`))
        .map((o) => o.acao);
      const resultado = await listarAuditoriaSuperAdmin({
        page,
        pageSize,
        grupoId: grupoId || undefined,
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
  }, [page, pageSize, actorType, grupoId, ordem]);

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
    // Rodada 94 , ver o mesmo comentário em AuditoriaPage.tsx.
    if (page === 1) {
      carregar();
    } else {
      setPage(1);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2>Trilha de auditoria da plataforma</h2>
      <p style={{ fontSize: 13, color: "#000000" }}>
        Sem restrição de grupo por padrão (mostra a plataforma inteira,
        incluindo eventos de sistema sem grupo definido). Use o seletor de grupo
        para investigar um cliente específico sem precisar logar como ele.
      </p>

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
          Grupo:{" "}
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Todos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.razaoSocial}
              </option>
            ))}
          </select>
        </label>
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
            {(Object.keys(ROTULO_ACTOR_TYPE) as ActorType[]).map((t) => (
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

      {erro && <p style={{ color: "#b91c1c" }}>{erro}</p>}
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <div className="card">
          <ListaEmPopup
 ativo={pageSize === 100}
 titulo="Auditoria (super admin)"
 onFechar={() => { setPageSize(50); setPage(1); }}
>
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
                            {!r.grupoId && (
                              <div style={{ color: "#000000" }}>
                                Sem grupo (evento de sistema/plataforma)
                              </div>
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
            <Paginador
              pagina={page}
              totalPaginas={totalPaginas}
              onMudarPagina={setPage}
              onAbrirSeletor={() => setPopupPaginacaoAberto(true)}
              sufixo={`(${total} ocorrências)`}
            />
          </div>
</ListaEmPopup>
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
