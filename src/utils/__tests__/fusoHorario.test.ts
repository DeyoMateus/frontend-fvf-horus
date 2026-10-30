import { describe, expect, it } from 'vitest';
import {
  fimDoDiaLocalIso,
  formatarNoOffset,
  formatarRegistro,
  inicioDoDiaLocalIso,
  instanteDaParede,
  offsetDoMotoristaNoInstante,
  paraInputNoOffset,
  renderizarHorarios,
  resolverFusoDoAjuste,
  rotuloUtc,
  seloFusoMapa,
} from '../fusoHorario';

describe('fusoHorario (TZ do teste = America/Sao_Paulo)', () => {
  it('rotuloUtc', () => {
    expect(rotuloUtc(-240)).toBe('UTC-4');
    expect(rotuloUtc(-180)).toBe('UTC-3');
    expect(rotuloUtc(0)).toBe('UTC+0');
  });

  it('formatarNoOffset mostra a parede do fuso informado', () => {
    expect(formatarNoOffset('2026-10-05T12:00:00.000Z', -240)).toBe('05/10/2026 08:00:00');
    expect(formatarNoOffset('2026-10-05T02:30:00.000Z', -180)).toBe('04/10/2026 23:30:00');
  });

  it('formatarRegistro só põe selo quando o fuso difere do navegador', () => {
    expect(formatarRegistro('2026-10-05T12:00:00.000Z', -180)).toBe('05/10/2026 09:00:00');
    expect(formatarRegistro('2026-10-05T12:00:00.000Z', -240)).toBe('05/10/2026 08:00:00 (UTC-4)');
  });

  it('seloFusoMapa', () => {
    expect(seloFusoMapa('2026-10-05T12:00:00.000Z', null)).toBe('');
    expect(seloFusoMapa('2026-10-05T12:00:00.000Z', -180)).toBe('');
    expect(seloFusoMapa('2026-10-05T12:00:00.000Z', -240)).toContain('UTC-4');
  });

  it('instanteDaParede e paraInputNoOffset são inversos', () => {
    const ms = instanteDaParede('2026-10-05T08:00', -240);
    expect(new Date(ms).toISOString()).toBe('2026-10-05T12:00:00.000Z');
    expect(paraInputNoOffset(new Date(ms).toISOString(), -240)).toBe('2026-10-05T08:00');
    expect(instanteDaParede('lixo', -240)).toBeNaN();
  });

  it('renderizarHorarios troca o marcador pela hora local e preserva o resto', () => {
    const r = renderizarHorarios('Ponto às [[t:2026-10-05T12:00:00.000Z]] ok');
    expect(r).toMatch(/^Ponto às 05\/10\/2026,? 09:00 ok$/);
    expect(renderizarHorarios('sem marcador')).toBe('sem marcador');
  });

  it('offsetDoMotoristaNoInstante usa o último ponto antes (ou o primeiro depois)', () => {
    const regs = [
      { timestampEvento: '2026-10-05T10:00:00.000Z', fusoOffsetMin: -240 },
      { timestampEvento: '2026-10-05T20:00:00.000Z', fusoOffsetMin: -180 },
      { timestampEvento: '2026-10-05T21:00:00.000Z', fusoOffsetMin: null },
    ];
    const t = (s: string) => new Date(s).getTime();
    expect(offsetDoMotoristaNoInstante(regs, t('2026-10-05T15:00:00.000Z'))).toBe(-240);
    expect(offsetDoMotoristaNoInstante(regs, t('2026-10-05T22:00:00.000Z'))).toBe(-180);
    expect(offsetDoMotoristaNoInstante(regs, t('2026-10-05T01:00:00.000Z'))).toBe(-240);
    expect(offsetDoMotoristaNoInstante([], 0)).toBeNull();
    expect(offsetDoMotoristaNoInstante([{ timestampEvento: '2026-10-05T10:00:00.000Z' }], 0)).toBeNull();
  });

  it('resolverFusoDoAjuste cai no fuso do navegador sem pontos com fuso', () => {
    const r = resolverFusoDoAjuste('2026-10-05T08:00', []);
    expect(r.offsetMin).toBe(-180);
    expect(r.doMotorista).toBe(false);
    expect(new Date(r.instanteMs).toISOString()).toBe('2026-10-05T11:00:00.000Z');
  });

  it('resolverFusoDoAjuste usa o fuso do motorista naquele momento', () => {
    const regs = [{ timestampEvento: '2026-10-05T08:00:00.000Z', fusoOffsetMin: -240 }];
    const r = resolverFusoDoAjuste('2026-10-05T08:00', regs);
    expect(r.offsetMin).toBe(-240);
    expect(r.doMotorista).toBe(true);
    expect(new Date(r.instanteMs).toISOString()).toBe('2026-10-05T12:00:00.000Z');
  });

  it('início e fim do dia são do computador de quem filtra, não UTC', () => {
    expect(inicioDoDiaLocalIso('2026-10-05')).toBe('2026-10-05T03:00:00.000Z');
    expect(fimDoDiaLocalIso('2026-10-05')).toBe('2026-10-06T02:59:59.999Z');
    expect(inicioDoDiaLocalIso('2026-10-05T10:00:00Z')).toBe('2026-10-05T03:00:00.000Z');
  });
});
