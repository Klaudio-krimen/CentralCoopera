// Guardia estático por método HTTP; el AST excluye comentarios e imports.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const PORTEROS = new Set(["hasFinanceAccess", "canWriteFinance"]);
const METODOS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

function recorrerArchivosRoute(dir: string): string[] {
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entradas.flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    return entrada.isDirectory()
      ? recorrerArchivosRoute(ruta)
      : entrada.isFile() && entrada.name === "route.ts"
        ? [ruta]
        : [];
  });
}

function fuente(archivo: string) {
  return ts.createSourceFile(
    archivo,
    readFileSync(archivo, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
}

function contienePortero(nodo: ts.Node): boolean {
  if (
    ts.isCallExpression(nodo) &&
    ts.isIdentifier(nodo.expression) &&
    PORTEROS.has(nodo.expression.text)
  )
    return true;
  if (
    ts.isFunctionDeclaration(nodo) ||
    ts.isArrowFunction(nodo) ||
    ts.isFunctionExpression(nodo)
  )
    return false;
  return nodo.getChildren().some(contienePortero);
}

export function metodosSinPortero(
  dir: string
): { archivo: string; metodo: string }[] {
  return recorrerArchivosRoute(dir).flatMap((archivo) => {
    const pendientes: { archivo: string; metodo: string }[] = [];
    for (const nodo of fuente(archivo).statements) {
      if (
        ts.isFunctionDeclaration(nodo) &&
        nodo.name &&
        METODOS.has(nodo.name.text) &&
        nodo.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        if (!nodo.body || !contienePortero(nodo.body))
          pendientes.push({ archivo, metodo: nodo.name.text });
      }
      if (
        ts.isVariableStatement(nodo) &&
        nodo.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        for (const declaracion of nodo.declarationList.declarations) {
          if (
            !ts.isIdentifier(declaracion.name) ||
            !METODOS.has(declaracion.name.text)
          )
            continue;
          const handler = declaracion.initializer;
          if (
            !handler ||
            !(
              ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)
            ) ||
            !contienePortero(handler.body)
          ) {
            pendientes.push({ archivo, metodo: declaracion.name.text });
          }
        }
      }
      // Reexports no permiten comprobar el portero dentro del handler: fallar explícitamente.
      if (
        ts.isExportDeclaration(nodo) &&
        nodo.exportClause &&
        ts.isNamedExports(nodo.exportClause)
      ) {
        for (const elemento of nodo.exportClause.elements) {
          if (METODOS.has(elemento.name.text))
            pendientes.push({ archivo, metodo: elemento.name.text });
        }
      }
    }
    return pendientes;
  });
}

export function rutasSinPortero(dir: string): string[] {
  return Array.from(new Set(metodosSinPortero(dir).map((m) => m.archivo)));
}

export function inclusionesCrudas(dir: string): string[] {
  return recorrerArchivosRoute(dir).filter((archivo) => {
    function contiene(nodo: ts.Node): boolean {
      if (
        ts.isPropertyAssignment(nodo) &&
        (ts.isIdentifier(nodo.name) || ts.isStringLiteral(nodo.name)) &&
        ["supplier", "employee"].includes(nodo.name.text) &&
        nodo.initializer.kind === ts.SyntaxKind.TrueKeyword
      )
        return true;
      return nodo.getChildren().some(contiene);
    }
    return contiene(fuente(archivo));
  });
}
