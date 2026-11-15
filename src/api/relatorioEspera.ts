import { api } from "./client";
import { baixarArquivo } from "../utils/baixarArquivo";

// Espelha RelatorioEsperaController (Rodada 66; renomeado na rodada 732): relatorio de
// espera em carga/descarga acima do tempo configurado pela empresa.
export interface ItemRelatorioEspera {
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

export function listarRelatorioEspera(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  return api
    .get<
      ItemRelatorioEspera[]
    >("/relatorio-espera", { params: { inicio, fim, motoristaId: motoristaId || undefined } })
    .then((r) => r.data);
}

export async function baixarRelatorioEsperaPdf(
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  const resposta = await api.get("/relatorio-espera/pdf", {
    params: { inicio, fim, motoristaId: motoristaId || undefined },
    responseType: "blob",
  });
  baixarArquivo(new Blob([resposta.data], { type: "application/pdf" }), `relatorio-espera-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`);
}
