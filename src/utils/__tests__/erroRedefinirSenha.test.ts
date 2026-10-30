import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { classificarErroRedefinicao } from '../erroRedefinirSenha';

function erro(status: number, data?: unknown) {
  return new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: {} as never,
  });
}

describe('classificarErroRedefinicao', () => {
  it('sem resposta (rede caída) ou erro não-axios é falha de servidor', () => {
    expect(classificarErroRedefinicao(new AxiosError('rede')).tipo).toBe('servidor');
    expect(classificarErroRedefinicao(new Error('x')).tipo).toBe('servidor');
  });
  it('429 é limite; 5xx é servidor', () => {
    expect(classificarErroRedefinicao(erro(429)).tipo).toBe('limite');
    expect(classificarErroRedefinicao(erro(503)).tipo).toBe('servidor');
  });
  it('mensagens de validação da senha viram erro de senha', () => {
    const r = classificarErroRedefinicao(erro(400, { message: ['curta', 'sem número'] }));
    expect(r).toEqual({ tipo: 'senha', mensagem: 'curta sem número' });
    expect(classificarErroRedefinicao(erro(400, { message: 'A senha é fraca' })).tipo).toBe('senha');
  });
  it('mensagem sobre token/link/expirado vira erro de link', () => {
    expect(classificarErroRedefinicao(erro(400, { message: 'Token expirado' })).tipo).toBe('link');
    expect(classificarErroRedefinicao(erro(400, {})).tipo).toBe('link');
  });
});
