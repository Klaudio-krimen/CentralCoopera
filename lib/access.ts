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
