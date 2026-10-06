import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  baixarXmlDocumentoCarga,
  excluirDocumentoCarga,
  listarDocumentosCarga,
  uploadDocumentoCarga,
} from "../api/documentosCarga";
import type {
  DocumentoCarga,
  FiltroDocumentosCarga,
  StatusCargaViagem,
  TipoDocumentoCarga,
} from "../api/documentosCarga";
import { listMotoristas } from "../api/motoristas";
import type { Motorista } from "../api/types";
import { ListaEmPopup } from "../components/ListaEmPopup";
import { PaginacaoPopup } from "../components/PaginacaoPopup";
import { BuscaDocumentosCargaPopup } from "../components/BuscaDocumentosCargaPopup";
import { useConfirm } from "../components/ConfirmProvider";

/**
 * Upload manual de CT-e/MDF-e , decisão do usuário: a empresa ainda não
 * tem certificado A1 próprio nem integração com a SEFAZ, então esta é a
 * primeira via de ingestão (base pra depois plugar e-mail dedicado ou
 * SEFAZ Direct sem redesenhar nada , ver ARCHITECTURE.md §17).
 *
 * A listagem (pedido do usuário, rodada posterior à 108) agora pagina de
 * verdade no servidor (10/20/50/100 por vez, igual a AuditoriaPage.tsx) em
 * vez de carregar sempre as 200 primeiras e paginar no cliente, tem um
 * popup dedicado de busca (BuscaDocumentosCargaPopup), permite excluir um
 * documento enviado e abrir a cerca virtual (coordenadas do destinatário)
 * direto no Google Maps.
 */
