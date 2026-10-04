import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { redefinirSenha } from '../api/auth';

export function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await redefinirSenha(token, novaSenha);
      setSucesso(true);
    } catch {
      setErro('Link inválido ou expirado. Solicite um novo link de recuperação.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box card">
        <h1>FVF Hórus</h1>
        <p style={{ color: '#000000', fontSize: 13, marginTop: -8 }}>Definir nova senha</p>
        {!token ? (
          <p className="error-text">Link inválido, falta o token de recuperação.</p>
        ) : sucesso ? (
          <>
            <p>Senha redefinida com sucesso. Todas as sessões anteriores foram encerradas por segurança.</p>
            <button onClick={() => navigate('/login')}>Ir para o login</button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <label>Nova senha</label>
            <input type="password" autoComplete="new-password" minLength={8} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
            {erro && <p className="error-text">{erro}</p>}
            <button type="submit" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}
        <p style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
