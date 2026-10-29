import { inicioDoDiaLocalIso, fimDoDiaLocalIso } from "../utils/fusoHorario";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  listarSolicitacoesTitular,
  obterCiencias,
  obterEncarregados,
  salvarEncarregado,
} from "../api/privacidade";
import type {
  CienciasPainel,
  EmpresaEncarregado,
  ListaSolicitacoesTitular,
  SolicitacaoTitularPainel,
  StatusSolicitacaoTitular,
} from "../api/privacidade";
import { ListaEmPopup } from "../components/ListaEmPopup";
import { Paginador } from "../components/Paginador";
import { PaginacaoPopup } from "../components/PaginacaoPopup";
import {
  ROTULO_STATUS_PEDIDO,
  ROTULO_TIPO_PEDIDO,
  TratarPedidoTitularModal,
} from "../components/TratarPedidoTitularModal";
import { useAuth } from "../context/AuthContext";

type Aba = "PEDIDOS" | "CIENCIAS" | "ENCARREGADO";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR") : "-";

/**
 * Rodada 210 (LGPD): mesmo padrão das demais telas de listagem (filtros,
 * uma linha por pedido, ordem, itens por página, paginador e janela para
 * 100). O pedido é tratado num popup dedicado (TratarPedidoTitularModal).
 */
