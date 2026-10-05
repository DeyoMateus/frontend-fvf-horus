import { api } from "./client";
import type { TipoEvento, TratamentoPonto } from "./types";

// Espelha TratamentosPontoController: rotas /motoristas/:id/tratamentos-ponto.
export function listTratamentos(motoristaId: string) {
  return api
    .get<TratamentoPonto[]>(`/motoristas/${motoristaId}/tratamentos-ponto`)
    .then((r) => r.data);
}

export interface CreateTratamentoInput {
  tipoEvento: TipoEvento;
  timestampEvento: string;
  motivo: string;
  registroReferenciaId?: string;
  /** Fuso do motorista no instante do ajuste (min a leste do UTC). */
  fusoOffsetMin?: number;
}

export function createTratamento(
  motoristaId: string,
  input: CreateTratamentoInput,
) {
  return api
    .post<TratamentoPonto>(
      `/motoristas/${motoristaId}/tratamentos-ponto`,
      input,
    )
    .then((r) => r.data);
}

// Anexa uma evidência (print de rastreador, print de WhatsApp etc.) a um
// tratamento já lançado , a lei exige prova junto de todo fechamento de
// ponto feito pelo gestor (ver Rodada 26).
export function anexarEvidenciaTratamento(
  motoristaId: string,
  tratamentoId: string,
  arquivo: File,
) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return api
    .post(
      `/motoristas/${motoristaId}/tratamentos-ponto/${tratamentoId}/evidencias`,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    )
    .then((r) => r.data);
}

/** Baixa uma evidência anexada e dispara o download no navegador. */
export async function baixarEvidenciaTratamento(
  motoristaId: string,
  evidenciaId: string,
  nomeArquivo: string,
) {
  const resposta = await api.get(
    `/motoristas/${motoristaId}/tratamentos-ponto/evidencias/${evidenciaId}`,
    {
      responseType: "blob",
    },
  );
  const url = window.URL.createObjectURL(new Blob([resposta.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Busca o conteúdo de uma evidência já autenticado (via interceptor do
 * `api`) e devolve uma object URL própria pra exibir inline , miniatura
 * de imagem ou visualização no lightbox. Quem chama é responsável por
 * revogar a URL (`window.URL.revokeObjectURL`) quando não precisar mais
 * dela, pra não acumular memória.
 */
export async function obterUrlEvidenciaTratamento(
  motoristaId: string,
  evidenciaId: string,
) {
  const resposta = await api.get(
    `/motoristas/${motoristaId}/tratamentos-ponto/evidencias/${evidenciaId}`,
    {
      responseType: "blob",
    },
  );
  return window.URL.createObjectURL(new Blob([resposta.data]));
}
