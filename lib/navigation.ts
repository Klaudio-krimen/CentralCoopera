/** Una sección incluye su ficha; el resumen financiero sólo corresponde a su raíz. */
export function isActiveNavHref(pathname: string, href: string): boolean {
  if (href === "/admin/finanzas") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
