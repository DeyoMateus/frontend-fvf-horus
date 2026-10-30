import { describe, expect, it } from 'vitest';
import { decodeJwt, decodeJwtSuperAdmin } from '../jwt';

function token(payload: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  const b64 = btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `cabecalho.${b64}.assinatura`;
}

describe('decodeJwt', () => {
  it('lê o payload com acentos em UTF-8', () => {
    const r = decodeJwt(token({ sub: '1', nome: 'João Conceição', papel: 'ADMIN' }));
    expect(r).toMatchObject({ nome: 'João Conceição', papel: 'ADMIN' });
  });
  it('aceita base64url com - e _', () => {
    const r = decodeJwt(token({ a: '???>>>' }));
    expect(r).toMatchObject({ a: '???>>>' });
  });
  it('devolve null para token malformado', () => {
    expect(decodeJwt('')).toBeNull();
    expect(decodeJwt('so-uma-parte')).toBeNull();
    expect(decodeJwt('a.%%%.c')).toBeNull();
    expect(decodeJwt('a.bm90LWpzb24.c')).toBeNull();
  });
  it('decodeJwtSuperAdmin usa a mesma leitura', () => {
    expect(decodeJwtSuperAdmin(token({ sub: 'sa', nome: 'Ângela' }))).toMatchObject({ nome: 'Ângela' });
    expect(decodeJwtSuperAdmin('x')).toBeNull();
  });
});
