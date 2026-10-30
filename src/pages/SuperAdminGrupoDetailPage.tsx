import { aplicarMascaraCpf, somenteDigitos } from "../utils/mascaras";
import { cpfValido } from "../utils/cpf";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  atualizarEmpresaSuperAdmin,
  atualizarGrupo,
  atualizarStatusEmpresaSuperAdmin,
  atualizarDestinatariosWhatsapp,
  atualizarStatusUsuarioGrupo,
  excluirUsuarioGrupo,
  atualizarUsuarioSuperAdmin,
  criarUsuarioGrupo,
  obterGrupo,
} from "../api/superAdmin";
import type {
  GrupoDetalhe,
  PapelUsuario,
} from "../api/types";
import { TelefoneInput } from "../components/TelefoneInput";
import { useConfirm } from "../components/ConfirmProvider";
import { fusoIanaDoNavegador } from "../utils/fusoHorario";
import { CampoTextoExpansivel } from "../components/CampoTextoExpansivel";
import { RegimeBancoHorasForm } from "../components/RegimeBancoHorasForm";
import { ChavesLiberacaoPainel } from "../components/ChavesLiberacaoPainel";
import { rotuloPapel } from "../utils/rotulos";

type FormEmpresa = {
  razaoSocial: string;
  cnpj: string;
  registroInpiAfd: string;
  fusoHorario: string;
  motivo: string;
};
type FormUsuario = { nome: string; email: string };
type FormNovoUsuario = {
  nome: string;
  /** Rodada 537 (N136): 11 digitos, obrigatorio. */
  cpf: string;
  email: string;
  senha: string;
  papel: PapelUsuario;
  telefoneWhatsapp: string;
};

const NOVO_USUARIO_PADRAO: FormNovoUsuario = {
  nome: "",
  cpf: "",
  email: "",
  senha: "",
  papel: "GESTOR",
  telefoneWhatsapp: "",
};

/**
 * Drill-down de uma empresa mãe: cada CNPJ com sua contagem de
 * motoristas, e a lista de gestores/admins do grupo. Desde a Rodada
 * 32, o super admin também edita esses cadastros aqui , razão social
 * do grupo, dados de cada CNPJ (com ativar/desativar), e nome/e-mail
 * de um usuário , para corrigir erros do provisionamento inicial sem
 * precisar de acesso direto ao banco.
 */