export function PrivacidadePainelPage() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.papel === "ADMIN";
  const [aba, setAba] = useState<Aba>("PEDIDOS");

  return (
    <div>
      <h2>Privacidade (LGPD)</h2>
      <p style={{ fontSize: 13, color: "#000000" }}>
        Pedidos que os motoristas fazem sobre os próprios dados pessoais (a lei
        dá 15 dias para responder), ciência da política de privacidade por
        motorista e cadastro do encarregado pelo tratamento de dados (DPO).
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(
          [
            ["PEDIDOS", "Pedidos dos titulares"],
            ["CIENCIAS", "Ciência da política"],
            ["ENCARREGADO", "Encarregado (DPO)"],
          ] as [Aba, string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            className={aba === chave ? undefined : "secondary"}
            onClick={() => setAba(chave)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "PEDIDOS" && <AbaPedidos />}
      {aba === "CIENCIAS" && <AbaCiencias />}
      {aba === "ENCARREGADO" && <AbaEncarregado ehAdmin={ehAdmin} />}
    </div>
  );
}

function AbaPedidos() {
  const [status, setStatus] = useState<StatusSolicitacaoTitular | "">("");
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [soVencidos, setSoVencidos] = useState(false);
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<10 | 20 | 50 | 100>(50);
  const [page, setPage] = useState(1);
  const [popupPaginacaoAberto, setPopupPaginacaoAberto] = useState(false);
  const [lista, setLista] = useState<ListaSolicitacoesTitular | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<SolicitacaoTitularPainel | null>(null);

  // Função comum (não memoizada) de propósito: o botão "Filtrar" precisa ler
  // os valores atuais de busca/datas, que não disparam recarga sozinhos.
  async function carregar(telaCheia = false) {
      if (telaCheia) setCarregando(true);
      setErro(null);
      try {
        setLista(
          await listarSolicitacoesTitular({
            status: status || undefined,
            tipo: tipo || undefined,
            busca: busca.trim() || undefined,
            dataInicio: dataInicio
              ? inicioDoDiaLocalIso(dataInicio)
              : undefined,
            dataFim: dataFim
              ? fimDoDiaLocalIso(dataFim)
              : undefined,
            vencidas: soVencidos,
            ordem,
            page,
            pageSize,
          }),
        );
      } catch {
        setErro("Não foi possível carregar os pedidos.");
      } finally {
        setCarregando(false);
      }
  }

  const primeira = useRef(true);
  useEffect(() => {
    void carregar(primeira.current);
    primeira.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tipo, soVencidos, ordem, page, pageSize]);

  function aplicarFiltros() {
    if (page === 1) void carregar();
    else setPage(1);
  }

  const total = lista?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const resumo = lista?.resumo;

  return (
    <div>
      {resumo && (
        <p style={{ fontSize: 13 }}>
          <strong>{resumo.abertas}</strong> aberto(s) ·{" "}
          <strong>{resumo.emAnalise}</strong> em análise ·{" "}
          <strong style={{ color: resumo.vencidas > 0 ? "#b91c1c" : undefined }}>
            {resumo.vencidas}
          </strong>{" "}
          com prazo vencido
        </p>
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
          Situação:{" "}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusSolicitacaoTitular | "");
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {(Object.keys(ROTULO_STATUS_PEDIDO) as StatusSolicitacaoTitular[]).map(
              (s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_PEDIDO[s]}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Tipo:{" "}
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {Object.entries(ROTULO_TIPO_PEDIDO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Motorista:{" "}
          <input
            type="text"
            maxLength={80}
            value={busca}
            placeholder="Nome"
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicarFiltros();
            }}
          />
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
          <input
            type="checkbox"
            checked={soVencidos}
            onChange={(e) => {
              setSoVencidos(e.target.checked);
              setPage(1);
            }}
          />{" "}
          Só com prazo vencido
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
          <ListaEmPopup
            ativo={pageSize === 100}
            titulo="Pedidos dos titulares"
            onFechar={() => {
              setPageSize(50);
              setPage(1);
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>Pedido</th>
                  <th>Aberto em</th>
                  <th>Prazo</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(lista?.dados ?? []).map((p) => {
                  const aberto_ = p.status === "ABERTA" || p.status === "EM_ANALISE";
                  return (
                    <tr key={p.id}>
                      <td>{p.motorista.nome}</td>
                      <td>{ROTULO_TIPO_PEDIDO[p.tipo] ?? p.tipo}</td>
                      <td>{fmt(p.createdAt)}</td>
                      <td style={p.vencida ? { color: "#b91c1c", fontWeight: 600 } : undefined}>
                        {fmt(p.prazoEm)}
                        {p.vencida ? " (vencido)" : ""}
                      </td>
                      <td>
                        <span
                          className={`badge ${p.status === "ATENDIDA" ? "ok" : p.status === "NEGADA_COM_JUSTIFICATIVA" ? "neutro" : p.vencida ? "erro" : "neutro"}`}
                        >
                          {ROTULO_STATUS_PEDIDO[p.status]}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setAberto(p)}>
                          {aberto_ ? "Tratar" : "Ver"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(lista?.dados?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} style={{ color: "#000000" }}>
                      Nenhum pedido encontrado com este filtro.
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
                sufixo={`(${total} pedidos)`}
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

      {aberto && (
        <TratarPedidoTitularModal
          pedido={aberto}
          onFechar={() => setAberto(null)}
          onTratado={() => {
            setAberto(null);
            void carregar();
          }}
        />
      )}
    </div>
  );
}

function AbaCiencias() {
  const [dados, setDados] = useState<CienciasPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);
  const [pageSize, setPageSize] = useState<10 | 20 | 50 | 100>(50);
  const [page, setPage] = useState(1);
  const [popupPaginacaoAberto, setPopupPaginacaoAberto] = useState(false);

  useEffect(() => {
    obterCiencias()
      .then(setDados)
      .catch(() => setErro("Não foi possível carregar as ciências."));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (dados?.motoristas ?? []).filter(
      (m) =>
        (!termo || m.nome.toLowerCase().includes(termo)) &&
        (!soPendentes || !m.politicaEm || !m.termoDadosEm || !m.termoGpsEm),
    );
  }, [dados, busca, soPendentes]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const pagina = Math.min(page, totalPaginas);
  const visiveis = filtrados.slice((pagina - 1) * pageSize, pagina * pageSize);
  const pendentes = (dados?.motoristas ?? []).filter(
    (m) => !m.politicaEm || !m.termoDadosEm || !m.termoGpsEm,
  ).length;

  return (
    <div>
      {erro && <p style={{ color: "#b91c1c" }}>{erro}</p>}
      {dados && (
        <p style={{ fontSize: 13 }}>
          Versão em vigor: <strong>{dados.versao}</strong> ·{" "}
          {pendentes === 0
            ? "todos os motoristas ativos deram ciência."
            : `${pendentes} motorista(s) ainda sem ciência completa (o app deles fica bloqueado até darem).`}
        </p>
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
          Motorista:{" "}
          <input
            type="text"
            maxLength={80}
            value={busca}
            placeholder="Nome"
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={soPendentes}
            onChange={(e) => {
              setSoPendentes(e.target.checked);
              setPage(1);
            }}
          />{" "}
          Só quem ainda não deu ciência
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
      </div>
      <div className="card">
        <ListaEmPopup
          ativo={pageSize === 100}
          titulo="Ciência da política"
          onFechar={() => {
            setPageSize(50);
            setPage(1);
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Motorista</th>
                <th>Política</th>
                <th>Dados pessoais</th>
                <th>Termo de GPS</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome}</td>
                  <td>{fmt(m.politicaEm)}</td>
                  <td>{fmt(m.termoDadosEm)}</td>
                  <td>{fmt(m.termoGpsEm)}</td>
                </tr>
              ))}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "#000000" }}>
                    Nenhum motorista encontrado com este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 0" }}>
            <Paginador
              pagina={pagina}
              totalPaginas={totalPaginas}
              onMudarPagina={setPage}
              onAbrirSeletor={() => setPopupPaginacaoAberto(true)}
              sufixo={`(${filtrados.length} motoristas)`}
            />
          </div>
        </ListaEmPopup>
        {popupPaginacaoAberto && (
          <PaginacaoPopup
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onSelecionarPagina={setPage}
            onFechar={() => setPopupPaginacaoAberto(false)}
          />
        )}
      </div>
    </div>
  );
}

function AbaEncarregado({ ehAdmin }: { ehAdmin: boolean }) {
  const [empresas, setEmpresas] = useState<EmpresaEncarregado[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obterEncarregados()
      .then((e) => {
        setEmpresas(e);
        const primeira = e.find((x) => x.encarregadoNome);
        if (primeira) {
          setNome(primeira.encarregadoNome ?? "");
          setEmail(primeira.encarregadoEmail ?? "");
          setTelefone(primeira.encarregadoTelefone ?? "");
        }
      })
      .catch(() => setMsg("Não foi possível carregar o encarregado."));
  }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    try {
      await salvarEncarregado({ nome, email, telefone: telefone || undefined });
      setMsg(
        nome || email || telefone
          ? "Encarregado salvo para todos os CNPJs do grupo."
          : "Sem encarregado: os pedidos ficam com o gestor.",
      );
    } catch {
      setMsg("Não foi possível salvar. Confira nome, e-mail e telefone (+55...).");
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Encarregado pelo tratamento de dados (DPO)</h3>
      <p style={{ fontSize: 13 }}>
        <strong>Opcional e interno.</strong> Este contato é só para uso do RH e da
        gestão: ele não aparece para os motoristas nem na página pública de
        privacidade. Os pedidos dos motoristas chegam ao gestor (sininho e aba
        "Pedidos dos titulares"). Vale para os {empresas.length} CNPJ(s) do grupo.
      </p>
      {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
      {ehAdmin ? (
        <form onSubmit={salvar}>
          <label>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
          <label>Telefone (+5511999998888)</label>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={16} />
          <button type="submit">
            {nome || email || telefone ? "Salvar" : "Salvar sem encarregado"}
          </button>
        </form>
      ) : (
        <p>Somente o ADMIN pode alterar. Atual: {nome || "não informado"}</p>
      )}
    </div>
  );
}
