import { describe, expect, it } from 'vitest';
import { cpfValido } from '../cpf';
import { validarSenhaNova } from '../senha';
import { primeiroESegundoNome } from '../nomeMotorista';
import { minParaHoras } from '../formatarDuracao';
import { aplicarMascaraCpf, dataCalendarioBr, dataLocalIso, somenteDigitos } from '../mascaras';

describe('cpfValido', () => {
  it('aceita CPF com dígitos verificadores corretos', () => {
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('11144477735')).toBe(true);
  });
  it('recusa dígito verificador errado, repetidos, tamanho e formato', () => {
    expect(cpfValido('52998224726')).toBe(false);
    expect(cpfValido('11111111111')).toBe(false);
    expect(cpfValido('1234567890')).toBe(false);
    expect(cpfValido('529.982.247-25')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });
});

describe('validarSenhaNova', () => {
  it('aceita senha forte', () => {
    expect(validarSenhaNova('Carreta2026Segura')).toBeNull();
  });
  it('recusa curta, sem número, sem letra, repetitiva e longa demais', () => {
    expect(validarSenhaNova('abc123')).toMatch(/10 caracteres/);
    expect(validarSenhaNova('somenteletras')).toMatch(/letra e um número/);
    expect(validarSenhaNova('1234567890')).toMatch(/letra e um número/);
    expect(validarSenhaNova('aaaaaaaaa1')).toMatch(/repetir/);
    expect(validarSenhaNova('a1'.repeat(37))).toMatch(/72/);
  });
  it('conta o limite de 72 em bytes (acentos valem 2)', () => {
    expect(validarSenhaNova('é1'.repeat(25) + 'abc')).toMatch(/72/);
  });
});

describe('primeiroESegundoNome', () => {
  it('devolve os dois primeiros nomes', () => {
    expect(primeiroESegundoNome('Karen Cristina Lima')).toBe('Karen Cristina');
  });
  it('mantém a partícula e o nome seguinte', () => {
    expect(primeiroESegundoNome('Maria da Silva Souza')).toBe('Maria da Silva');
  });
  it('trata vazio, nulo e espaços', () => {
    expect(primeiroESegundoNome(null)).toBe('');
    expect(primeiroESegundoNome(undefined)).toBe('');
    expect(primeiroESegundoNome('  João   Pedro  ')).toBe('João Pedro');
    expect(primeiroESegundoNome('Ana')).toBe('Ana');
  });
});

describe('minParaHoras', () => {
  it('abaixo de 1 h mostra só minutos com unidade', () => {
    expect(minParaHoras(55)).toBe('55 m');
    expect(minParaHoras(0)).toBe('0 m');
  });
  it('a partir de 1 h mostra HH:MM h', () => {
    expect(minParaHoras(60)).toBe('01:00 h');
    expect(minParaHoras(270)).toBe('04:30 h');
    expect(minParaHoras(1500)).toBe('25:00 h');
  });
  it('arredonda e preserva o sinal', () => {
    expect(minParaHoras(59.6)).toBe('01:00 h');
    expect(minParaHoras(-90)).toBe('-01:30 h');
  });
});

describe('máscaras', () => {
  it('CPF parcial e completo', () => {
    expect(aplicarMascaraCpf('1234')).toBe('123.4');
    expect(aplicarMascaraCpf('12345678901999')).toBe('123.456.789-01');
    expect(somenteDigitos('123.456.789-01')).toBe('12345678901');
  });
  it('data de calendário não muda de dia por causa do fuso', () => {
    expect(dataCalendarioBr('2026-10-04T00:00:00.000Z')).toBe('04/10/2026');
    expect(dataCalendarioBr('lixo')).toBe('lixo');
  });
  it('dataLocalIso usa o dia local, não o UTC', () => {
    expect(dataLocalIso(new Date(2026, 9, 4, 23, 30))).toBe('2026-10-04');
    expect(dataLocalIso(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
