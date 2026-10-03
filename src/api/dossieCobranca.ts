import { api } from "./client";

// Espelha DossieCobrancaController (Rodada 66) , extração do Dossiê de
// Cobrança (tempo de espera em carga/descarga acima do limiar legal de
// 5h, Lei 13.103/2015 art. 235-A §9º).
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
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `dossie-cobranca-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
