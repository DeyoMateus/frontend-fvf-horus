import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';
import { BotaoLink } from "../components/BotaoLink";

export function SuperAdminLoginPage() {
  const { entrar } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [pedeCodigo, setPedeCodigo] = useState(false);
  const [codigoMfa, setCodigoMfa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha, pedeCodigo ? codigoMfa.trim() : undefined);
      navigate('/super-admin/grupos');
    } catch (erro) {
      // Ver comentário equivalente em LoginPage.tsx.
      if (erro instanceof AxiosError && erro.response?.status === 429) {
        setErro(erro.response.data?.message ?? 'Muitas tentativas de login. Tente novamente mais tarde.');
      } else if (erro instanceof AxiosError && erro.response?.data?.codigo === 'MFA_REQUERIDO') {
        setPedeCodigo(true);
        setErro(null);
      } else if (pedeCodigo && erro instanceof AxiosError && erro.response?.status === 401) {
        setErro('Código de verificação inválido.');
      } else {
        setErro('Credenciais inválidas.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-box card">
        <h1>FVF Hórus</h1>
        <p style={{ color: '#000000', fontSize: 13, marginTop: -8 }}>Super admin da plataforma</p>
        <form onSubmit={onSubmit}>
          <label>E-mail</label>
          <input type="email" maxLength={254} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Senha</label>
          <input type="password" maxLength={128} autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          {pedeCodigo && (
            <>
              <label>Código do aplicativo autenticador</label>
              <input inputMode="text" autoComplete="one-time-code" maxLength={16} value={codigoMfa} onChange={(e) => setCodigoMfa(e.target.value)} autoFocus required />
              <p style={{ fontSize: 12, marginTop: 2 }}>Digite os 6 números do aplicativo ou um código de reserva.</p>
            </>
          )}
          {erro && <p className="error-text">{erro}</p>}
          <button type="submit" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <BotaoLink to="/super-admin/esqueci-senha">Esqueci minha senha</BotaoLink>
      </div>
    </div>
  );
}
