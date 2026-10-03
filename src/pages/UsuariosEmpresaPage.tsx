import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  atualizarStatusUsuarioEmpresa,
  listUsuariosEmpresa,
} from "../api/usuariosEmpresa";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmProvider";
import type { UsuarioEmpresaListado } from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";

/**
 * Gestão do time do próprio grupo (Rodada 31). O ADMIN só ativa/desativa
 * acesso de quem já existe , GESTOR só vê a lista, pra saber quem mais
 * tem acesso ao painel do grupo.
 *
 * Rodada 110 , pedido do usuário: tirou o formulário de "convidar
 * usuário" daqui; criar um novo usuário do grupo continua sendo feito
 * pelo super admin da plataforma (`SuperAdminGrupoDetailPage.tsx`).
 */
export function UsuariosEmpresaPage() {
  const { usuario } = useAuth();
  const confirm = useConfirm();
  // Rodada 109 , tela é exclusiva do ADMIN (GESTOR nem tem acesso às
  // rotas de listar/ativar no backend); quem digitar a URL direto sem
  // ser ADMIN volta pro dashboard, sem nem chamar a API.
  if (usuario?.papel !== "ADMIN") return <Navigate to="/dashboard" replace />;
  const [usuarios, setUsuarios] = useState<UsuarioEmpresaListado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      setUsuarios(await listUsuariosEmpresa());
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.grupoId]);

  async function onAlterarStatus(u: UsuarioEmpresaListado) {
    const acao = u.ativo ? "desativar" : "reativar";
    if (
      !(await confirm(`Confirma ${acao} o acesso de ${u.nome} (${u.email})?`))
    )
      return;
    await atualizarStatusUsuarioEmpresa(u.id, !u.ativo);
    await carregar();
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacao = useListaPaginada(usuarios, (u) => u.createdAt);

  return (
    <div>
      <h2>Usuários</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Gestores e admins com acesso ao painel do seu grupo. Um usuário nunca é
        apagado. "Desativar" só bloqueia o login dele, o histórico de tudo que
        ele já fez (ajustes, aprovações, feriados cadastrados) continua intacto.
        Para cadastrar um usuário novo, fale com o suporte técnico.
      </p>

      {erro && <p className="error-text">{erro}</p>}
      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div className="card">
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
              rotulo: "data de criação",
            }}
          />
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginacao.itensExibidos.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.papel}</td>
                  <td>{u.ativo ? "Ativo" : "Desativado"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {u.id !== usuario.sub && (
                      <button
                        className="secondary"
                        onClick={() => onAlterarStatus(u)}
                      >
                        {u.ativo ? "Desativar" : "Reativar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
