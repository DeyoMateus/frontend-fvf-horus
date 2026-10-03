import { api } from "./client";

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
  const url = window.URL.createObjectURL(
    new Blob([resposta.data], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `fiscalizacao-espelhos-rep-p-${inicio.slice(0, 10)}-a-${fim.slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
