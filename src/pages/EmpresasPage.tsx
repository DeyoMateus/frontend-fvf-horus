import { FormEvent, useEffect, useState } from "react";
import { createEmpresa, listEmpresas } from "../api/empresas";
import { useAuth } from "../context/AuthContext";
import type { Empresa } from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";

// Um grupo (o tenant real, desde que o modelo passou a suportar mais
// de um CNPJ sob o mesmo login) pode ter várias Empresas/CNPJs , esta
// tela é onde o ADMIN cadastra CNPJs adicionais do próprio grupo, e
// nunca de outro (o backend deriva o grupo sempre do token JWT).
export function EmpresasPage() {
  const { usuario } = useAuth();
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
      setEmpresas(await listEmpresas());
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

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacao = useListaPaginada(empresas, (e) => e.createdAt);

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
            <input
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
            <table>
              <thead>
                <tr>
                  <th>Razão social</th>
                  <th>CNPJ</th>
                </tr>
              </thead>
              <tbody>
                {paginacao.itensExibidos.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.razaoSocial}</td>
                    <td>{emp.cnpj}</td>
                  </tr>
                ))}
                {paginacao.itensExibidos.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ color: "#000000" }}>
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
    </div>
  );
}
