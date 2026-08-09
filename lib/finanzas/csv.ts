// Escape y armado de CSV (ver blueprint §5, paso 19). Este CSV lo abre
// Marcela en Excel, no un parser — por eso además de las comillas hay que
// neutralizar la inyección de fórmulas.

const CARACTERES_FORMULA = ["=", "+", "-", "@"];

/** Envuelve en comillas dobles y duplica las comillas internas cuando el
 *  valor contiene `,`, `"`, `\n` o `\r`. Antepone una comilla simple a
 *  cualquier campo que empiece con `=`, `+`, `-` o `@` — la mitigación
 *  estándar de inyección de fórmulas en Excel. */
export function escaparCampoCsv(valor: string): string {
  let campo = valor;

  if (CARACTERES_FORMULA.includes(campo[0] ?? "")) {
    campo = `'${campo}`;
  }

  if (/[",\n\r]/.test(campo)) {
    campo = `"${campo.replace(/"/g, '""')}"`;
  }

  return campo;
}

/** Arma el documento completo: encabezados + filas, separador `,`, salto `\r\n`. */
export function filasACsv(encabezados: string[], filas: string[][]): string {
  return [encabezados, ...filas]
    .map((fila) => fila.map(escaparCampoCsv).join(","))
    .join("\r\n");
}
