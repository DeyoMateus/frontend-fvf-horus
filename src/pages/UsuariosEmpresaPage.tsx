import { aplicarMascaraCpf, somenteDigitos } from "../utils/mascaras";
import { cpfValido } from "../utils/cpf";
import { FormEvent, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  atualizarPermissoesUsuario,
  atualizarStatusUsuarioEmpresa,
  criarGestor,
  excluirGestor,
  listUsuariosEmpresa,
} from "../api/usuariosEmpresa";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../components/ConfirmProvider";
import type { UsuarioEmpresaListado } from "../api/types";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { TelefoneInput } from "../components/TelefoneInput";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";
import { rotuloPapel } from "../utils/rotulos";

/**
 * Gestão do time do próprio grupo (Rodada 31). O ADMIN só ativa/desativa
 * acesso de quem já existe , GESTOR só vê a lista, pra saber quem mais
 * tem acesso ao painel do grupo.
 *
 * Rodada 110 , pedido do usuário: tirou o formulário de "convidar
 * usuário" daqui; criar um novo usuário do grupo continua sendo feito
 * pelo super admin da plataforma (`SuperAdminGrupoDetailPage.tsx`).
 */
/**
 * Rodada 496 (N126): o redirect fica num componente-casca, antes de qualquer hook do conteudo
 * (return antecipado entre hooks quebra as Rules of Hooks).
 */
