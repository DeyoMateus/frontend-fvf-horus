/**
 * Rodada 584: rodapé fixo das telas. Redação provisória, a revisar pela assessoria
 * jurídica (não afirma conformidade total com a Portaria MTP 671/2021).
 * VITE_AMBIENTE_PILOTO=true liga a marca de piloto.
 */
export const RODAPE_FVF_TEXTO =
  "O FVF Hórus é uma plataforma de registro e apuração eletrônica de ponto e atua como meio tecnológico de controle de jornada. " +
  "A parametrização das regras de apuração (adicionais, intervalos, tolerâncias e vigência de CCT/ACT) é de responsabilidade do empregador. " +
  "Os dados refletem os registros feitos pelos colaboradores e os parâmetros configurados pela empresa.";

export const AVISO_PILOTO_TEXTO =
  "Dados de Homologação / Ambiente de Piloto - Sem Validade Fiscal Definitiva";

export function ambientePiloto(valor: string | undefined = import.meta.env.VITE_AMBIENTE_PILOTO): boolean {
  const v = (valor ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "sim";
}

export default function RodapeLegal() {
  return (
    <footer style={{ marginTop: 32, paddingTop: 12, borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280" }}>
      {ambientePiloto() && (
        <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#b45309" }}>{AVISO_PILOTO_TEXTO}</p>
      )}
      <p style={{ margin: 0 }}>{RODAPE_FVF_TEXTO}</p>
    </footer>
  );
}