export function SuperAdminGrupoDetailPage() {
  const confirm = useConfirm();
  const { grupoId } = useParams<{ grupoId: string }>();
  const [grupo, setGrupo] = useState<GrupoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editandoGrupo, setEditandoGrupo] = useState(false);
  const [razaoSocialGrupo, setRazaoSocialGrupo] = useState("");
  const [limiteMotoristasGrupo, setLimiteMotoristasGrupo] = useState("");
  const [regimeEmpresaId, setRegimeEmpresaId] = useState<string | null>(null);
  const [chavesEmpresaId, setChavesEmpresaId] = useState<string | null>(null);
  const [empresaEditandoId, setEmpresaEditandoId] = useState<string | null>(
    null,
  );
  const [formEmpresa, setFormEmpresa] = useState<FormEmpresa>({
    razaoSocial: "",
    cnpj: "",
    registroInpiAfd: "",
    fusoHorario: "America/Sao_Paulo",
    motivo: "",
  });
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(
    null,
  );
  const [formUsuario, setFormUsuario] = useState<FormUsuario>({
    nome: "",
    email: "",
  });
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [formNovoUsuario, setFormNovoUsuario] =
    useState<FormNovoUsuario>(NOVO_USUARIO_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Rodada 77 , pedido do usuário: salvar algo nesta tela não pode
  // "piscar" a página inteira pro topo. Antes, toda chamada de
  // `carregar()` (inclusive as de depois de salvar) ligava
  // `carregando`, e o retorno antecipado mais abaixo no componente
  // (`if (carregando) return <p>Carregando...</p>`) desmontava a tela
  // inteira enquanto refazia a busca , o navegador reseta a rolagem
  // pro topo quando o conteúdo desaparece assim. Agora só a carga
  // INICIAL (mount, com `comCarregamentoTelaCheia = true`) passa por
  // essa tela cheia; toda atualização depois de salvar só troca os
  // dados no lugar, sem desmontar nada.
  async function carregar(comCarregamentoTelaCheia = false) {
    if (!grupoId) return;
    if (comCarregamentoTelaCheia) setCarregando(true);
    try {
      setGrupo(await obterGrupo(grupoId));
      setErro(null);
    } catch {
      setErro("Não foi possível carregar os dados desta empresa.");
    } finally {
      if (comCarregamentoTelaCheia) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId]);

  function iniciarEdicaoGrupo() {
    if (!grupo) return;
    setRazaoSocialGrupo(grupo.razaoSocial);
    setLimiteMotoristasGrupo(
      grupo.limiteMotoristas != null ? String(grupo.limiteMotoristas) : "",
    );
    setErroEdicao(null);
    setEditandoGrupo(true);
  }

  async function salvarGrupo(e: FormEvent) {
    e.preventDefault();
    if (!grupoId) return;
    setErroEdicao(null);
    setSalvando(true);
    try {
      const limiteTxt = limiteMotoristasGrupo.trim();
      const limite = limiteTxt === "" ? null : Number(limiteTxt);
      if (limite !== null && (!Number.isInteger(limite) || limite < 1)) {
        setErroEdicao("O limite de motoristas deve ser um número inteiro maior que zero, ou vazio para sem limite.");
        setSalvando(false);
        return;
      }
      await atualizarGrupo(grupoId, {
        razaoSocial: razaoSocialGrupo,
        limiteMotoristas: limite,
      });
      setEditandoGrupo(false);
      await carregar();
    } catch {
      setErroEdicao("Não foi possível salvar a razão social do grupo.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicaoEmpresa(empresaId: string) {
    const e = grupo?.empresas.find((emp) => emp.id === empresaId);
    if (!e) return;
    setFormEmpresa({
      razaoSocial: e.razaoSocial,
      cnpj: e.cnpj,
      registroInpiAfd: e.registroInpiAfd ?? "",
      fusoHorario: e.fusoHorario ?? "America/Sao_Paulo",
      motivo: "",
    });
    setErroEdicao(null);
    setEmpresaEditandoId(empresaId);
  }

  async function salvarEmpresa(e: FormEvent) {
    e.preventDefault();
    if (!empresaEditandoId) return;
    setErroEdicao(null);
    setSalvando(true);
    try {
      await atualizarEmpresaSuperAdmin(empresaEditandoId, {
        razaoSocial: formEmpresa.razaoSocial,
        cnpj: formEmpresa.cnpj,
        registroInpiAfd: formEmpresa.registroInpiAfd.trim()
          ? formEmpresa.registroInpiAfd.trim()
          : undefined,
        fusoHorario: formEmpresa.fusoHorario,
        motivo: formEmpresa.motivo.trim() || undefined,
      });
      setEmpresaEditandoId(null);
      await carregar();
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setErroEdicao(
        (Array.isArray(m) ? m.join(" ") : m) ??
          "Não foi possível salvar (confira se o CNPJ já não está em uso por outra empresa).",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusEmpresa(empresaId: string, ativoAtual: boolean) {
    const acao = ativoAtual ? "desativar" : "reativar";
    if (
      !(await confirm(
        `Confirma ${acao} este CNPJ? Nada é apagado, isso só marca o cadastro.`,
      ))
    )
      return;
    await atualizarStatusEmpresaSuperAdmin(empresaId, !ativoAtual);
    await carregar();
  }

  function iniciarEdicaoUsuario(usuarioId: string) {
    const u = grupo?.usuarios.find((usr) => usr.id === usuarioId);
    if (!u) return;
    setFormUsuario({ nome: u.nome, email: u.email });
    setErroEdicao(null);
    setUsuarioEditandoId(usuarioId);
  }

  async function salvarUsuario(e: FormEvent) {
    e.preventDefault();
    if (!usuarioEditandoId) return;
    setErroEdicao(null);
    setSalvando(true);
    try {
      await atualizarUsuarioSuperAdmin(usuarioEditandoId, formUsuario);
      setUsuarioEditandoId(null);
      await carregar();
    } catch {
      setErroEdicao(
        "Não foi possível salvar (confira se o e-mail já não está em uso por outro usuário).",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNovoUsuario(e: FormEvent) {
    e.preventDefault();
    if (!grupoId) return;
    setErroEdicao(null);
    if (!cpfValido(formNovoUsuario.cpf)) {
      setErroEdicao("CPF inválido. Confira os números.");
      return;
    }
    setSalvando(true);
    try {
      await criarUsuarioGrupo(grupoId, {
        nome: formNovoUsuario.nome,
        cpf: formNovoUsuario.cpf,
        email: formNovoUsuario.email,
        senha: formNovoUsuario.senha,
        papel: formNovoUsuario.papel,
        telefoneWhatsapp: formNovoUsuario.telefoneWhatsapp.trim() || undefined,
      });
      setFormNovoUsuario(NOVO_USUARIO_PADRAO);
      setCriandoUsuario(false);
      await carregar();
    } catch {
      setErroEdicao(
        "Não foi possível cadastrar (confira se o e-mail já não está em uso por outro usuário).",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alternarDestinatarioWhatsapp(
    usuarioId: string,
    mudanca: { recebeWhatsappAlertas?: boolean; recebeWhatsappEquipeGr?: boolean },
  ) {
    await atualizarDestinatariosWhatsapp(usuarioId, mudanca);
    await carregar();
  }

  async function alternarStatusUsuario(usuarioId: string, ativoAtual: boolean) {
    if (!grupoId) return;
    const acao = ativoAtual ? "desativar" : "reativar";
    if (
      !(await confirm(
        `Confirma ${acao} o acesso deste usuário? Nada é apagado, isso só marca o cadastro.`,
      ))
    )
      return;
    await atualizarStatusUsuarioGrupo(grupoId, usuarioId, !ativoAtual);
    await carregar();
  }

  async function excluirUsuario(usuarioId: string) {
    if (!grupoId) return;
    if (
      !(await confirm(
        "Excluir este usuário? Ele perde o acesso e some das listas, o e-mail fica livre para novo cadastro. Tudo que ele fez continua gravado no histórico. Não dá para desfazer.",
      ))
    )
      return;
    try {
      await excluirUsuarioGrupo(grupoId, usuarioId);
      await carregar();
    } catch {
      setErro("Não foi possível excluir o usuário.");
    }
  }

  if (carregando) return <p>Carregando...</p>;
  if (erro) return <p className="error-text">{erro}</p>;
  if (!grupo) return <p>Empresa não encontrada.</p>;

  return (
    <div>
      <p>
        <Link to="/super-admin/grupos">&laquo; Voltar</Link>
      </p>

      {editandoGrupo ? (
        <form
          onSubmit={salvarGrupo}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            maxWidth: 480,
          }}
        >
          <div style={{ flex: 1 }}>
            <label>Razão social da empresa mãe</label>
            <CampoTextoExpansivel maxLength={200}
              value={razaoSocialGrupo}
              onChange={(e) => setRazaoSocialGrupo(e.target.value)}
              required
            />
            <label style={{ marginTop: 8, display: "block" }}>
              Limite de motoristas (vazio = sem limite)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={limiteMotoristasGrupo}
              onChange={(e) => setLimiteMotoristasGrupo(e.target.value)}
            />
          </div>
          <button type="submit" disabled={salvando}>
            Salvar
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setEditandoGrupo(false)}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <h2>
          {grupo.razaoSocial}{" "}
          <button
            className="secondary"
            style={{ fontSize: 12 }}
            onClick={iniciarEdicaoGrupo}
          >
            Editar
          </button>
        </h2>
      )}
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Empresa mãe desde{" "}
        {new Date(grupo.createdAt).toLocaleDateString("pt-BR")} · Limite de
        motoristas:{" "}
        {grupo.limiteMotoristas != null ? grupo.limiteMotoristas : "sem limite"}
      </p>
      {erroEdicao && <p className="error-text">{erroEdicao}</p>}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>CNPJs do grupo</h3>
        <table>
          <thead>
            <tr>
              <th>Razão social</th>
              <th>CNPJ</th>
              <th>Registro INPI/AFD</th>
              <th>Status</th>
              <th>Motoristas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grupo.empresas.map((e) =>
              empresaEditandoId === e.id ? (
                <tr key={e.id}>
                  <td colSpan={8}>
                    <form
                      onSubmit={salvarEmpresa}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 1fr 1fr auto auto",
                        gap: 8,
                        alignItems: "flex-end",
                      }}
                    >
                      <div>
                        <label>Razão social</label>
                        <CampoTextoExpansivel maxLength={200}
                          value={formEmpresa.razaoSocial}
                          onChange={(ev) =>
                            setFormEmpresa((f) => ({
                              ...f,
                              razaoSocial: ev.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <label>CNPJ</label>
                        <input maxLength={14}
                          value={formEmpresa.cnpj}
                          onChange={(ev) =>
                            setFormEmpresa((f) => ({
                              ...f,
                              cnpj: ev.target.value,
                            }))
                          }
                          pattern="\d{14}"
                          title="14 dígitos, só números"
                          required
                        />
                      </div>
                      <div>
                        <label>Registro INPI/AFD</label>
                        <input maxLength={100}
                          value={formEmpresa.registroInpiAfd}
                          onChange={(ev) =>
                            setFormEmpresa((f) => ({
                              ...f,
                              registroInpiAfd: ev.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label>Fuso da transportadora (só visualização)</label>
                        <select
                          value={formEmpresa.fusoHorario}
                          onChange={(ev) =>
                            setFormEmpresa((f) => ({
                              ...f,
                              fusoHorario: ev.target.value,
                            }))
                          }
                        >
                          <option value="America/Sao_Paulo">
                            Brasília (UTC-3)
                          </option>
                          <option value="America/Cuiaba">
                            Mato Grosso / MS / AM / RO / RR (UTC-4)
                          </option>
                          <option value="America/Rio_Branco">
                            Acre (UTC-5)
                          </option>
                          <option value="America/Noronha">
                            Fernando de Noronha (UTC-2)
                          </option>
                        </select>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            setFormEmpresa((f) => ({
                              ...f,
                              fusoHorario: fusoIanaDoNavegador(),
                            }))
                          }
                        >
                          Usar o fuso deste computador
                        </button>
                      </div>
                      <div>
                        <label>Motivo da alteração (obrigatório se algo mudar)</label>
                        <input
                          maxLength={300}
                          value={formEmpresa.motivo}
                          onChange={(ev) =>
                            setFormEmpresa((f) => ({
                              ...f,
                              motivo: ev.target.value,
                            }))
                          }
                        />
                      </div>
                      <button type="submit" disabled={salvando}>
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEmpresaEditandoId(null)}
                      >
                        Cancelar
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={e.id}>
                  <td>{e.razaoSocial}</td>
                  <td>{e.cnpj}</td>
                  <td>{e.registroInpiAfd ?? ","}</td>
                  <td>{e.ativo ? "Ativo" : "Desativado"}</td>
                  <td>{e.totalMotoristas}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button
                      className="secondary"
                      onClick={() => iniciarEdicaoEmpresa(e.id)}
                    >
                      Editar
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setRegimeEmpresaId(e.id)}
                    >
                      Banco de horas
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setChavesEmpresaId(e.id)}
                    >
                      Chaves
                    </button>
                    <button
                      className="secondary"
                      onClick={() => alternarStatusEmpresa(e.id, e.ativo)}
                    >
                      {e.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {chavesEmpresaId && (() => {
          const emp = grupo.empresas.find((x) => x.id === chavesEmpresaId);
          if (!emp) return null;
          return (
            <div style={{ marginTop: 16 }}>
              <ChavesLiberacaoPainel
                key={emp.id}
                empresaId={emp.id}
                nome={emp.razaoSocial}
                chaves={emp.chaves ?? []}
                onAlterado={() => void carregar()}
                onFechar={() => setChavesEmpresaId(null)}
              />
            </div>
          );
        })()}
        {regimeEmpresaId && (() => {
          const emp = grupo.empresas.find((x) => x.id === regimeEmpresaId);
          if (!emp) return null;
          return (
            <div style={{ marginTop: 16 }}>
              <RegimeBancoHorasForm
                key={emp.id}
                empresaId={emp.id}
                nome={emp.razaoSocial}
                inicial={emp.bancoHoras}
                onFechar={() => setRegimeEmpresaId(null)}
                onSalvo={() => {
                  setRegimeEmpresaId(null);
                  void carregar();
                }}
              />
            </div>
          );
        })()}
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Gestores e admins</h3>
          {!criandoUsuario && (
            <button
              className="secondary"
              onClick={() => {
                setFormNovoUsuario(NOVO_USUARIO_PADRAO);
                setErroEdicao(null);
                setCriandoUsuario(true);
              }}
            >
              + Novo usuário
            </button>
          )}
        </div>

        {criandoUsuario && (
          <form
            onSubmit={salvarNovoUsuario}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 0.7fr 1.8fr",
              gap: 8,
              alignItems: "flex-end",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <button type="submit" disabled={salvando}>
                Cadastrar
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setCriandoUsuario(false)}
              >
                Cancelar
              </button>
            </div>
            <div>
              <label>Nome</label>
              <input
                value={formNovoUsuario.nome}
                onChange={(ev) =>
                  setFormNovoUsuario((f) => ({ ...f, nome: ev.target.value }))
                }
                maxLength={60}
                required
              />
            </div>
            <div>
              <label>CPF</label>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={aplicarMascaraCpf(formNovoUsuario.cpf)}
                onChange={(ev) =>
                  setFormNovoUsuario((f) => ({ ...f, cpf: somenteDigitos(ev.target.value).slice(0, 11) }))
                }
                maxLength={14}
                required
              />
            </div>
            <div>
              <label>E-mail</label>
              <input
                type="email" maxLength={254}
                autoComplete="off"
                value={formNovoUsuario.email}
                onChange={(ev) =>
                  setFormNovoUsuario((f) => ({ ...f, email: ev.target.value }))
                }
                required
              />
            </div>
            <div>
              <label>Senha inicial</label>
              <input
                type="password" maxLength={128}
                autoComplete="new-password"
                minLength={10}
                value={formNovoUsuario.senha}
                onChange={(ev) =>
                  setFormNovoUsuario((f) => ({ ...f, senha: ev.target.value }))
                }
                required
              />
            </div>
            <div>
              <label>Papel</label>
              <select
                value={formNovoUsuario.papel}
                onChange={(ev) =>
                  setFormNovoUsuario((f) => ({
                    ...f,
                    papel: ev.target.value as PapelUsuario,
                  }))
                }
              >
                <option value="GESTOR">GESTOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label>WhatsApp (opcional)</label>
              <TelefoneInput
                value={formNovoUsuario.telefoneWhatsapp}
                onChange={(novoValor) =>
                  setFormNovoUsuario((f) => ({
                    ...f,
                    telefoneWhatsapp: novoValor,
                  }))
                }
              />
            </div>
          </form>
        )}

        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Desde</th>
              <th>WhatsApp: equipe de GR</th>
              <th>WhatsApp: pessoal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {grupo.usuarios.map((u) =>
              usuarioEditandoId === u.id ? (
                <tr key={u.id}>
                  <td colSpan={6}>
                    <form
                      onSubmit={salvarUsuario}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr auto auto",
                        gap: 8,
                        alignItems: "flex-end",
                      }}
                    >
                      <div>
                        <label>Nome</label>
                        <input
                          value={formUsuario.nome}
                          onChange={(ev) =>
                            setFormUsuario((f) => ({
                              ...f,
                              nome: ev.target.value,
                            }))
                          }
                          maxLength={60}
                          required
                        />
                      </div>
                      <div>
                        <label>E-mail</label>
                        <input
                          type="email" maxLength={254}
                          autoComplete="off"
                          value={formUsuario.email}
                          onChange={(ev) =>
                            setFormUsuario((f) => ({
                              ...f,
                              email: ev.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <button type="submit" disabled={salvando}>
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setUsuarioEditandoId(null)}
                      >
                        Cancelar
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{rotuloPapel(u.papel)}</td>
                  <td>{u.ativo ? "Ativo" : "Desativado"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {u.telefoneGerenciamentoRisco ? (
                      <label style={{ fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={u.recebeWhatsappEquipeGr !== false}
                          onChange={(ev) =>
                            alternarDestinatarioWhatsapp(u.id, {
                              recebeWhatsappEquipeGr: ev.target.checked,
                            })
                          }
                        />{" "}
                        {u.telefoneGerenciamentoRisco}
                      </label>
                    ) : (
                      <span style={{ fontSize: 12 }}>sem número de GR</span>
                    )}
                  </td>
                  <td>
                    {u.telefoneWhatsapp ? (
                      <label style={{ fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={u.recebeWhatsappAlertas === true}
                          onChange={(ev) =>
                            alternarDestinatarioWhatsapp(u.id, {
                              recebeWhatsappAlertas: ev.target.checked,
                            })
                          }
                        />{" "}
                        {u.telefoneWhatsapp}
                      </label>
                    ) : (
                      <span style={{ fontSize: 12 }}>sem WhatsApp</span>
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button
                      className="secondary"
                      onClick={() => iniciarEdicaoUsuario(u.id)}
                    >
                      Editar
                    </button>
                    <button
                      className="secondary"
                      onClick={() => alternarStatusUsuario(u.id, u.ativo)}
                    >
                      {u.ativo ? "Desativar" : "Reativar"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => excluirUsuario(u.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: "#000000", marginTop: 8 }}>
          O super admin cadastra e ativa/desativa funcionários (ADMIN/GESTOR)
          de uma empresa cliente; os administradores da empresa também podem
          gerenciar os usuários dela na tela "Usuários", conforme a permissão.
          Cada usuário edita seu próprio nome, contato e e-mail em "Meu
          perfil"; trocar o papel (ADMIN/GESTOR) exige desativar e recriar o
          cadastro.
        </p>
      </div>
    </div>
  );
}
