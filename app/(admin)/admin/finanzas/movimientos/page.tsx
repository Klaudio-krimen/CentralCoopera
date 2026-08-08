import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";
import NuevoMovimientoForm from "./NuevoMovimientoForm";
import AnularMovimientoButton from "./AnularMovimientoButton";
import CategoriasPanel from "./CategoriasPanel";

interface SearchParams {
  kind?: string;
  desde?: string;
  hasta?: string;
  categoryId?: string;
  page?: string;
}

function construirQuery(
  params: SearchParams,
  overrides: Record<string, string>
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...overrides })) {
    if (v) q.set(k, v);
  }
  return `?${q.toString()}`;
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);

  const { page, pageSize, take, skip } = resolverPaginacion({
    page: searchParams.page,
  });

  const where: Record<string, unknown> = {};
  if (searchParams.kind === "INGRESO" || searchParams.kind === "EGRESO") {
    where.kind = searchParams.kind;
  }
  if (searchParams.categoryId) where.categoryId = searchParams.categoryId;
  if (searchParams.desde || searchParams.hasta) {
    where.date = {
      ...(searchParams.desde ? { gte: new Date(searchParams.desde) } : {}),
      ...(searchParams.hasta ? { lte: new Date(searchParams.hasta) } : {}),
    };
  }

  const [transacciones, total, categorias, proveedores] = await Promise.all([
    prisma.financeTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      include: { category: true, supplier: true },
    }),
    prisma.financeTransaction.count({ where }),
    prisma.financeCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const meta = construirMeta(total, page, pageSize);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#475569]">
              Tipo
            </label>
            <select
              name="kind"
              defaultValue={searchParams.kind ?? ""}
              className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
            >
              <option value="">Todos</option>
              <option value="INGRESO">Ingreso</option>
              <option value="EGRESO">Egreso</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#475569]">
              Categoría
            </label>
            <select
              name="categoryId"
              defaultValue={searchParams.categoryId ?? ""}
              className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#475569]">
              Desde
            </label>
            <input
              type="date"
              name="desde"
              defaultValue={searchParams.desde ?? ""}
              className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#475569]">
              Hasta
            </label>
            <input
              type="date"
              name="hasta"
              defaultValue={searchParams.hasta ?? ""}
              className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-[#E2E8F0] px-3 py-1.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Filtrar
          </button>
        </form>

        {puedeEscribir && (
          <div className="flex items-center gap-2">
            <CategoriasPanel categorias={categorias} />
            <NuevoMovimientoForm
              categorias={categorias}
              proveedores={proveedores}
            />
          </div>
        )}
      </div>

      {transacciones.length === 0 ? (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#475569]">
          No hay movimientos en este período.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Descripción</th>
                  <th className="px-3 py-2.5">Categoría</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Monto</th>
                  {puedeEscribir && <th className="px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {transacciones.map((t) => {
                  const esIngreso = t.kind === "INGRESO";
                  return (
                    <tr
                      key={t.id}
                      className="h-10 border-b border-[#E2E8F0] last:border-0"
                    >
                      <td className="px-3 py-2 text-[#475569]">
                        {t.date.toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-3 py-2 text-[#0F172A]">
                        {t.description}
                      </td>
                      <td className="px-3 py-2 text-[#475569]">
                        {t.category?.name ?? "Sin categoría"}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[12px] text-[#475569]">
                          {t.status}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums ${
                          esIngreso ? "text-[#15803D]" : "text-[#B91C1C]"
                        }`}
                      >
                        {esIngreso ? "+" : "−"}
                        {t.amount.toLocaleString("es-CL")}
                      </td>
                      {puedeEscribir && (
                        <td className="px-3 py-2 text-right">
                          {t.status !== "ANULADO" && (
                            <AnularMovimientoButton
                              id={t.id}
                              descripcion={t.description}
                              monto={t.amount}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-[#475569]">
            <span>
              Página {meta.page} de {Math.max(1, meta.totalPages)} ·{" "}
              {meta.total} movimientos
            </span>
            <div className="flex gap-2">
              {meta.page > 1 && (
                <Link
                  href={construirQuery(searchParams, {
                    page: String(meta.page - 1),
                  })}
                  className="rounded-md border border-[#E2E8F0] px-2.5 py-1 hover:bg-[#F8FAFC]"
                >
                  Anterior
                </Link>
              )}
              {meta.page < meta.totalPages && (
                <Link
                  href={construirQuery(searchParams, {
                    page: String(meta.page + 1),
                  })}
                  className="rounded-md border border-[#E2E8F0] px-2.5 py-1 hover:bg-[#F8FAFC]"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
