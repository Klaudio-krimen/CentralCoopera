import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  rutasSinPortero,
  metodosSinPortero,
  inclusionesCrudas,
} from "./routes";

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
  it("no permite inclusiones completas de proveedores ni empleados", () => {
    expect(inclusionesCrudas("app/api/finanzas")).toEqual([]);
  });
  it('rutasSinPortero("app/api/finanzas") devuelve un arreglo vacío', () => {
    expect(rutasSinPortero("app/api/finanzas")).toEqual([]);
  });
});

it("rechaza DELETE sin portero aunque GET esté protegido", () => {
  const dir = mkdtempSync(join(tmpdir(), "finanzas-metodos-"));
  try {
    const archivo = join(dir, "route.ts");
    writeFileSync(
      archivo,
      `export async function GET() { if (!hasFinanceAccess(user)) return error(); }
      export async function DELETE() { /* canWriteFinance(user) */ return ok(); }`
    );
    expect(metodosSinPortero(dir)).toEqual([{ archivo, metodo: "DELETE" }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("detecta inclusiones crudas sin confundir comentarios ni proyecciones", () => {
  const dir = mkdtempSync(join(tmpdir(), "finanzas-inclusiones-"));
  try {
    writeFileSync(
      join(dir, "route.ts"),
      `const q = { include: { supplier: true } };`
    );
    expect(inclusionesCrudas(dir)).toHaveLength(1);
    writeFileSync(
      join(dir, "route.ts"),
      `// supplier: true\nconst q = { include: { supplier: { select: { id: true } } } };`
    );
    expect(inclusionesCrudas(dir)).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("verifica handlers const y no acepta reexports o funciones anidadas sin ejecutar", () => {
  const dir = mkdtempSync(join(tmpdir(), "finanzas-arrow-"));
  try {
    const archivo = join(dir, "route.ts");
    writeFileSync(
      archivo,
      `export const GET = async () => { hasFinanceAccess(user); };
      export const POST = async () => { const falso = () => canWriteFinance(user); return ok(); };
      export { eliminar as DELETE } from './otro';`
    );
    expect(metodosSinPortero(dir)).toEqual([
      { archivo, metodo: "POST" },
      { archivo, metodo: "DELETE" },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