export function DocumentosCargaPage() {
  const confirm = useConfirm();
  const [documentos, setDocumentos] = useState<DocumentoCarga[]>([]);
  const [total, setTotal] = useState(0);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState<TipoDocumentoCarga>("CTE");
  const [statusCarga, setStatusCarga] =
    useState<StatusCargaViagem>("CARREGADO");
  const [motoristaId, setMotoristaId] = useState("");
  const [numero, setNumero] = useState("");
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Paginação de servidor + ordenação (pedido do usuário: "mais novo pro
  // mais antigo" disponível aqui também) + filtro de busca dedicado.
  const [pagina, setPagina] = useState(1);
  const [qtdPorPagina, setQtdPorPagina] = useState<10 | 20 | 50 | 100>(20);
  const [ordem, setOrdem] = useState<"asc" | "desc">("desc");
  const [filtro, setFiltro] = useState<FiltroDocumentosCarga>({});
  const [popupBuscaAberto, setPopupBuscaAberto] = useState(false);
  const [popupPaginacaoAberto, setPopupPaginacaoAberto] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Rodada 77 , pedido do usuário: enviar um documento não pode "piscar" a
  // página inteira pro topo. Só a carga INICIAL (mount) passa pela tela
  // cheia de "Carregando..."; trocar filtro/página/ordem atualiza só a
  // tabela no lugar (mesmo padrão de AuditoriaPage.tsx desde a Rodada 99).
  async function carregar(comCarregamentoTelaCheia = false) {
    if (comCarregamentoTelaCheia) setCarregando(true);
    setErroLista(null);
    try {
      const resultado = await listarDocumentosCarga(
        pagina,
        qtdPorPagina,
        ordem,
        filtro,
      );
      setDocumentos(resultado.dados);
      setTotal(resultado.total);
    } catch {
      setErroLista("Não foi possível carregar os documentos agora.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    listMotoristas()
      .then((r) => setMotoristas(r.dados))
      .catch(() => setMotoristas([]));
  }, []);

  const primeiraCargaFeita = useRef(false);
  useEffect(() => {
    void carregar(!primeiraCargaFeita.current);
    primeiraCargaFeita.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, qtdPorPagina, ordem, filtro]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!arquivo) {
      setErro("Selecione o arquivo .xml do CT-e/MDF-e.");
      return;
    }
    setEnviando(true);
    try {
      await uploadDocumentoCarga({
        arquivo,
        tipo,
        statusCarga,
        motoristaId: motoristaId || undefined,
        numero: numero || undefined,
        chaveAcesso: chaveAcesso || undefined,
        observacao: observacao || undefined,
      });
      setArquivo(null);
      setNumero("");
      setChaveAcesso("");
      setObservacao("");
      // Documento novo cai na primeira posição quando ordenado "mais
      // recente primeiro" , se o usuário estava em outra página/ordem,
      // só atualiza a página atual mesmo, sem forçar nada.
      await carregar();
    } catch {
      setErro(
        "Não foi possível enviar. Confira se o arquivo é um .xml válido e se a chave de acesso (se informada) tem 44 dígitos.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function onExcluir(d: DocumentoCarga) {
    const rotulo = `${d.tipo === "CTE" ? "CT-e" : "MDF-e"}${d.numero ? ` ${d.numero}` : ""}`;
    if (
      !(await confirm(
        `Excluir definitivamente o documento ${rotulo}? Essa ação não pode ser desfeita.`,
      ))
    ) {
      return;
    }
    setExcluindoId(d.id);
    try {
      await excluirDocumentoCarga(d.id);
      await carregar();
    } catch {
      setErroLista("Não foi possível excluir este documento agora.");
    } finally {
      setExcluindoId(null);
    }
  }

  function abrirCercaVirtual(d: DocumentoCarga) {
    if (!d.destinatarioLatitude || !d.destinatarioLongitude) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${d.destinatarioLatitude},${d.destinatarioLongitude}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const totalPaginas = Math.max(1, Math.ceil(total / qtdPorPagina));
  const temFiltroAtivo = Object.values(filtro).some((v) => !!v);

  if (carregando) return <p>Carregando...</p>;

  return (
    <div>
      <h2>Documentos de carga (CT-e / MDF-e)</h2>
      <p style={{ color: "#000000", marginTop: -8 }}>
        Upload manual do XML. A extração de número/chave de acesso é automática
        quando possível (best-effort), mas você pode preencher ou corrigir na
        mão.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Enviar novo documento</h3>
        <form onSubmit={onSubmit}>
          <label>Arquivo XML</label>
          <input
            type="file"
            accept=".xml"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            required
          />

          <label>Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDocumentoCarga)}
          >
            <option value="CTE">CT-e</option>
            <option value="MDFE">MDF-e</option>
          </select>

          <label>Status da carga</label>
          <select
            value={statusCarga}
            onChange={(e) =>
              setStatusCarga(e.target.value as StatusCargaViagem)
            }
          >
            <option value="CARREGADO">Carregado</option>
            <option value="VAZIO">Vazio</option>
          </select>

          <label>Motorista (opcional)</label>
          <select
            value={motoristaId}
            onChange={(e) => setMotoristaId(e.target.value)}
          >
            <option value="">Nenhum</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>

          <label>Número (deixe em branco para tentar extrair do XML)</label>
          <input value={numero} onChange={(e) => setNumero(e.target.value)} />

          <label>
            Chave de acesso, 44 dígitos (deixe em branco para tentar extrair do
            XML)
          </label>
          <input
            value={chaveAcesso}
            onChange={(e) => setChaveAcesso(e.target.value)}
            pattern="\d{44}"
          />

          <label>Observação (opcional)</label>
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />

          {erro && <p className="error-text">{erro}</p>}
          <button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Documentos enviados</h3>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="secondary"
            style={{ fontSize: 13 }}
            onClick={() => setPopupBuscaAberto(true)}
          >
            {temFiltroAtivo ? "Buscar (filtro ativo)" : "Buscar…"}
          </button>
          {temFiltroAtivo && (
            <button
              type="button"
              className="secondary"
              style={{ fontSize: 13 }}
              onClick={() => {
                setFiltro({});
                setPagina(1);
              }}
            >
              Limpar filtro
            </button>
          )}
          <label style={{ fontSize: 13 }}>
            Ordem:{" "}
            <select
              value={ordem}
              onChange={(e) => {
                setOrdem(e.target.value as "asc" | "desc");
                setPagina(1);
              }}
            >
              <option value="desc">Mais recentes primeiro</option>
              <option value="asc">Mais antigos primeiro</option>
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Mostrar{" "}
            <select
              value={qtdPorPagina}
              onChange={(e) => {
                setQtdPorPagina(Number(e.target.value) as 10 | 20 | 50 | 100);
                setPagina(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>{" "}
            por vez
          </label>
        </div>

        {erroLista && <p className="error-text">{erroLista}</p>}

        <ListaEmPopup
 ativo={qtdPorPagina === 100}
 titulo="Documentos de carga"
 onFechar={() => { setQtdPorPagina(50); setPagina(1); }}
>
<table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Número</th>
              <th>Chave de acesso</th>
              <th>Status</th>
              <th>Motorista</th>
              <th>Enviado em</th>
              <th>Entregue em</th>
              <th>Cerca virtual</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id}>
                <td>{d.tipo === "CTE" ? "CT-e" : "MDF-e"}</td>
                <td>{d.numero ?? ","}</td>
                <td style={{ fontSize: 11 }}>{d.chaveAcesso ?? ","}</td>
                <td>{d.statusCarga === "CARREGADO" ? "Carregado" : "Vazio"}</td>
                <td>
                  {d.motoristaId ? (
                    <Link to={`/motoristas/${d.motoristaId}`}>
                      {d.motorista?.nome ?? d.motoristaId}
                    </Link>
                  ) : (
                    ","
                  )}
                </td>
                <td>{new Date(d.createdAt).toLocaleString("pt-BR")}</td>
                <td style={{ fontSize: 12, color: "#000000" }}>
                  {/* Preenchido automaticamente quando o motorista bate
                      "Fim de descarregamento" no app (desvínculo FIFO). */}
                  {d.entregueEm
                    ? new Date(d.entregueEm).toLocaleString("pt-BR")
                    : ","}
                </td>
                <td style={{ fontSize: 12 }}>
                  {/* Coordenadas do destinatário, geocodificadas automaticamente
                      a partir do endereço extraído do XML, usadas pra conferir
                      se "Fim de descarregamento" foi batido perto da entrega
                      (RegistrosJornadaService.avaliarCercaVirtualEntrega, raio
                      de 500m). Pedido do usuário: poder abrir no mapa. */}
                  {d.destinatarioLatitude && d.destinatarioLongitude ? (
                    <button
                      type="button"
                      className="secondary"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                      title={d.enderecoDestinatario ?? undefined}
                      onClick={() => abrirCercaVirtual(d)}
                    >
                      Ver cerca virtual
                    </button>
                  ) : (
                    <span style={{ color: "#000000" }}>,</span>
                  )}
                </td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button
                    className="secondary"
                    onClick={() =>
                      void baixarXmlDocumentoCarga(
                        d.id,
                        `${d.tipo.toLowerCase()}-${d.numero ?? d.id}.xml`,
                      )
                    }
                  >
                    Baixar XML
                  </button>
                  <button
                    className="secondary"
                    style={{ color: "#b91c1c" }}
                    disabled={excluindoId === d.id}
                    onClick={() => void onExcluir(d)}
                  >
                    {excluindoId === d.id ? "Excluindo…" : "Excluir"}
                  </button>
                </td>
              </tr>
            ))}
            {documentos.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "#000000" }}>
                  {temFiltroAtivo
                    ? "Nenhum documento encontrado com este filtro."
                    : "Nenhum documento enviado ainda."}
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
            flexWrap: "wrap",
          }}
        >
          <button
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: "#000000" }}>
            Página {pagina} de {totalPaginas} ({total} documentos)
          </span>
          <button
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          >
            Próxima →
          </button>
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
</ListaEmPopup>
{popupPaginacaoAberto && (
          <PaginacaoPopup
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            onSelecionarPagina={setPagina}
            onFechar={() => setPopupPaginacaoAberto(false)}
          />
        )}

        {popupBuscaAberto && (
          <BuscaDocumentosCargaPopup
            filtroInicial={filtro}
            motoristas={motoristas}
            onBuscar={(novoFiltro) => {
              setFiltro(novoFiltro);
              setPagina(1);
            }}
            onFechar={() => setPopupBuscaAberto(false)}
          />
        )}
      </div>
    </div>
  );
}
