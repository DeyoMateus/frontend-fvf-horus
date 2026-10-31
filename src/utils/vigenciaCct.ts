/**
 * Rodada 584: aviso de vencimento da CCT/ACT. Convenção ou acordo não vale depois do fim da
 * vigência (CLT art. 614 §3º, sem ultratividade; Portaria MTP 671/2021 art. 77 §2º para o REP-A).
 */
export const DIAS_AVISO_VENCIMENTO_CCT = 60;

export interface AvisoVigenciaCct {
  nivel: "VENCIDA" | "PROXIMA";
  dias: number; // dias restantes (negativo quando vencida)
  texto: string;
}

export function avisoVigenciaCct(
  fim: string | null | undefined,
  hoje: Date = new Date(),
): AvisoVigenciaCct | null {
  if (!fim) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fim);
  if (!m) return null;
  const fimUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((fimUtc - hojeUtc) / 86_400_000);
  if (dias < 0) {
    return {
      nivel: "VENCIDA",
      dias,
      texto: `Vigência encerrada há ${-dias} dia(s). Sem novo instrumento registrado, as regras que dependem de CCT/ACT perdem o amparo.`,
    };
  }
  if (dias <= DIAS_AVISO_VENCIMENTO_CCT) {
    return {
      nivel: "PROXIMA",
      dias,
      texto: `Vigência termina em ${dias} dia(s). Providencie o novo instrumento registrado.`,
    };
  }
  return null;
}