export function UsuariosEmpresaPage() {
  const { usuario } = useAuth();
  if (usuario?.papel !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <UsuariosEmpresaConteudo />;
}

function UsuariosEmpresaConteudo() {
  const { usuario } = useAuth();
  const confirm = useConfirm();
  // Rodada 109 , tela é exclusiva do ADMIN (GESTOR nem tem acesso às
  // rotas de listar/ativar no backend); quem digitar a URL direto sem
  // ser ADMIN volta pro dashboard, sem nem chamar a API.
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

  const gestoresAtuais = usuarios.filter((u) => u.papel === "GESTOR").length;
  const [formAberto, setFormAberto] = useState(false);
  const [gNome, setGNome] = useState("");
  const [gCpf, setGCpf] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gSenha, setGSenha] = useState("");
  const [gTel, setGTel] = useState("");
  const [gSalvando, setGSalvando] = useState(false);
  const [gErro, setGErro] = useState<string | null>(null);

  async function onCriarGestor(e: FormEvent) {
    e.preventDefault();
    setGErro(null);
    if (!cpfValido(gCpf)) {
      setGErro("CPF inválido. Confira os números.");
      return;
    }
    setGSalvando(true);
    try {
      await criarGestor({
        nome: gNome.trim(),
        cpf: gCpf,
        email: gEmail.trim(),
        senha: gSenha,
        telefoneWhatsapp: gTel.trim() || undefined,
      });
      setGNome("");
      setGCpf("");
      setGEmail("");
      setGSenha("");
      setGTel("");
      setFormAberto(false);
      await carregar();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setGErro(
        Array.isArray(msg)
          ? msg.join(" ")
          : (msg ?? "Não foi possível cadastrar o gestor."),
      );
    } finally {
      setGSalvando(false);
    }
  }

  async function onAlterarStatus(u: UsuarioEmpresaListado) {
    const acao = u.ativo ? "desativar" : "reativar";
    if (
      !(await confirm(`Confirma ${acao} o acesso de ${u.nome} (${u.email})?`))
    )
      return;
    await atualizarStatusUsuarioEmpresa(u.id, !u.ativo);
    await carregar();
  }

  async function onExcluirGestor(u: UsuarioEmpresaListado) {
    if (
      !(await confirm(
        `Excluir o gestor ${u.nome} (${u.email})? O acesso é encerrado e a vaga é liberada. O histórico do que ele fez continua guardado. Não dá para desfazer.`,
      ))
    )
      return;
    try {
      await excluirGestor(u.id);
      setErro(null);
      await carregar();
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? "Não foi possível excluir o gestor.");
    }
  }

  async function onAlterarPermissao(
    u: UsuarioEmpresaListado,
    campo: "podeAprovarAjuste" | "podeAceitarDivergencia",
    valor: boolean,
  ) {
    try {
      await atualizarPermissoesUsuario(u.id, { [campo]: valor });
      setErro(null);
      await carregar();
    } catch {
      setErro("Não foi possível alterar a permissão.");
    }
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacao = useListaPaginada(usuarios, (u) => u.createdAt);

  return (
    <div>
      <h2>Usuários</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Gestores e admins com acesso ao painel do seu grupo. O histórico
        nunca é apagado: "Desativar" só bloqueia o login dele (e a vaga continua
        ocupada); "Excluir" (só gestores) encerra o acesso e libera a vaga. O histórico de tudo que
        ele já fez (ajustes, aprovações, feriados cadastrados) continua intacto.
        Você pode cadastrar até 2 gestores para sua empresa. As caixas "Aprova
        ajuste" e "Aceita divergência" definem quem pode aprovar pedidos de
        ajuste de ponto e aceitar divergências de jornada; cada mudança fica no
        histórico de auditoria.
      </p>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Gestores ({gestoresAtuais}/2)</h3>
        {gestoresAtuais >= 2 ? (
          <p style={{ fontSize: 13 }}>
            O limite de 2 gestores foi atingido. Para cadastrar outro, é preciso
            excluir um dos atuais (botão "Excluir" na lista abaixo).
          </p>
        ) : !formAberto ? (
          <button type="button" onClick={() => setFormAberto(true)}>
            Cadastrar gestor
          </button>
        ) : (
          <form onSubmit={onCriarGestor}>
            <label>Nome</label>
            <input
              value={gNome}
              onChange={(e) => setGNome(e.target.value)}
              minLength={2}
              maxLength={60}
              required
            />
            <label style={{ marginTop: 8, display: "block" }}>CPF</label>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={aplicarMascaraCpf(gCpf)}
              onChange={(e) => setGCpf(somenteDigitos(e.target.value).slice(0, 11))}
              maxLength={14}
              required
            />
            <label style={{ marginTop: 8, display: "block" }}>E-mail</label>
            <input
              type="email"
              maxLength={254}
              value={gEmail}
              onChange={(e) => setGEmail(e.target.value)}
              required
            />
            <label style={{ marginTop: 8, display: "block" }}>
              Senha inicial
            </label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              value={gSenha}
              onChange={(e) => setGSenha(e.target.value)}
              required
            />
            <label style={{ marginTop: 8, display: "block" }}>
              Contato (WhatsApp)
            </label>
            <TelefoneInput value={gTel} onChange={setGTel} />
            {gErro && <p className="error-text">{gErro}</p>}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button type="submit" disabled={gSalvando}>
                {gSalvando ? "Cadastrando…" : "Cadastrar"}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setFormAberto(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

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
                <th>Aprova ajuste</th>
                <th>Aceita divergência</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginacao.itensExibidos.map((u) => (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{rotuloPapel(u.papel)}</td>
                  <td>{u.ativo ? "Ativo" : "Desativado"}</td>
                  {(["podeAprovarAjuste", "podeAceitarDivergencia"] as const).map((campo) => (
                    <td key={campo}>
                      <input
                        type="checkbox"
                        checked={u[campo] !== false}
                        disabled={u.id === usuario?.sub}
                        title={u.id === usuario?.sub ? "Você não altera as próprias permissões." : undefined}
                        onChange={(e) => void onAlterarPermissao(u, campo, e.target.checked)}
                      />
                    </td>
                  ))}
                  <td>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {u.id !== usuario?.sub && (
                      <button
                        className="secondary"
                        onClick={() => onAlterarStatus(u)}
                      >
                        {u.ativo ? "Desativar" : "Reativar"}
                      </button>
                    )}
                    {u.id !== usuario?.sub && u.papel === "GESTOR" && (
                      <button
                        className="secondary"
                        style={{ marginLeft: 6 }}
                        onClick={() => void onExcluirGestor(u)}
                      >
                        Excluir
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
