import { api } from "./client";
import { baixarArquivo } from "../utils/baixarArquivo";

// Espelha DossieCobrancaController (Rodada 66) , extração do Dossiê de
// Cobrança (tempo de espera em carga/descarga acima do limiar de 5h,
// Lei 11.442/2007 art. 11 §5º, cobrança contra o contratante).
export interface ItemDossieCobranca {
  alertaId: string;
  motoristaId: string;
  motoristaNome: string;
  motoristaCpf: string;
  periodoInicio: string;
  periodoFim: string;
  minutosTotais: number;
  intervalos: { inicio: string; fim: string }[];
  registroGeradorId: string;
  observacao: string;
  criadoEm: string;
  documentos?: { tipo: string; numero: string | null; chaveAcesso: string | null }[];
}

export function listarDossieCobranca(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  return api
    .get<
      ItemDossieCobranca[]
    >("/dossie-cobranca", { params: { inicio, fim, motoristaId: motoristaId || undefined } })
    .then((r) => r.data);
}

export async function baixarDossieCobrancaPdf(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  const resposta = await api.get("/dossie-cobranca/pdf", {
    params: { inicio, fim, motoristaId: motoristaId || undefined },
    responseType: "blob",
  });
  baixarArquivo(new Blob([resposta.data], { type: "application/pdf" }), `dossie-cobranca-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`);
}
