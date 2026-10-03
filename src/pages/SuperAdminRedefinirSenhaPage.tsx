import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { redefinirSenhaSuperAdmin } from '../api/superAdminAuth';

// Espelha RedefinirSenhaPage.tsx (painel do grupo).
export function SuperAdminRedefinirSenhaPage() {
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
      await redefinirSenhaSuperAdmin(token, novaSenha);
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
        <p style={{ color: '#000000', fontSize: 13, marginTop: -8 }}>Definir nova senha do super admin</p>
        {!token ? (
          <p className="error-text">Link inválido, falta o token de recuperação.</p>
        ) : sucesso ? (
          <>
            <p>Senha redefinida com sucesso. Todas as sessões anteriores foram encerradas por segurança.</p>
            <button onClick={() => navigate('/super-admin/login')}>Ir para o login</button>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <label>Nova senha</label>
            <input type="password" minLength={8} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
            {erro && <p className="error-text">{erro}</p>}
            <button type="submit" disabled={enviando}>
              {enviando ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </form>
        )}
        <p style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/super-admin/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
