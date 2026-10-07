import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { criarEmpresaMae, listarGrupos } from "../api/superAdmin";
import type { CreateEmpresaMaeInput, GrupoResumo } from "../api/types";
import { SuperAdminAuditoriaPage } from "./SuperAdminAuditoriaPage";
import { useListaPaginada } from "../hooks/useListaPaginada";
import { ControlesListaPaginada } from "../components/ControlesListaPaginada";

const FORM_PADRAO: CreateEmpresaMaeInput = {
  razaoSocialGrupo: "",
  cnpjEmpresa: "",
  razaoSocialEmpresa: "",
  nomeAdmin: "",
  emailAdmin: "",
  senhaAdmin: "",
  registroInpiAfd: "",
};

/**
 * Painel do super admin (Rodada 31): provisiona empresas mãe novas
 * (é o único jeito de uma empresa ganhar conta no sistema , não existe
 * auto-registro) e acompanha, pra cada empresa mãe (Grupo), quantos
 * CNPJs (Empresa), quantos gestores (UsuarioEmpresa) e quantos
 * motoristas ela tem no total.
 */
export function SuperAdminDashboardPage() {
  const [grupos, setGrupos] = useState<GrupoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<CreateEmpresaMaeInput>(FORM_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [sucessoForm, setSucessoForm] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      setGrupos(await listarGrupos());
      setErro(null);
    } catch {
      setErro("Não foi possível carregar as empresas cadastradas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setSucessoForm(null);
    setSalvando(true);
    try {
      await criarEmpresaMae({
        ...form,
        registroInpiAfd: form.registroInpiAfd?.trim()
          ? form.registroInpiAfd.trim()
          : undefined,
      });
      setSucessoForm(
        `Empresa "${form.razaoSocialGrupo}" cadastrada. Envie as credenciais do admin (${form.emailAdmin}) para o cliente por um canal seguro.`,
      );
      setForm(FORM_PADRAO);
      await carregar();
    } catch {
      setErroForm(
        "Não foi possível cadastrar (confira se o CNPJ e o e-mail do admin já não estão em uso, e se a senha tem pelo menos 8 caracteres).",
      );
    } finally {
      setSalvando(false);
    }
  }

  // Rodada 108 , pedido do usuário: ordenar, filtrar por período e
  // paginar com popup dedicado em toda tabela de listagem do painel.
  const paginacaoGrupos = useListaPaginada(grupos, (g) => g.createdAt);

  return (
    <div>
      <h2>Empresas cadastradas</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Cada linha é uma empresa mãe (Grupo). Dentro dela, os gestores criam os
        demais CNPJs do grupo e os motoristas. O super admin só provisiona a
        empresa mãe e o primeiro admin.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Cadastrar nova empresa mãe</h3>
        <form onSubmit={onSubmit}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label>Razão social da empresa mãe (Grupo)</label>
              <input
                value={form.razaoSocialGrupo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, razaoSocialGrupo: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label>Razão social do primeiro CNPJ</label>
              <input
                value={form.razaoSocialEmpresa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, razaoSocialEmpresa: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label>CNPJ (14 dígitos, só números)</label>
              <input
                value={form.cnpjEmpresa}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cnpjEmpresa: e.target.value }))
                }
                pattern="\d{14}"
                title="14 dígitos, só números"
                maxLength={14}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label>Registro INPI/AFD (opcional)</label>
              <input
                value={form.registroInpiAfd ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, registroInpiAfd: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Nome do admin inicial</label>
              <input
                value={form.nomeAdmin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nomeAdmin: e.target.value }))
                }
                maxLength={60}
                required
              />
            </div>
            <div>
              <label>E-mail do admin inicial</label>
              <input
                type="email" maxLength={254}
                autoComplete="off"
                value={form.emailAdmin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emailAdmin: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label>Senha inicial do admin</label>
              <input
                type="password" maxLength={128}
                autoComplete="new-password"
                minLength={8}
                value={form.senhaAdmin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, senhaAdmin: e.target.value }))
                }
                required
              />
              <p style={{ fontSize: 12, color: "#000000", marginTop: 4 }}>
                Ainda não há troca de senha automática pelo próprio usuário.
                Comunique esta senha ao cliente por um canal seguro fora do
                sistema.
              </p>
            </div>
          </div>

          {erroForm && <p className="error-text">{erroForm}</p>}
          {sucessoForm && (
            <p style={{ color: "#059669", fontSize: 13 }}>{sucessoForm}</p>
          )}
          <button type="submit" disabled={salvando} style={{ marginTop: 8 }}>
            {salvando ? "Cadastrando..." : "Cadastrar empresa mãe"}
          </button>
        </form>
      </div>

      {erro && <p className="error-text">{erro}</p>}
      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <>
          <ControlesListaPaginada
            ordem={paginacaoGrupos.ordem}
            onAlternarOrdem={paginacaoGrupos.alternarOrdem}
            qtdPorPagina={paginacaoGrupos.qtdPorPagina}
            onMudarQtdPorPagina={paginacaoGrupos.mudarQtdPorPagina}
            pagina={paginacaoGrupos.pagina}
            totalPaginas={paginacaoGrupos.totalPaginas}
            popupAberto={paginacaoGrupos.popupAberto}
            onAbrirPopup={paginacaoGrupos.abrirPopup}
            onFecharPopup={paginacaoGrupos.fecharPopup}
            onSelecionarPagina={paginacaoGrupos.irParaPagina}
            filtroData={{
              dataInicio: paginacaoGrupos.dataInicio,
              onDataInicio: paginacaoGrupos.setDataInicio,
              dataFim: paginacaoGrupos.dataFim,
              onDataFim: paginacaoGrupos.setDataFim,
              rotulo: "data de criação",
            }}
          />
          <table>
            <thead>
              <tr>
                <th>Empresa mãe</th>
                <th>CNPJs</th>
                <th>Gestores</th>
                <th>Motoristas</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginacaoGrupos.itensExibidos.map((g) => (
                <tr key={g.id}>
                  <td>{g.razaoSocial}</td>
                  <td>{g.totalEmpresas}</td>
                  <td>{g.totalUsuarios}</td>
                  <td>{g.totalMotoristas}</td>
                  <td>{new Date(g.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <Link to={`/super-admin/grupos/${g.id}`}>Ver detalhes</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: 32,
          paddingTop: 24,
        }}
      >
        <SuperAdminAuditoriaPage />
      </div>
    </div>
  );
}
