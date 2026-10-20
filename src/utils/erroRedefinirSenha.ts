import { isAxiosError } from "axios";

export type TipoErroRedefinicao = "link" | "senha" | "limite" | "servidor";

/**
 * Rodada 293: a tela de redefinir senha dizia "Link inválido ou expirado" para
 * QUALQUER erro, inclusive falha do servidor. Aqui cada caso tem sua mensagem.
 */
export function classificarErroRedefinicao(erro: unknown): {
  tipo: TipoErroRedefinicao;
  mensagem: string;
} {
  if (!isAxiosError(erro) || !erro.response) {
    return {
      tipo: "servidor",
      mensagem:
        "Não foi possível falar com o servidor. Verifique sua internet e tente novamente.",
    };
  }
  const { status, data } = erro.response;
  if (status === 429) {
    return {
      tipo: "limite",
      mensagem: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
    };
  }
  if (status >= 500) {
    return {
      tipo: "servidor",
      mensagem:
        "Erro no servidor ao salvar a nova senha. Tente novamente em instantes; se continuar, avise o suporte.",
    };
  }
  const msg = (data as { message?: unknown } | undefined)?.message;
  if (Array.isArray(msg) && msg.length > 0) {
    return { tipo: "senha", mensagem: msg.map(String).join(" ") };
  }
  if (typeof msg === "string" && !/token|link|expirad|inv[aá]lid/i.test(msg)) {
    return { tipo: "senha", mensagem: msg };
  }
  return {
    tipo: "link",
    mensagem:
      "Este link é inválido, já foi usado ou expirou. Peça um novo link de recuperação.",
  };
}
