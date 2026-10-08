import { FormEvent, useEffect, useState } from "react";
import {
  atualizarLimitesEspera,
  atualizarMeuPerfil,
  obterLimitesEspera,
  obterMeuPerfil,
} from "../api/usuariosEmpresa";
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
// A tela trabalha em horas (ex.: 4.75 = 4h45); a API continua em minutos.
function minParaHoras(min: number): string {
  return String(Math.round((min / 60) * 100) / 100);
}
function horasParaMin(h: string): number {
  return Math.round(Number(String(h).replace(",", ".")) * 60);
}

export function PerfilPage() {
  const [perfil, setPerfil] = useState<UsuarioEmpresaListado | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState("");
  const [telefoneGr, setTelefoneGr] = useState("");
  const [limInfo, setLimInfo] = useState("3");
  const [limAtencao, setLimAtencao] = useState("4.75");
  const [limCritico, setLimCritico] = useState("5");
  const [salvandoGr, setSalvandoGr] = useState(false);
  const [erroGr, setErroGr] = useState<string | null>(null);
  const [sucessoGr, setSucessoGr] = useState<string | null>(null);
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
      setTelefoneGr(dados.telefoneGerenciamentoRisco ?? "");
      try {
        const l = await obterLimitesEspera();
        setLimInfo(minParaHoras(l.infoMin));
        setLimAtencao(minParaHoras(l.atencaoMin));
        setLimCritico(minParaHoras(l.criticoMin));
      } catch {
        /* mantém os padrões na tela */
      }
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

  async function salvarGr(e: FormEvent) {
    e.preventDefault();
    setErroGr(null);
    setSucessoGr(null);
    setSalvandoGr(true);
    try {
      if (perfil?.papel === "ADMIN") {
        const atualizado = await atualizarMeuPerfil({
          telefoneGerenciamentoRisco: telefoneGr.trim() || null,
        });
        setPerfil(atualizado);
      }
      await atualizarLimitesEspera({
        infoMin: horasParaMin(limInfo),
        atencaoMin: horasParaMin(limAtencao),
        criticoMin: horasParaMin(limCritico),
      });
      setSucessoGr("Configurações de GR salvas.");
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErroGr(
        Array.isArray(msg)
          ? msg.join(" ")
          : (msg ?? "Não foi possível salvar as configurações."),
      );
    } finally {
      setSalvandoGr(false);
    }
  }

  if (carregando) return <p>Carregando…</p>;

  return (
    <div>
      <h2>Configuração</h2>
      <p style={{ fontSize: 13, color: "#000000", marginTop: -8 }}>
        Edite seu nome, contato (WhatsApp) e e-mail de acesso. Papel de acesso e
        status (ativo/inativo) são gerenciados pelo super admin da plataforma.
        Fale com quem administra sua conta FVF Hórus caso precise alterar isso.
      </p>

      <div className="card" style={{ maxWidth: 480, margin: "0 auto 20px" }}>
        <h3 style={{ marginTop: 0 }}>Dados do usuário</h3>
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
            type="email" maxLength={254}
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

      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h3 style={{ marginTop: 0 }}>Gerenciamento de Risco (GR)</h3>
        <form onSubmit={salvarGr}>
          {perfil?.papel === "ADMIN" && (
            <>
              <label>WhatsApp da equipe de Gerenciamento de Risco</label>
              <TelefoneInput value={telefoneGr} onChange={setTelefoneGr} />
              <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
                Os alertas da operação também chegam por WhatsApp neste número.
                Deixe em branco para não enviar.
              </p>
            </>
          )}

          <h4 style={{ marginBottom: 4 }}>Limites de espera do motorista</h4>
          <p style={{ fontSize: 12, color: "#000000", marginTop: 0 }}>
            Tempo acumulado de espera em carga/descarga na jornada, em horas
            (ex.: 4,75 = 4h45). A referência legal é 5 h. Padrão: 3 / 4,75 / 5.
          </p>
          <label>Aviso informativo (horas)</label>
          <input
            type="number" min={0.25} max={24} step={0.25} required
            value={limInfo}
            onChange={(e) => setLimInfo(e.target.value)}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Próximo do limite (horas)
          </label>
          <input
            type="number" min={0.25} max={24} step={0.25} required
            value={limAtencao}
            onChange={(e) => setLimAtencao(e.target.value)}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Limite atingido (horas)
          </label>
          <input
            type="number" min={0.25} max={24} step={0.25} required
            value={limCritico}
            onChange={(e) => setLimCritico(e.target.value)}
          />
          <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
            Os valores precisam estar em ordem crescente. Vale para jornadas
            novas e para as que ainda estão em andamento.
          </p>

          {erroGr && <p className="error-text">{erroGr}</p>}
          {sucessoGr && (
            <p style={{ color: "#166534", fontSize: 13 }}>{sucessoGr}</p>
          )}
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={salvandoGr}>
              {salvandoGr ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
