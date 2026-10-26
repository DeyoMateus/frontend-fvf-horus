import { FormEvent, useEffect, useState } from "react";
import {
  atualizarEmpresa,
  createEmpresa,
  excluirEmpresa,
  listEmpresas,
} from "../api/empresas";
import { useConfirm } from "../components/ConfirmProvider";
import { useAuth } from "../context/AuthContext";
import { EstabelecimentoCard } from "../components/EstabelecimentoCard";
import type { Empresa } from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { CampoTextoExpansivel } from "../components/CampoTextoExpansivel";

// Um grupo (o tenant real, desde que o modelo passou a suportar mais
// de um CNPJ sob o mesmo login) pode ter várias Empresas/CNPJs , esta
// tela é onde o ADMIN cadastra CNPJs adicionais do próprio grupo, e
// nunca de outro (o backend deriva o grupo sempre do token JWT).
export function EmpresasPage() {
  const { usuario } = useAuth();
  const confirm = useConfirm();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [razaoEdit, setRazaoEdit] = useState("");
  const [cnpjEdit, setCnpjEdit] = useState("");
  const [erroLinha, setErroLinha] = useState<string | null>(null);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [criando, setCriando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const lista = await listEmpresas();
      setEmpresas(
        [...lista].sort((a, b) => Number(!!b.ehMatriz) - Number(!!a.ehMatriz)),
      );
      setErro(null);
    } catch {
      setErro("Não foi possível carregar as empresas do grupo.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.grupoId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setCriando(true);
    try {
      await createEmpresa({ razaoSocial, cnpj });
      setRazaoSocial("");
      setCnpj("");
      await carregar();
    } catch {
      setErroForm(
        "Não foi possível cadastrar (CNPJ já cadastrado ou dados inválidos).",
      );
    } finally {
      setCriando(false);
    }
  }

  function iniciarEdicao(emp: Empresa) {
    setEditandoId(emp.id);
    setRazaoEdit(emp.razaoSocial);
    setCnpjEdit(emp.cnpj);
    setErroLinha(null);
  }

  function mensagemDeErro(err: unknown, padrao: string) {
    const m = (err as { response?: { data?: { message?: string | string[] } } })
      ?.response?.data?.message;
    return Array.isArray(m) ? m.join(" ") : (m ?? padrao);
  }

  async function salvarEdicao(id: string) {
    setErroLinha(null);
    setSalvandoEdit(true);
    try {
      await atualizarEmpresa(id, { razaoSocial: razaoEdit });
      setEditandoId(null);
      await carregar();
    } catch (err) {
      setErroLinha(
        mensagemDeErro(err, "Não foi possível salvar (verifique os dados)."),
      );
    } finally {
      setSalvandoEdit(false);
    }
  }

  async function onExcluir(emp: Empresa) {
    setErroLinha(null);
    const ok = await confirm(
      `Excluir a empresa ${emp.razaoSocial} (${emp.cnpj})? Só é possível se não houver motoristas, ajudantes ou documentos vinculados.`,
      { perigo: true, textoConfirmar: "Excluir" },
    );
    if (!ok) return;
    try {
      await excluirEmpresa(emp.id);
      await carregar();
    } catch (err) {
      setErroLinha(mensagemDeErro(err, "Não foi possível excluir a empresa."));
    }
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacao = useListaPaginada(empresas, (e) => e.createdAt, {
    fixarNoTopo: (e) => !!e.ehMatriz,
  });

  return (
    <div>
      <h2>Empresas do grupo</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Seu grupo pode ter mais de um CNPJ sob o mesmo login. Cada empresa
        cadastrada aqui aparece como opção ao cadastrar um motorista.
      </p>

      {usuario?.papel === "ADMIN" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Adicionar CNPJ</h3>
          <form onSubmit={onSubmit}>
            <label>Razão social</label>
            <CampoTextoExpansivel
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              maxLength={200}
              required
            />
            <label>CNPJ (14 dígitos)</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              pattern="\d{14}"
              maxLength={14}
              inputMode="numeric"
              required
            />
            {erroForm && <p className="error-text">{erroForm}</p>}
            <button type="submit" disabled={criando}>
              {criando ? "Cadastrando..." : "Cadastrar"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {carregando && <p>Carregando...</p>}
        {erro && <p className="error-text">{erro}</p>}
        {!carregando && !erro && (
          <>
            <ControlesListaPaginada
              ordem={paginacao.ordem}
              onAlternarOrdem={paginacao.alternarOrdem}
              qtdPorPagina={paginacao.qtdPorPagina}
              onMudarQtdPorPagina={paginacao.mudarQtdPorPagina}
              pagina={paginacao.pagina}
              totalPaginas={paginacao.totalPaginas}
              popupAberto={paginacao.popupAberto}
              onAbrirPopup={paginacao.abrirPopup}
              onFecharPopup={paginacao.fecharPopup}
              onSelecionarPagina={paginacao.irParaPagina}
              filtroData={{
                dataInicio: paginacao.dataInicio,
                onDataInicio: paginacao.setDataInicio,
                dataFim: paginacao.dataFim,
                onDataFim: paginacao.setDataFim,
                rotulo: "data de cadastro",
              }}
 tituloPopup="Empresas"
>
            {erroLinha && <p className="error-text">{erroLinha}</p>}
            <table>
              <thead>
                <tr>
                  <th>Razão social</th>
                  <th>CNPJ</th>
                  {usuario?.papel === "ADMIN" && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {paginacao.itensExibidos.map((emp) => (
                  <tr key={emp.id}>
                    {editandoId === emp.id ? (
                      <>
                        <td>
                          <input
                            value={razaoEdit}
                            onChange={(e) => setRazaoEdit(e.target.value)}
                            maxLength={200}
                          />
                        </td>
                        <td>
                          {cnpjEdit}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            disabled={salvandoEdit}
                            onClick={() => salvarEdicao(emp.id)}
                          >
                            Salvar
                          </button>{" "}
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {emp.razaoSocial}
                          {emp.ehMatriz && (
                            <strong style={{ marginLeft: 6, color: "#b45309" }}>
                              (Empresa Mãe)
                            </strong>
                          )}
                        </td>
                        <td>{emp.cnpj}</td>
                        {usuario?.papel === "ADMIN" && (
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => iniciarEdicao(emp)}
                            >
                              Editar
                            </button>{" "}
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => onExcluir(emp)}
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                {paginacao.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "#000000" }}>
                      Nenhuma empresa cadastrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
</ControlesListaPaginada>
          </>
        )}
      </div>

      {usuario?.papel === "ADMIN" && empresas.length > 0 && (
        <EstabelecimentoCard empresas={empresas} onSalvo={() => void carregar()} />
      )}
    </div>
  );
}
