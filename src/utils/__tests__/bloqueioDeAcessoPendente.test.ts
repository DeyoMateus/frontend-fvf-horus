import { describe, expect, it } from 'vitest';
import { liberarPerfilParaResolverPendencia } from '../bloqueioDeAcessoPendente';

const erro = (status: number, codigo?: string) => ({ response: { status, data: { codigo } } });

describe('liberarPerfilParaResolverPendencia (rodada 687)', () => {
  it('libera o perfil quando a senha e provisoria, o MFA falta ou venceu', () => {
    expect(liberarPerfilParaResolverPendencia(erro(403, 'SENHA_PROVISORIA'), '/perfil')).toBe(true);
    expect(liberarPerfilParaResolverPendencia(erro(403, 'MFA_CADASTRO_PENDENTE'), '/perfil')).toBe(true);
    expect(liberarPerfilParaResolverPendencia(erro(403, 'MFA_EXPIRADO'), '/perfil')).toBe(true);
  });

  it('nao libera fora da tela de perfil', () => {
    expect(liberarPerfilParaResolverPendencia(erro(403, 'SENHA_PROVISORIA'), '/')).toBe(false);
    expect(liberarPerfilParaResolverPendencia(erro(403, 'SENHA_PROVISORIA'), '/motoristas')).toBe(false);
    expect(liberarPerfilParaResolverPendencia(erro(403, 'SENHA_PROVISORIA'), '/perfil-falso')).toBe(false);
  });

  it('nao libera outros erros (rede, 401, 403 sem codigo ou de outro motivo)', () => {
    expect(liberarPerfilParaResolverPendencia(new Error('rede'), '/perfil')).toBe(false);
    expect(liberarPerfilParaResolverPendencia(erro(401, 'SENHA_PROVISORIA'), '/perfil')).toBe(false);
    expect(liberarPerfilParaResolverPendencia(erro(403), '/perfil')).toBe(false);
    expect(liberarPerfilParaResolverPendencia(erro(403, 'OUTRO'), '/perfil')).toBe(false);
    expect(liberarPerfilParaResolverPendencia(null, '/perfil')).toBe(false);
  });
});
