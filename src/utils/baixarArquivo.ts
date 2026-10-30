/**
 * Rodada 557 (N202): um unico lugar para "baixar este conteudo como arquivo". Antes o mesmo bloco
 * (createObjectURL + link + click + revoke) estava repetido em ~14 funcoes.
 */
export function baixarArquivo(conteudo: Blob, nomeArquivo: string): void {
  const url = window.URL.createObjectURL(conteudo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
