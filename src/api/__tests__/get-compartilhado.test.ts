import { describe, expect, it, vi } from "vitest";
import { api } from "../client";

// Rodada 637: GETs identicos simultaneos compartilham uma chamada; nada e guardado depois.
describe("GET compartilhado enquanto a chamada esta em andamento", () => {
  function fingirServidor() {
    let chamadas = 0;
    let liberar: (() => void) | null = null;
    const adapter = vi.fn(
      (config: { url?: string }) =>
        new Promise((resolve) => {
          chamadas += 1;
          const responder = () =>
            resolve({ data: { itens: [1, 2, 3], url: config.url }, status: 200, statusText: "OK", headers: {}, config });
          liberar = responder;
          setTimeout(responder, 5);
        }),
    );
    api.defaults.adapter = adapter as never;
    return { chamadas: () => chamadas, adapter, liberar: () => liberar?.() };
  }

  it("duas chamadas iguais ao mesmo tempo viram uma so, e cada uma recebe a sua copia", async () => {
    const s = fingirServidor();
    const [a, b] = await Promise.all([
      api.get("/alertas-jornada/empresa/minha", { params: { naoVisualizados: "true" } }),
      api.get("/alertas-jornada/empresa/minha", { params: { naoVisualizados: "true" } }),
    ]);
    expect(s.chamadas()).toBe(1);
    expect(a.data).toEqual(b.data);
    expect(a.data).not.toBe(b.data);
    (a.data as { itens: number[] }).itens.push(99);
    expect((b.data as { itens: number[] }).itens).toEqual([1, 2, 3]);
  });

  it("parametros diferentes nao se misturam", async () => {
    const s = fingirServidor();
    await Promise.all([
      api.get("/alertas-jornada/empresa/minha", { params: { naoVisualizados: "true" } }),
      api.get("/alertas-jornada/empresa/minha"),
    ]);
    expect(s.chamadas()).toBe(2);
  });

  it("depois da resposta nao ha cache: a chamada seguinte vai ao servidor de novo", async () => {
    const s = fingirServidor();
    await api.get("/resumo");
    await api.get("/resumo");
    expect(s.chamadas()).toBe(2);
  });

  it("chamada com cancelamento (signal) segue sozinha", async () => {
    const s = fingirServidor();
    const c1 = new AbortController();
    await Promise.all([api.get("/x", { signal: c1.signal }), api.get("/x", { signal: new AbortController().signal })]);
    expect(s.chamadas()).toBe(2);
  });
});
