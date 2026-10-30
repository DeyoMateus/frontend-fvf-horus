import { describe, expect, it } from 'vitest';
import { lerCsvContrato } from '../csvContrato';

describe('lerCsvContrato', () => {
  it('lê separador ";" com títulos acentuados e converte a data BR', () => {
    const r = lerCsvContrato('CPF;Admissão;Cargo\n529.982.247-25;05/03/2024;Motorista\n');
    expect(r.problemas).toEqual([]);
    expect(r.linhas).toEqual([{ cpf: '52998224725', dataAdmissao: '2024-03-05', cargo: 'Motorista' }]);
  });

  it('lê separador "," e campos entre aspas', () => {
    const r = lerCsvContrato('cpf,cargo,matricula\n52998224725,"Motorista, carreta",10\n');
    expect(r.linhas[0]).toMatchObject({ cargo: 'Motorista, carreta', matricula: '10' });
  });

  it('ignora BOM e linhas em branco', () => {
    const r = lerCsvContrato('﻿cpf;cargo\r\n\r\n52998224725;A\r\n');
    expect(r.linhas).toHaveLength(1);
  });

  it('aponta CPF inválido e data inválida com o número da linha', () => {
    const r = lerCsvContrato('cpf;admissao\n123;2024-01-01\n52998224725;31-02-2024\n52998224725;2024-01-01\n');
    expect(r.linhas).toHaveLength(1);
    expect(r.problemas[0]).toMatch(/^Linha 2: CPF inválido/);
    expect(r.problemas[1]).toMatch(/^Linha 3: data de admissão inválida/);
  });

  it('exige a coluna cpf e ao menos uma linha de dados', () => {
    expect(lerCsvContrato('cargo\nX').problemas[0]).toMatch(/coluna "cpf"/);
    expect(lerCsvContrato('cpf').problemas[0]).toMatch(/ao menos uma linha/);
    expect(lerCsvContrato('').linhas).toEqual([]);
  });
});
