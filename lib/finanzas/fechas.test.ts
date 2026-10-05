import { describe, expect, it } from "vitest";
import { rangoFechas } from "./fechas";
describe("rangoFechas", () => {
  it("incluye el día final completo", () => {
    expect(rangoFechas(null, "2026-10-05").lte?.toISOString()).toBe(
      "2026-10-05T23:59:59.999Z"
    );
  });
  it.each(["no-fecha", "2026-02-30", "2026-13-01"])("rechaza %s", (valor) => {
    expect(() => rangoFechas(valor)).toThrow();
  });
  it("rechaza un rango invertido", () => {
    expect(() => rangoFechas("2026-10-05", "2026-10-04")).toThrow();
  });
});
