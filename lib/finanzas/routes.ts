// El guardia mecánico: convierte "acordarse de poner el portero" en un
// error de build. Recorre app/api/finanzas/ y falla nombrando cualquier
// route.ts que no llame ni a hasFinanceAccess ni a canWriteFinance.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PORTEROS = ["hasFinanceAccess", "canWriteFinance"];

function recorrerArchivosRoute(dir: string): string[] {
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const archivos: string[] = [];
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivos.push(...recorrerArchivosRoute(ruta));
    } else if (entrada.isFile() && entrada.name === "route.ts") {
      archivos.push(ruta);
    }
  }
  return archivos;
}

/** Recorre `dir` recursivamente y devuelve la ruta de cada `route.ts` que
 *  no contiene ni `hasFinanceAccess` ni `canWriteFinance`. Si `dir` no
 *  existe, devuelve `[]` sin lanzar. */
export function rutasSinPortero(dir: string): string[] {
  const archivos = recorrerArchivosRoute(dir);

  return archivos.filter((archivo) => {
    const contenido = readFileSync(archivo, "utf8");
    return !PORTEROS.some((portero) => contenido.includes(portero));
  });
}
