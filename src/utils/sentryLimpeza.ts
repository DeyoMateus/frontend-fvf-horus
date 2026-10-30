/**
 * N197: o Sentry do painel já removia cookies, cabeçalhos e usuário, mas deixava passar
 * a mensagem da exceção, `extra` e os breadcrumbs (que podem trazer CPF, e-mail, tokens
 * e textos digitados). Aqui tudo isso é limpo antes do envio.
 */
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g;
const TOKEN_LONGO = /\b[A-Za-z0-9_-]{32,}\b/g;

export function limparTexto(texto: string): string {
  return texto
    .replace(JWT, '[token]')
    .replace(EMAIL, '[e-mail]')
    .replace(CPF, '[cpf]')
    .replace(TOKEN_LONGO, '[token]');
}

/** Tira a query string de uma URL (pode levar CPF, datas, filtros). */
export function semQueryString(url: string): string {
  const i = url.indexOf('?');
  return i < 0 ? url : url.slice(0, i);
}

interface EventoMinimo {
  request?: { cookies?: unknown; headers?: unknown; data?: unknown; url?: string; query_string?: unknown };
  user?: unknown;
  extra?: unknown;
  message?: string;
  exception?: { values?: Array<{ value?: string }> };
  breadcrumbs?: Array<{ message?: string; data?: unknown; category?: string }>;
}

export function limparEvento<T extends EventoMinimo>(evento: T): T {
  if (evento.request) {
    delete evento.request.cookies;
    delete evento.request.headers;
    delete evento.request.data;
    delete evento.request.query_string;
    if (evento.request.url) evento.request.url = semQueryString(evento.request.url);
  }
  evento.user = undefined;
  evento.extra = undefined;
  if (evento.message) evento.message = limparTexto(evento.message);
  for (const v of evento.exception?.values ?? []) {
    if (v.value) v.value = limparTexto(v.value);
  }
  for (const b of evento.breadcrumbs ?? []) {
    if (b.message) b.message = limparTexto(b.message);
    b.data = undefined;
  }
  return evento;
}
