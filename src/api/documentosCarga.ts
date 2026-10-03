import { api } from "./client";

export type TipoDocumentoCarga = "CTE" | "MDFE";
export type StatusCargaViagem = "CARREGADO" | "VAZIO";

export interface DocumentoCarga {
  id: string;
  tipo: TipoDocumentoCarga;
  numero: string | null;
  chaveAcesso: string | null;
  statusCarga: StatusCargaViagem;
  motoristaId: string | null;
  observacao: string | null;
  // Quando o motorista bateu "Fim de descarregamento" e este foi o
  // CT-e desvinculado (FIFO) , null enquanto ainda está CARREGADO.
  entregueEm: string | null;
  // Endereço do destinatário extraído do XML (best-effort) e as
  // coordenadas resolvidas automaticamente por geocodificação , base
  // da cerca virtual (geofence) de 500m avaliada em "Fim de
  // descarregamento". Qualquer um pode vir null (extração/geocodificação
  // sem sucesso) sem afetar o resto do fluxo.
  enderecoDestinatario: string | null;
  destinatarioLatitude: string | null;
  destinatarioLongitude: string | null;
  createdAt: string;
  motorista?: { nome: string } | null;
}

export interface StatusAtualCarga {
  statusCarga: StatusCargaViagem | null;
  createdAt?: string;
  tipo?: TipoDocumentoCarga;
  numero?: string | null;
  // Quantos CT-e ainda estão vinculados/em aberto (CARREGADO) nesta
  // viagem do motorista , cada CT-e é praticamente uma entrega.
  cteEmAberto?: number;
}

export interface UploadDocumentoCargaInput {
  arquivo: File;
  tipo: TipoDocumentoCarga;
  statusCarga: StatusCargaViagem;
  motoristaId?: string;
  numero?: string;
  chaveAcesso?: string;
  observacao?: string;
}

// Espelha DocumentosCargaController. Upload manual do XML de CT-e/MDF-e
// , decisão do usuário: ainda não há certificado A1 próprio nem
// integração com a SEFAZ, então esta é a primeira via de ingestão.
export function uploadDocumentoCarga(input: UploadDocumentoCargaInput) {
  const form = new FormData();
  form.append("arquivo", input.arquivo);
  form.append("tipo", input.tipo);
  form.append("statusCarga", input.statusCarga);
  if (input.motoristaId) form.append("motoristaId", input.motoristaId);
  if (input.numero) form.append("numero", input.numero);
  if (input.chaveAcesso) form.append("chaveAcesso", input.chaveAcesso);
  if (input.observacao) form.append("observacao", input.observacao);

  return api
    .post<DocumentoCarga>("/documentos-carga", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
}

export interface PaginaDocumentosCarga {
  dados: DocumentoCarga[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FiltroDocumentosCarga {
  tipo?: TipoDocumentoCarga;
  statusCarga?: StatusCargaViagem;
  motoristaId?: string;
  numero?: string;
  chaveAcesso?: string;
}

// Paginação de verdade no servidor (antes a tela pedia sempre as 200
// primeiras e paginava/ordenava no cliente) , `ordem` troca entre mais
// recente/mais antigo primeiro, igual ao padrão já usado em
// AuditoriaPage.tsx. `filtro` alimenta o popup dedicado de busca da tela.
export function listarDocumentosCarga(
  page = 1,
  pageSize = 20,
  ordem: "asc" | "desc" = "desc",
  filtro?: FiltroDocumentosCarga,
) {
  return api
    .get<PaginaDocumentosCarga>("/documentos-carga", {
      params: {
        page,
        pageSize,
        ordem,
        tipo: filtro?.tipo || undefined,
        statusCarga: filtro?.statusCarga || undefined,
        motoristaId: filtro?.motoristaId || undefined,
        numero: filtro?.numero || undefined,
        chaveAcesso: filtro?.chaveAcesso || undefined,
      },
    })
    .then((r) => r.data);
}

/** Exclui definitivamente um documento de carga enviado (também remove o XML do storage externo, se houver). */
export function excluirDocumentoCarga(documentoId: string) {
  return api.delete(`/documentos-carga/${documentoId}`).then((r) => r.data);
}

export function listarDocumentosCargaPorMotorista(motoristaId: string) {
  return api
    .get<DocumentoCarga[]>(`/documentos-carga/motorista/${motoristaId}`)
    .then((r) => r.data);
}

export function statusAtualCargaPorMotorista(motoristaId: string) {
  return api
    .get<StatusAtualCarga>(
      `/documentos-carga/motorista/${motoristaId}/status-atual`,
    )
    .then((r) => r.data);
}

/** Baixa o XML original do documento e dispara o download no navegador (a rota exige o token JWT, por isso não é um link direto). */
export async function baixarXmlDocumentoCarga(
  documentoId: string,
  nomeArquivo: string,
) {
  const resposta = await api.get(`/documentos-carga/${documentoId}/xml`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "application/xml" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
