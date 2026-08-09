import Link from "next/link";
import { prisma } from "@/lib/db";
import { resolverPaginacion, construirMeta } from "@/lib/finanzas/paginacion";

interface SearchParams {
  entityType?: string;
  actorId?: string;
  desde?: string;
  hasta?: string;
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

// Visor de sólo lectura: FINANZAS y FINANZAS_LECTURA ven exactamente lo
// mismo aquí. Que Elizabeth pueda leer este visor es la mitad del modelo de
// amenaza del módulo — la defensa no es impedir, es que quede a la vista.
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page, pageSize, take, skip } = resolverPaginacion({
    page: searchParams.page,
  });

  const where: Record<string, unknown> = {};
  if (searchParams.entityType) where.entityType = searchParams.entityType;
  if (searchParams.actorId) where.actorId = searchParams.actorId;
  if (searchParams.desde || searchParams.hasta) {
    where.createdAt = {
      ...(searchParams.desde ? { gte: new Date(searchParams.desde) } : {}),
      ...(searchParams.hasta ? { lte: new Date(searchParams.hasta) } : {}),
    };
  }

  const [filas, total, tiposEntidad, actores] = await Promise.all([
    prisma.financeAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.financeAuditLog.count({ where }),
    prisma.financeAuditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
    prisma.financeAuditLog.findMany({
      distinct: ["actorId"],
      select: { actorId: true, actorEmail: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const meta = construirMeta(total, page, pageSize);

  return (
    <div>
      <form
        className="mb-4 flex flex-wrap items-end gap-2"
        method="get"
        aria-label="Filtros del log de auditoría"
      >
        <div>
          <label
            htmlFor="aud-entityType"
            className="mb-1 block text-[12px] font-medium text-[#475569]"
          >
            Entidad
          </label>
          <select
            id="aud-entityType"
            name="entityType"
            defaultValue={searchParams.entityType ?? ""}
            className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
          >
            <option value="">Todas</option>
            {tiposEntidad.map((t) => (
              <option key={t.entityType} value={t.entityType}>
                {t.entityType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="aud-actorId"
            className="mb-1 block text-[12px] font-medium text-[#475569]"
          >
            Actor
          </label>
          <select
            id="aud-actorId"
            name="actorId"
            defaultValue={searchParams.actorId ?? ""}
            className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
          >
            <option value="">Todos</option>
            {actores
              .filter((a) => a.actorId)
              .map((a) => (
                <option key={a.actorId} value={a.actorId!}>
                  {a.actorEmail}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="aud-desde"
            className="mb-1 block text-[12px] font-medium text-[#475569]"
          >
            Desde
          </label>
          <input
            id="aud-desde"
            type="date"
            name="desde"
            defaultValue={searchParams.desde ?? ""}
            className="rounded-md border border-[#E2E8F0] px-2 py-1.5 text-sm text-[#0F172A]"
          />
        </div>
        <div>
          <label
            htmlFor="aud-hasta"
            className="mb-1 block text-[12px] font-medium text-[#475569]"
          >
            Hasta
          </label>
          <input
            id="aud-hasta"
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

      {filas.length === 0 ? (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#475569]">
          Sin registros de auditoría para este filtro.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Actor</th>
                  <th className="px-3 py-2.5">Acción</th>
                  <th className="px-3 py-2.5">Entidad</th>
                  <th className="px-3 py-2.5">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-[#E2E8F0] align-top last:border-0"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-[#475569]">
                      {f.createdAt.toLocaleString("es-CL")}
                    </td>
                    <td className="px-3 py-2 text-[#0F172A]">
                      {f.actorEmail}
                      <span className="ml-1 text-[12px] text-[#475569]">
                        ({f.actorRole})
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[12px] font-medium text-[#0F172A]">
                        {f.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#475569]">
                      {f.entityType}
                      {f.entityId && (
                        <span className="block text-[11px] text-[#94A3B8]">
                          {f.entityId}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-[#1D4ED8] hover:underline">
                          Ver cambios
                        </summary>
                        <div className="mt-2 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                              Antes
                            </p>
                            <pre className="overflow-x-auto rounded-md bg-[#F8FAFC] p-2 text-[11px] break-all whitespace-pre-wrap text-[#0F172A]">
                              {f.before
                                ? JSON.stringify(f.before, null, 2)
                                : "—"}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                              Después
                            </p>
                            <pre className="overflow-x-auto rounded-md bg-[#F8FAFC] p-2 text-[11px] break-all whitespace-pre-wrap text-[#0F172A]">
                              {f.after ? JSON.stringify(f.after, null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-[#475569]">
            <span>
              Página {meta.page} de {Math.max(1, meta.totalPages)} ·{" "}
              {meta.total} registros
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
