export type ModuleKey = "OPERACIONES" | "CRM" | "INVENTARIO";

interface AuthorizedUser {
  role: string;
  moduleAccess: string[];
}

/** ADMIN siempre tiene acceso a todo. El resto depende de moduleAccess. */
export function hasModuleAccess(
  user: AuthorizedUser,
  module: ModuleKey
): boolean {
  return user.role === "ADMIN" || user.moduleAccess.includes(module);
}

export type FinanceModuleKey = "FINANZAS" | "FINANZAS_LECTURA";

/** Acceso a Finanzas. A diferencia de hasModuleAccess(), ADMIN NO tiene bypass:
 *  el acceso a datos de remuneración se concede explícitamente o no existe. */
export function hasFinanceAccess(user: AuthorizedUser): boolean {
  return (
    user.moduleAccess.includes("FINANZAS") ||
    user.moduleAccess.includes("FINANZAS_LECTURA")
  );
}

/** Escritura en Finanzas. Tampoco hay bypass de ADMIN.
 *  FINANZAS_LECTURA nunca puede mutar, ni siquiera si además es ADMIN. */
export function canWriteFinance(user: AuthorizedUser): boolean {
  return user.moduleAccess.includes("FINANZAS");
}
