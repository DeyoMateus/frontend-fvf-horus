import { describe, expect, it } from 'vitest';
import { limparEvento, limparTexto, semQueryString } from '../sentryLimpeza';
import { fusoIanaDoNavegador } from '../fusoHorario';

describe('sentryLimpeza (N197)', () => {
  it('troca CPF, e-mail e token por marcadores', () => {
    expect(limparTexto('Erro para 529.982.247-25 e 52998224725')).toBe('Erro para [cpf] e [cpf]');
    expect(limparTexto('falhou com joao@empresa.com.br')).toBe('falhou com [e-mail]');
    expect(limparTexto('Bearer eyJhbGciOi.eyJzdWIiOiIx.assinatura123')).toBe('Bearer [token]');
    expect(limparTexto('segredo abcdefghijklmnopqrstuvwxyz0123456789ABCD')).toBe('segredo [token]');
  });

  it('mantém texto comum', () => {
    expect(limparTexto('Cannot read properties of undefined')).toBe('Cannot read properties of undefined');
  });

  it('semQueryString', () => {
    expect(semQueryString('https://x.com/a?cpf=1')).toBe('https://x.com/a');
    expect(semQueryString('https://x.com/a')).toBe('https://x.com/a');
  });

  it('limparEvento remove dados da requisição, extra, usuário e dados de breadcrumbs', () => {
    const e = limparEvento({
      request: { cookies: 'a', headers: { x: 1 }, data: 'd', url: 'https://x/y?cpf=52998224725', query_string: 'cpf=1' },
      user: { id: '1' },
      extra: { cpf: '1' },
      message: 'motorista 529.982.247-25',
      exception: { values: [{ value: 'falha para ze@x.com' }] },
      breadcrumbs: [{ message: 'GET ?cpf=52998224725', data: { url: '/a?cpf=1' } }],
    });
    expect(e.request).toEqual({ url: 'https://x/y' });
    expect(e.user).toBeUndefined();
    expect(e.extra).toBeUndefined();
    expect(e.message).toBe('motorista [cpf]');
    expect(e.exception?.values?.[0].value).toBe('falha para [e-mail]');
    expect(e.breadcrumbs?.[0]).toEqual({ message: 'GET ?cpf=[cpf]', data: undefined });
  });
});

describe('fusoIanaDoNavegador (N197)', () => {
  it('usa o nome real do fuso (teste roda em America/Sao_Paulo)', () => {
    expect(fusoIanaDoNavegador()).toBe('America/Sao_Paulo');
  });
});
