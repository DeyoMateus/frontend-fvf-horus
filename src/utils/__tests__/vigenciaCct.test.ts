import { describe, expect, it } from "vitest";
import { avisoVigenciaCct } from "../vigenciaCct";

const hoje = new Date(2026, 9, 30); // 30/10/2026

describe("avisoVigenciaCct", () => {
  it("sem data não avisa", () => {
    expect(avisoVigenciaCct(null, hoje)).toBeNull();
    expect(avisoVigenciaCct("", hoje)).toBeNull();
  });
  it("longe do fim não avisa", () => {
    expect(avisoVigenciaCct("2027-06-30", hoje)).toBeNull();
  });
  it("faltando até 60 dias avisa", () => {
    const a = avisoVigenciaCct("2026-12-15", hoje);
    expect(a?.nivel).toBe("PROXIMA");
    expect(a?.dias).toBe(46);
  });
  it("no último dia ainda vale (0 dia)", () => {
    expect(avisoVigenciaCct("2026-10-30", hoje)?.nivel).toBe("PROXIMA");
  });
  it("depois do fim está vencida", () => {
    const a = avisoVigenciaCct("2026-10-01T00:00:00.000Z", hoje);
    expect(a?.nivel).toBe("VENCIDA");
    expect(a?.dias).toBe(-29);
  });
});
