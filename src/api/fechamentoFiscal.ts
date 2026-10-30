import { api } from "./client";
import { baixarArquivo } from "../utils/baixarArquivo";

// Espelha FechamentoFiscalController (Rodada 66) , extração em lote
// dos Espelhos de Ponto Eletrônico (REP-P, assinados digitalmente com
// o certificado de cada motorista) para uma fiscalização.
export async function baixarEspelhosRepPFiscalizacaoPdf(
  inicio: string,
  fim: string,
  motoristaIds: string[] | null,
) {
  const resposta = await api.get("/fechamento-fiscal/espelhos-rep-p/pdf", {
    params: {
      inicio,
      fim,
      ...(motoristaIds && motoristaIds.length > 0
        ? { motoristaIds: motoristaIds.join(",") }
        : {}),
    },
    responseType: "blob",
  });
  baixarArquivo(new Blob([resposta.data], { type: "application/pdf" }), `fiscalizacao-espelhos-rep-p-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`);
}
