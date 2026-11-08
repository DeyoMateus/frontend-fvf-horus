import { describe, expect, it } from 'vitest';
import { rotuloAcaoAuditoria, rotuloPermissaoAusente } from '../rotuloAcaoAuditoria';

describe('rotuloAcaoAuditoria', () => {
  it('dá nome legível à permissão ausente no ponto', () => {
    expect(rotuloAcaoAuditoria('PERMISSAO_AUSENTE_NO_PONTO')).toBe(
      'Ponto batido com permissão do aparelho faltando',
    );
  });

  it('dá nome legível ao aviso confirmado no ponto', () => {
    expect(rotuloAcaoAuditoria('AVISO_CONFIRMADO_NO_PONTO')).toContain('foi avisada e continuou');
  });

  it('ação sem rótulo continua com o nome técnico', () => {
    expect(rotuloAcaoAuditoria('OUTRA_ACAO')).toBe('OUTRA_ACAO');
  });
});

describe('rotuloPermissaoAusente', () => {
  it('traduz as três permissões conhecidas', () => {
    expect(rotuloPermissaoAusente('LOCALIZACAO')).toBe('Localização negada');
    expect(rotuloPermissaoAusente('LOCALIZACAO_SEMPRE')).toBe('Localização sem permissão "o tempo todo"');
    expect(rotuloPermissaoAusente('NOTIFICACOES')).toBe('Notificações desligadas');
  });

  it('traduz os avisos confirmados', () => {
    expect(rotuloPermissaoAusente('RELOGIO_DIVERGENTE')).toBe('Horário do aparelho diferente do oficial');
    expect(rotuloPermissaoAusente('POSICAO_POSSIVELMENTE_FALSA')).toBe('Localização possivelmente alterada');
  });

  it('valor desconhecido volta como veio', () => {
    expect(rotuloPermissaoAusente('OUTRA')).toBe('OUTRA');
  });
});
