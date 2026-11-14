/**
 * Rodada 527 (N137): marca, no formulario da regra sindical, os campos que sao aceitos e
 * guardados mas AINDA NAO alteram a apuracao atual. A lista espelha PENDENTES_DE_LIGACAO de
 * backend/src/regras-sindicais/campos-regra-sindical.spec.ts: quando um campo passar a valer,
 * sai dos dois lugares.
 */
export const CAMPOS_PARAMETRO_INATIVO: Record<string, string> = {
  percentualHoraEspera: "Informativo: benefício da convenção, não entra no cálculo.",
  percentualHoraEsperaRefeicao: "Informativo: benefício da convenção, não entra no cálculo.",
  cctVigenciaInicio: "Respaldo da convenção: guardado, não altera a apuração atual.",
  cctVigenciaFim: "Respaldo da convenção: guardado, não altera a apuração atual.",
  cctDocumentoRef: "Respaldo da convenção: guardado, não altera a apuração atual.",
  declaracaoRespaldoCct: "Respaldo da convenção: guardado, não altera a apuração atual.",
  bancoHorasAtivo: "Substituído pelo regime do banco de horas da empresa (aba Apuração e banco de horas).",
  bancoHorasTipo: "Ainda não altera a apuração atual.",
  bancoHorasFator: "Ainda não altera a apuração atual.",
  interjornadaNoBancoPermitida: "Guardado e auditado: a interjornada suprimida segue paga fora do banco de horas.",
  feriadoTratamento: "Ainda não altera a apuração atual.",
  feriadoFonte: "Ainda não altera a apuração atual.",
  marcoAdi5322Data: "Guardado: a espera integra a jornada em todos os dias, então a data não muda o cálculo (o sistema só tem registros posteriores a 2023).",
  marcoAdi5322Referencia: "Guardado: a referência da decisão não altera a apuração atual.",
};

export function ParametroInativo({ campo }: { campo: string }) {
  const motivo = CAMPOS_PARAMETRO_INATIVO[campo];
  if (!motivo) return null;
  return (
    <span
      title={motivo}
      style={{
        marginLeft: 8,
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: "#e5e7eb",
        color: "#374151",
        whiteSpace: "nowrap",
      }}
    >
      parâmetro inativo
    </span>
  );
}
