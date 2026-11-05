import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intervaloVisivel } from "../intervaloVisivel";

// O vitest deste projeto roda em ambiente node (sem jsdom): simula so o que o helper usa do document.
const alvo = new EventTarget();
const fakeDocument = {
  visibilityState: "visible" as "visible" | "hidden",
  addEventListener: alvo.addEventListener.bind(alvo),
  removeEventListener: alvo.removeEventListener.bind(alvo),
};

function definirVisibilidade(v: "visible" | "hidden") {
  fakeDocument.visibilityState = v;
  alvo.dispatchEvent(new Event("visibilitychange"));
}

describe("intervaloVisivel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("document", fakeDocument);
    fakeDocument.visibilityState = "visible";
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("roda no ritmo com a aba visível", () => {
    const f = vi.fn();
    const parar = intervaloVisivel(f, 1000);
    vi.advanceTimersByTime(3000);
    expect(f).toHaveBeenCalledTimes(3);
    parar();
  });

  it("não roda com a aba oculta e roda na hora ao voltar", () => {
    const f = vi.fn();
    const parar = intervaloVisivel(f, 1000);
    definirVisibilidade("hidden");
    vi.advanceTimersByTime(5000);
    expect(f).toHaveBeenCalledTimes(0);
    definirVisibilidade("visible");
    expect(f).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(f).toHaveBeenCalledTimes(3);
    parar();
  });

  it("após limpar, não roda mais", () => {
    const f = vi.fn();
    const parar = intervaloVisivel(f, 1000);
    parar();
    vi.advanceTimersByTime(3000);
    definirVisibilidade("visible");
    expect(f).toHaveBeenCalledTimes(0);
  });

  it("com jitter, a primeira execucao so acontece depois de um atraso aleatorio dentro do limite", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const f = vi.fn();
    const parar = intervaloVisivel(f, 1000, { jitterMs: 400 });
    vi.advanceTimersByTime(199);
    expect(f).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1000 + 1); // atraso de 200 ms + 1 ciclo de 1000 ms
    expect(f).toHaveBeenCalledTimes(1);
    parar();
    vi.mocked(Math.random).mockRestore();
  });

  it("limpar durante o atraso do jitter cancela tudo", () => {
    const f = vi.fn();
    const parar = intervaloVisivel(f, 1000, { jitterMs: 400 });
    parar();
    vi.advanceTimersByTime(5000);
    expect(f).toHaveBeenCalledTimes(0);
  });
});
