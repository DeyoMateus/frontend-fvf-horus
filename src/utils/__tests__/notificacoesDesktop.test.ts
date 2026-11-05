import { describe, expect, it } from "vitest";
import { notificacoesDesktopAtivas } from "../notificacoesDesktop";

describe("notificacoesDesktopAtivas", () => {
  it("fica ligada por padrão (variável ausente ou vazia)", () => {
    expect(notificacoesDesktopAtivas(undefined)).toBe(true);
    expect(notificacoesDesktopAtivas("")).toBe(true);
    expect(notificacoesDesktopAtivas("true")).toBe(true);
  });
  it("desliga só com false", () => {
    expect(notificacoesDesktopAtivas("false")).toBe(false);
    expect(notificacoesDesktopAtivas(" FALSE ")).toBe(false);
  });
});
