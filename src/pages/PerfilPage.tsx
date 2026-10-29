import { FormEvent, useEffect, useState } from "react";
import {
  atualizarLimitesDocumentacao,
  atualizarLimitesEspera,
  atualizarMeuPerfil,
  obterLimitesDocumentacao,
  obterLimitesEspera,
  obterMeuPerfil,
} from "../api/usuariosEmpresa";
import type { UsuarioEmpresaListado } from "../api/types";
import { alterarMinhaSenha } from "../api/usuariosEmpresa";
import { useAuth } from "../context/AuthContext";
import { TelefoneInput } from "../components/TelefoneInput";
import { obterMinhaPolitica } from "../api/privacidade";
import type { MinhaPolitica } from "../api/privacidade";
import { PoliticaPrivacidadeModal } from "../components/PoliticaPrivacidadeModal";
import { MfaCard } from "../components/MfaCard";

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
// A tela trabalha em HH:MM (ex.: 04:45); a API continua em minutos.
function minParaHoras(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function horasParaMin(h: string): number {
  const [hh, mm] = String(h).split(":");
  return Number(hh) * 60 + Number(mm ?? 0);
}

export function PerfilPage() {
  const [politica, setPolitica] = useState<MinhaPolitica | null>(null);
  const [politicaAberta, setPoliticaAberta] = useState(false);
  const [politicaFalhou, setPoliticaFalhou] = useState(false);
  useEffect(() => {
    obterMinhaPolitica()
      .then(setPolitica)
      .catch(() => {
        setPolitica(null);
        setPoliticaFalhou(true);
      });
  }, []);
  const [perfil, setPerfil] = useState<UsuarioEmpresaListado | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState("");
  const [telefoneGr, setTelefoneGr] = useState("");
  const [limInfo, setLimInfo] = useState("03:00");
  const [limAtencao, setLimAtencao] = useState("04:45");
  const [limCritico, setLimCritico] = useState("05:00");
  const [limMotivo, setLimMotivo] = useState("");
  const [limCct, setLimCct] = useState("");
  const [docInfo, setDocInfo] = useState("03:00");
  const [docAtencao, setDocAtencao] = useState("04:45");
  const [docCritico, setDocCritico] = useState("05:00");
  const [salvandoGr, setSalvandoGr] = useState(false);
  const [erroGr, setErroGr] = useState<string | null>(null);
  const [sucessoGr, setSucessoGr] = useState<string | null>(null);
  const { sair } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState<string | null>(null);
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
      try {
        const d = await obterLimitesDocumentacao();
        setDocInfo(minParaHoras(d.infoMin));
        setDocAtencao(minParaHoras(d.atencaoMin));
        setDocCritico(minParaHoras(d.criticoMin));
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

  async function onTrocarSenha(e: FormEvent) {
    e.preventDefault();
    setErroSenha(null);
    setSucessoSenha(null);
    if (novaSenha !== confirmaSenha) {
      setErroSenha("A confirmação não confere com a nova senha.");
      return;
    }
    setSalvandoSenha(true);
    try {
      await alterarMinhaSenha(senhaAtual, novaSenha);
      setSucessoSenha("Senha alterada. Você será desconectado para entrar de novo.");
      setTimeout(() => {
        void sair();
      }, 1800);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setErroSenha(
        Array.isArray(msg)
          ? msg.join(" ")
          : (msg ?? "Não foi possível alterar a senha."),
      );
    } finally {
      setSalvandoSenha(false);
    }
  }

  async function salvarGr(e: FormEvent) {
    e.preventDefault();
    setErroGr(null);
    setSucessoGr(null);
    setSalvandoGr(true);
    try {
      if (perfil?.adminPrincipal) {
        const atualizado = await atualizarMeuPerfil({
          telefoneGerenciamentoRisco: telefoneGr.trim() || null,
        });
        setPerfil(atualizado);
      }
      await atualizarLimitesEspera({
        infoMin: horasParaMin(limInfo),
        atencaoMin: horasParaMin(limAtencao),
        criticoMin: horasParaMin(limCritico),
        motivo: limMotivo.trim() || undefined,
        referenciaCct: limCct.trim() || undefined,
      });
      await atualizarLimitesDocumentacao({
        infoMin: horasParaMin(docInfo),
        atencaoMin: horasParaMin(docAtencao),
        criticoMin: horasParaMin(docCritico),
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
        <h3 style={{ marginTop: 0 }}>Política de Privacidade</h3>
        <p style={{ fontSize: 13, marginTop: 0 }}>
          Veja o texto da política que você aceitou ao entrar no painel.
          {politica?.aceitaEm &&
            ` Aceita em ${new Date(politica.aceitaEm).toLocaleDateString("pt-BR")}.`}
        </p>
        <button
          type="button"
          disabled={!politica}
          onClick={() => setPoliticaAberta(true)}
        >
          {politica || politicaFalhou ? "Ler política" : "Carregando…"}
        </button>
        {politicaFalhou && (
          <p style={{ fontSize: 12, color: "#b91c1c" }}>
            Não foi possível carregar a política agora. Recarregue a página e tente de
            novo; se continuar, avise o suporte.
          </p>
        )}
        {politicaAberta && politica && (
          <PoliticaPrivacidadeModal
            politica={politica}
            modo="leitura"
            onFechar={() => setPoliticaAberta(false)}
          />
        )}
      </div>

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

        <form onSubmit={onTrocarSenha} style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 4 }}>Alterar senha</h4>
          <label>Senha atual</label>
          <input
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            maxLength={128}
            required
          />
          <label style={{ marginTop: 8, display: "block" }}>Nova senha</label>
          <input
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            minLength={10}
            maxLength={128}
            required
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Confirmar nova senha
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmaSenha}
            onChange={(e) => setConfirmaSenha(e.target.value)}
            minLength={10}
            maxLength={128}
            required
          />
          <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
            Mínimo de 10 caracteres, com letra e número. Ao alterar, todas as sessões são encerradas
            e você entra de novo com a nova senha.
          </p>
          {erroSenha && <p className="error-text">{erroSenha}</p>}
          {sucessoSenha && (
            <p style={{ color: "#166534", fontSize: 13 }}>{sucessoSenha}</p>
          )}
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={salvandoSenha}>
              {salvandoSenha ? "Alterando…" : "Alterar senha"}
            </button>
          </div>
        </form>
      </div>

      <MfaCard ativo={!!perfil?.mfaAtivo} validoAte={perfil?.mfaValidoAte} expirado={perfil?.mfaExpirado} onMudou={() => obterMeuPerfil().then(setPerfil).catch(() => undefined)}
      />

      <div className="card" style={{ maxWidth: 480, margin: "16px auto 0" }}>
        <h3 style={{ marginTop: 0 }}>Gerenciamento de Risco (GR)</h3>
        <form onSubmit={salvarGr}>
          {perfil?.papel === "ADMIN" && !perfil.adminPrincipal && (
            <>
              <label>WhatsApp da equipe de Gerenciamento de Risco</label>
              <p style={{ fontSize: 14, margin: "4px 0" }}>
                {telefoneGr || "Não cadastrado"}
              </p>
              <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
                Somente o administrador principal da conta da transportadora
                mãe pode cadastrar ou alterar este número.
              </p>
            </>
          )}
          {perfil?.adminPrincipal && (
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
            Tempo acumulado de espera em carga/descarga na jornada, no formato
            HH:MM. A referência legal é 05:00. Padrão: 03:00 / 04:45 / 05:00.
          </p>
          <label>Aviso informativo</label>
          <input
            type="time" required
            value={limInfo}
            onChange={(e) => setLimInfo(e.target.value)}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Próximo do limite 
          </label>
          <input
            type="time" required
            value={limAtencao}
            onChange={(e) => setLimAtencao(e.target.value)}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Limite atingido 
          </label>
          <input
            type="time" required
            value={limCritico}
            onChange={(e) => setLimCritico(e.target.value)}
          />
          <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
            Os valores precisam estar em ordem crescente. Vale para jornadas
            novas e para as que ainda estão em andamento.
          </p>
          <p style={{ fontSize: 12, color: "#000000", marginTop: 2 }}>
            Para ampliar o limite atingido acima de 2 horas, somente um
            administrador, informando o motivo e a convenção ou acordo
            coletivo que sustenta.
          </p>
          <label>Motivo da ampliação</label>
          <input
            maxLength={300}
            value={limMotivo}
            onChange={(e) => setLimMotivo(e.target.value)}
          />
          <label>Convenção ou acordo coletivo</label>
          <input
            maxLength={120}
            value={limCct}
            onChange={(e) => setLimCct(e.target.value)}
          />

          <h4 style={{ marginBottom: 4 }}>
            Limites de aguardando documentação
          </h4>
          <p style={{ fontSize: 12, color: "#000000", marginTop: 0 }}>
            Tempo acumulado do motorista em "Aguardando documentação" na
            jornada, no formato HH:MM. Funciona igual à espera: aviso
            informativo, atenção e crítico. Padrão: 03:00 / 04:45 / 05:00.
          </p>
          <label>Aviso informativo</label>
          <input
            type="time" required
            value={docInfo}
            onChange={(e) => setDocInfo(e.target.value)}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Próximo do limite 
          </label>
          <input
            type="time" required
            value={docAtencao}
            onChange={(e) => setDocAtencao(e.target.value)}
          />
          <label style={{ marginTop: 8, display: "block" }}>
            Limite atingido 
          </label>
          <input
            type="time" required
            value={docCritico}
            onChange={(e) => setDocCritico(e.target.value)}
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
