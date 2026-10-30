/**
 * N197: URL do backend. O valor vem de `VITE_API_URL`. O atalho para localhost existe só no
 * `npm run dev`; num build de produção a variável é obrigatória (ver `vite.config.ts`, que
 * interrompe o build se ela faltar), para o painel publicado nunca chamar "localhost".
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");
