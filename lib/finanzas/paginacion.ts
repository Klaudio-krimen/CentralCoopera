// Paginación en la base, siempre. pageSize por defecto 25, tope duro 100.
// Cualquier valor no numérico cae al defecto en vez de romper.

export interface ParametrosPaginacion {
  page?: string | number | null;
  pageSize?: string | number | null;
}

export interface Paginacion {
  page: number;
  pageSize: number;
  take: number;
  skip: number;
}

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

function aEnteroPositivo(
  valor: string | number | null | undefined,
  porDefecto: number
): number {
  const n =
    typeof valor === "number" ? valor : parseInt(String(valor ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return porDefecto;
  return Math.trunc(n);
}

export function resolverPaginacion(params: ParametrosPaginacion): Paginacion {
  const page = aEnteroPositivo(params.page, 1);
  const pageSize = Math.min(
    aEnteroPositivo(params.pageSize, PAGE_SIZE_DEFAULT),
    PAGE_SIZE_MAX
  );

  return {
    page,
    pageSize,
    take: pageSize,
    skip: (page - 1) * pageSize,
  };
}

export interface MetaPaginacion {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function construirMeta(
  total: number,
  page: number,
  pageSize: number
): MetaPaginacion {
  return {
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
