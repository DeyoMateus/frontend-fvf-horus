/** Rodada 506 (N164): mesma regra do backend (`SenhaForte`). Devolve a mensagem de erro ou null. */
export const DICA_SENHA = "Mínimo de 10 caracteres, com pelo menos uma letra e um número.";

export function validarSenhaNova(senha: string): string | null {
  if (senha.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (new TextEncoder().encode(senha).length > 72) return "A senha pode ter no máximo 72 caracteres.";
  if (!/\p{L}/u.test(senha) || !/\d/.test(senha)) return "A senha precisa ter pelo menos uma letra e um número.";
  if (new Set(senha).size < 4) return "A senha não pode repetir poucos caracteres.";
  return null;
}
