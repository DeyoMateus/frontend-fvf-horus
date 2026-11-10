/**
 * Rodada 691: cidade, UF e fuso da empresa, definidos pelo super admin no cadastro e editáveis
 * nas empresas já cadastradas. Cidade e UF são informativos; os feriados seguem o cadastro manual.
 */
export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const FUSOS_EMPRESA_OPCOES = [
  { valor: "America/Sao_Paulo", rotulo: "Brasília (UTC-3)" },
  { valor: "America/Cuiaba", rotulo: "Mato Grosso / MS / AM / RO / RR (UTC-4)" },
  { valor: "America/Rio_Branco", rotulo: "Acre (UTC-5)" },
  { valor: "America/Noronha", rotulo: "Fernando de Noronha (UTC-2)" },
] as const;

export function CamposCidadeUf({
  cidade,
  uf,
  onChange,
  obrigatorio,
}: {
  cidade: string;
  uf: string;
  onChange: (v: { cidade: string; uf: string }) => void;
  obrigatorio?: boolean;
}) {
  return (
    <>
      <div>
        <label>Cidade da empresa</label>
        <input
          maxLength={100}
          value={cidade}
          onChange={(e) => onChange({ cidade: e.target.value, uf })}
          required={obrigatorio}
        />
      </div>
      <div>
        <label>UF</label>
        <select
          value={uf}
          onChange={(e) => onChange({ cidade, uf: e.target.value })}
          required={obrigatorio}
        >
          <option value="">Selecione...</option>
          {UFS_BRASIL.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
