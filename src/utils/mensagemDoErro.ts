/**
 * Mensagem de erro devolvida pelo servidor (texto ou lista de textos da validação) ou, se não
 * houver, o texto padrão. Único ponto de leitura de `response.data.message` do painel.
 */
export function mensagemDoErro(erro: unknown, padrao: string): string {
  const msg = (erro as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) {
    const texto = msg.filter((m): m is string => typeof m === "string").join(" ");
    return texto || padrao;
  }
  return typeof msg === "string" && msg ? msg : padrao;
}
