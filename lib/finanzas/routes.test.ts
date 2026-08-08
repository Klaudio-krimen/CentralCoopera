import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rutasSinPortero } from "./routes";

describe("rutasSinPortero — el guardia mismo", () => {
  it("nombra sólo el route.ts que no tiene ningún portero", () => {
    const dir = mkdtempSync(join(tmpdir(), "finanzas-guardia-"));
    try {
      const dirProtegido = join(dir, "protegido");
      const dirDesprotegido = join(dir, "desprotegido");
      mkdirSync(dirProtegido);
      mkdirSync(dirDesprotegido);

      const rutaProtegida = join(dirProtegido, "route.ts");
      const rutaDesprotegida = join(dirDesprotegido, "route.ts");

      writeFileSync(
        rutaProtegida,
        `export async function GET() { hasFinanceAccess(user); }`
      );
      writeFileSync(
        rutaDesprotegida,
        `export async function GET() { return NextResponse.json({}); }`
      );

      expect(rutasSinPortero(dir)).toEqual([rutaDesprotegida]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("considera protegido un route.ts que sólo tiene canWriteFinance", () => {
    const dir = mkdtempSync(join(tmpdir(), "finanzas-guardia-"));
    try {
      writeFileSync(
        join(dir, "route.ts"),
        `export async function POST() { canWriteFinance(user); }`
      );
      expect(rutasSinPortero(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("devuelve un arreglo vacío y no lanza si el directorio no existe", () => {
    const inexistente = join(tmpdir(), "finanzas-guardia-inexistente-xyz");
    expect(() => rutasSinPortero(inexistente)).not.toThrow();
    expect(rutasSinPortero(inexistente)).toEqual([]);
  });

  it("recorre subdirectorios recursivamente", () => {
    const dir = mkdtempSync(join(tmpdir(), "finanzas-guardia-"));
    try {
      const anidado = join(dir, "empleados", "[id]");
      mkdirSync(anidado, { recursive: true });
      const ruta = join(anidado, "route.ts");
      writeFileSync(ruta, `export async function GET() {}`);

      expect(rutasSinPortero(dir)).toEqual([ruta]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("rutasSinPortero — contra el repo real", () => {
  it('rutasSinPortero("app/api/finanzas") devuelve un arreglo vacío', () => {
    expect(rutasSinPortero("app/api/finanzas")).toEqual([]);
  });
});
