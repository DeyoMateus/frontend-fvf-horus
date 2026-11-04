import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, usarInterceptor } = vi.hoisted(() => ({
  get: vi.fn(),
  usarInterceptor: vi.fn(),
}));
vi.mock("../client", () => ({
  api: {
    get: (...a: unknown[]) => get(...a),
    interceptors: { response: { use: (f: unknown) => usarInterceptor(f) } },
  },
}));

import { invalidarCacheAlertas, listAlertasByEmpresa } from "../alertas";

describe("listAlertasByEmpresa (cache curto)", () => {
  beforeEach(() => {
    get.mockReset();
    invalidarCacheAlertas();
    get.mockResolvedValue({ data: [{ id: "a1" }] });
  });

  it("duas chamadas seguidas de nao visualizados fazem 1 requisicao", async () => {
    await listAlertasByEmpresa(true);
    await listAlertasByEmpresa(true);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("a lista completa (false) nunca usa o cache", async () => {
    await listAlertasByEmpresa(false);
    await listAlertasByEmpresa(false);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("invalidar forca nova requisicao", async () => {
    await listAlertasByEmpresa(true);
    invalidarCacheAlertas();
    await listAlertasByEmpresa(true);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("escrita bem-sucedida (interceptor) invalida o cache; GET nao", async () => {
    await listAlertasByEmpresa(true);
    const interceptor = usarInterceptor.mock.calls[0][0] as (r: unknown) => unknown;
    interceptor({ config: { method: "get" } });
    await listAlertasByEmpresa(true);
    expect(get).toHaveBeenCalledTimes(1);
    interceptor({ config: { method: "patch" } });
    await listAlertasByEmpresa(true);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("falha nao fica em cache", async () => {
    get.mockRejectedValueOnce(new Error("rede"));
    await expect(listAlertasByEmpresa(true)).rejects.toThrow();
    await listAlertasByEmpresa(true);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("quem recebe a lista pode alterá-la sem afetar o cache", async () => {
    const a = await listAlertasByEmpresa(true);
    a.push({ id: "x" } as never);
    const b = await listAlertasByEmpresa(true);
    expect(b).toHaveLength(1);
  });
});
