import { describe, expect, it } from "vitest";
import { notificacoesDesktopAtivas } from "../notificacoesDesktop";

describe("notificacoesDesktopAtivas", () => {
  it("fica desligada por padrão", () => {
    expect(notificacoesDesktopAtivas(undefined)).toBe(false);
    expect(notificacoesDesktopAtivas("")).toBe(false);
    expect(notificacoesDesktopAtivas("false")).toBe(false);
  });
  it("liga só com true", () => {
    expect(notificacoesDesktopAtivas("true")).toBe(true);
    expect(notificacoesDesktopAtivas(" TRUE ")).toBe(true);
  });
});
