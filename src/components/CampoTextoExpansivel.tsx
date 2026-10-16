import type { ChangeEvent, TextareaHTMLAttributes } from "react";

/**
 * Rodada 270: campo de texto que cresce conforme a pessoa digita e quebra
 * linha, em vez de esconder o que passou da largura. Substitui o
 * `<input type="text">` nos campos de texto longo. Por padrão é "linha
 * única" (Enter não cria linha nova e envia o formulário, e quebras
 * coladas viram espaço), só que visualmente quebra em várias linhas. A
 * altura é ajustada pelo `ExpandirCamposDeTexto` (global).
 */
export function CampoTextoExpansivel({
  linhaUnica = true,
  onChange,
  onKeyDown,
  ...resto
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { linhaUnica?: boolean }) {
  return (
    <textarea
      rows={1}
      {...resto}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
        if (linhaUnica && /[\r\n]/.test(e.target.value)) {
          e.target.value = e.target.value.replace(/\s*[\r\n]+\s*/g, " ");
        }
        onChange?.(e);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (linhaUnica && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
      }}
    />
  );
}
