/**
 * Rodada 146 , o horário do registro é o do FUSO DO MOTORISTA no toque
 * (fusoOffsetMin, minutos a leste do UTC). Mostramos a hora real dele e, se
 * o fuso difere do da transportadora, um selo "UTC-4" para não gerar confusão.
 */
export function rotuloUtc(offsetMin: number): string {
  const h = offsetMin / 60;
  return `UTC${h >= 0 ? "+" : "-"}${Math.abs(h)}`;
}

/** "dd/mm/aaaa hh:mm:ss" na parede-relógio do offset informado. */
export function formatarNoOffset(iso: string, offsetMin: number): string {
  const d = new Date(new Date(iso).getTime() + offsetMin * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

/** Deslocamento (min a leste do UTC) do computador de quem está vendo, no instante dado. */
export function offsetDoNavegador(instante: Date = new Date()): number {
  return -instante.getTimezoneOffset();
}

/** Fuso IANA (dentre os do cadastro) equivalente ao deste computador. */
export function fusoIanaDoNavegador(): string {
  const off = offsetDoNavegador();
  if (off === -120) return "America/Noronha";
  if (off === -240) return "America/Cuiaba";
  if (off === -300) return "America/Rio_Branco";
  return "America/Sao_Paulo";
}

/**
 * Hora do registro no fuso do MOTORISTA; com selo "(UTC-4)" quando difere do
 * fuso de quem está vendo (o computador do gestor, que é onde a transportadora
 * está). Sem fusoOffsetMin (APK antigo) cai para o relógio do navegador.
 */
export function formatarRegistro(
  iso: string,
  fusoOffsetMin?: number | null,
): string {
  if (fusoOffsetMin == null) return new Date(iso).toLocaleString("pt-BR");
  const texto = formatarNoOffset(iso, fusoOffsetMin);
  return fusoOffsetMin !== offsetDoNavegador(new Date(iso))
    ? `${texto} (${rotuloUtc(fusoOffsetMin)})`
    : texto;
}

/** Rótulo do fuso do motorista para mapa/localização; vazio quando igual ao de quem vê. */
export function seloFusoMapa(iso: string, fusoOffsetMin?: number | null): string {
  if (fusoOffsetMin == null) return "";
  return fusoOffsetMin !== offsetDoNavegador(new Date(iso))
    ? ` · horário local do motorista ${rotuloUtc(fusoOffsetMin)}`
    : "";
}

/**
 * Mensagens trazem a hora como marcador `[[t:ISO]]` (o servidor não sabe em
 * que fuso quem lê está). Aqui vira a hora do computador de quem vê.
 */
export function renderizarHorarios(texto: string): string {
  return texto.replace(
    /\[\[t:(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]\]/g,
    (_m, iso: string) => {
      const d = new Date(iso);
      return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    },
  );
}

/**
 * Fuso em que o motorista estava num instante: o do último ponto dele antes
 * do instante (senão o primeiro depois). `null` se nenhum ponto tem fuso.
 */
export function offsetDoMotoristaNoInstante(
  registros: { timestampEvento: string; fusoOffsetMin?: number | null }[],
  instanteMs: number,
): number | null {
  const comFuso = registros
    .filter((r) => r.fusoOffsetMin != null)
    .map((r) => ({ t: new Date(r.timestampEvento).getTime(), off: r.fusoOffsetMin as number }))
    .sort((a, b) => a.t - b.t);
  if (comFuso.length === 0) return null;
  let atual = comFuso[0].off;
  for (const p of comFuso) {
    if (p.t <= instanteMs) atual = p.off;
    else break;
  }
  return atual;
}

/** "2026-10-05T08:00" (parede do fuso informado) -> instante real em ms. */
export function instanteDaParede(valor: string, offsetMin: number): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor);
  if (!m) return NaN;
  return (
    Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - offsetMin * 60000
  );
}

/** Instante -> "AAAA-MM-DDTHH:mm" na parede do fuso informado (para datetime-local). */
export function paraInputNoOffset(iso: string, offsetMin: number): string {
  const d = new Date(new Date(iso).getTime() + offsetMin * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Resolve o fuso do campo "Horário considerado": o gestor digita a hora que
 * valia ONDE o motorista estava naquele momento (ex.: Mato Grosso), mesmo que
 * o motorista já esteja em outro fuso hoje e o gestor em outro ainda.
 */
export function resolverFusoDoAjuste(
  valor: string,
  registros: { timestampEvento: string; fusoOffsetMin?: number | null }[],
): { offsetMin: number; instanteMs: number; doMotorista: boolean } {
  const navegador = offsetDoNavegador();
  let off = navegador;
  let doMotorista = false;
  for (let i = 0; i < 3; i++) {
    const ms = instanteDaParede(valor, off);
    if (Number.isNaN(ms)) break;
    const achado = offsetDoMotoristaNoInstante(registros, ms);
    if (achado == null) break;
    doMotorista = true;
    if (achado === off) break;
    off = achado;
  }
  return { offsetMin: off, instanteMs: instanteDaParede(valor, off), doMotorista };
}
