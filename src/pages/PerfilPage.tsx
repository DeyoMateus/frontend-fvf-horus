import { FormEvent, useEffect, useState } from "react";
import { atualizarMeuPerfil, obterMeuPerfil } from "../api/usuariosEmpresa";
import type { UsuarioEmpresaListado } from "../api/types";
import { TelefoneInput } from "../components/TelefoneInput";

/**
 * "Meu perfil" (Rodada 38) , o próprio ADMIN/GESTOR logado edita seu
 * nome, contato (WhatsApp) e e-mail. Criado junto com a remoção da
 * tela de Usuários do painel da empresa: agora cada usuário só edita
 * o PRÓPRIO cadastro, quem cria/ativa/desativa funcionário é o super
 * admin da plataforma.
 *
 * Atenção (mostrado também na tela): o token de sessão guarda o
 * e-mail no momento do login , depois de trocar o e-mail aqui, é
 * preciso sair e entrar de novo pra usar o e-mail novo no próximo
 * login (a sessão atual continua válida normalmente até então).
 */
export function PerfilPage() {
  const [perfil, setPerfil] = useState<UsuarioEmpresaListado | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await obterMeuPerfil();
      setPerfil(dados);
      setNome(dados.nome);
      setEmail(dados.email);
      setTelefoneWhatsapp(dados.telefoneWhatsapp ?? "");
    } catch {
      setErro("Não foi possível carregar seu perfil.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      const atualizado = await atualizarMeuPerfil({
        nome: nome.trim(),
        email: email.trim(),
        telefoneWhatsapp: telefoneWhatsapp.trim() || undefined,
      });
      setPerfil(atualizado);
      setSucesso("Perfil atualizado com sucesso.");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErro(
        Array.isArray(msg)
          ? msg.join(" ")
          : (msg ?? "Não foi possível salvar as alterações."),
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p>Carregando…</p>;

  return (
    <div>
      <h2>Meu perfil</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Edite seu nome, contato (WhatsApp) e e-mail de acesso. Papel de acesso e
        status (ativo/inativo) são gerenciados pelo super admin da plataforma.
        Fale com quem administra sua conta FVF Hórus caso precise alterar isso.
      </p>

      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <form onSubmit={onSubmit}>
          <label>Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            minLength={2}
            maxLength={60}
            required
          />

          <label style={{ marginTop: 8, display: "block" }}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
            Ao trocar o e-mail, use o novo e-mail no próximo login (a sessão
            atual continua válida até você sair).
          </p>

          <label style={{ marginTop: 8, display: "block" }}>
            Contato (WhatsApp)
          </label>
          <TelefoneInput
            value={telefoneWhatsapp}
            onChange={setTelefoneWhatsapp}
          />

          <label style={{ marginTop: 12, display: "block" }}>
            Papel de acesso
          </label>
          <input value={perfil?.papel ?? ""} disabled />

          {erro && <p className="error-text">{erro}</p>}
          {sucesso && (
            <p style={{ color: "#166534", fontSize: 13 }}>{sucesso}</p>
          )}

          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
