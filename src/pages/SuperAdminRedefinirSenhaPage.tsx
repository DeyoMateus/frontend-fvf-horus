import { validarSenhaNova } from '../utils/senha';
import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { redefinirSenhaSuperAdmin } from '../api/superAdminAuth';
import { BotaoLink } from "../components/BotaoLink";
import {
  classificarErroRedefinicao,
  type TipoErroRedefinicao,
} from '../utils/erroRedefinirSenha';

// Espelha RedefinirSenhaPage.tsx (painel do grupo).
export function SuperAdminRedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<{ tipo: TipoErroRedefinicao | 'local'; mensagem: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const erroSenha = validarSenhaNova(novaSenha);
    if (erroSenha) {
      setErro({ tipo: 'local', mensagem: erroSenha });
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro({ tipo: 'local', mensagem: 'As duas senhas não são iguais.' });
      return;
    }
    setEnviando(true);
    try {
      await redefinirSenhaSuperAdmin(token, novaSenha);
      setSucesso(true);
    } catch (err) {
      setErro(classificarErroRedefinicao(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box card">
        <h1>FVF Hórus</h1>
        <p style={{ color: '#000000', fontSize: 13, marginTop: -8 }}>Definir nova senha do super admin</p>
        {!token ? (
          <>
            <p className="error-text">Este link está incompleto: falta o código de recuperação. Abra o link direto do e-mail ou peça um novo.</p>
            <button onClick={() => navigate('/super-admin/esqueci-senha')}>Pedir novo link</button>
          </>
        ) : sucesso ? (
          <>
            <p>Senha redefinida com sucesso. Todas as sessões anteriores foram encerradas por segurança.</p>
            <button onClick={() => navigate('/super-admin/login')}>Ir para o login</button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <label>Nova senha</label>
            <input
              type={mostrar ? 'text' : 'password'}
              maxLength={128}
              autoComplete="new-password"
              minLength={10}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
            <p style={{ fontSize: 12, color: '#000', margin: '4px 0 12px' }}>Mínimo de 10 caracteres, com letra e número.</p>
            <label>Confirmar nova senha</label>
            <input
              type={mostrar ? 'text' : 'password'}
              maxLength={128}
              autoComplete="new-password"
              minLength={10}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '10px 0' }}>
              <input
                type="checkbox"
                style={{ width: 'auto', margin: 0 }}
                checked={mostrar}
                onChange={(e) => setMostrar(e.target.checked)}
              />
              Mostrar senha
            </label>
            {erro && <p className="error-text">{erro.mensagem}</p>}
            <button type="submit" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Redefinir senha'}
            </button>
            {erro?.tipo === 'link' && (
              <button type="button" onClick={() => navigate('/super-admin/esqueci-senha')}>
                Pedir novo link
              </button>
            )}
          </form>
        )}
        <BotaoLink to="/super-admin/login">Voltar ao login</BotaoLink>
      </div>
    </div>
  );
}
