import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import NuevoAnticipoForm from "./NuevoAnticipoForm";
import AccionesAnticipo from "./AccionesAnticipo";

const ESTADOS = ["PENDIENTE", "PAGADO", "DESCONTADO", "ANULADO"];

const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: "text-[#B45309]",
  PAGADO: "text-[#15803D]",
  DESCONTADO: "text-[#475569]",
  ANULADO: "text-[#B91C1C]",
};

export default async function AnticiposPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);
  const status = ESTADOS.includes(searchParams.status ?? "")
    ? searchParams.status
    : undefined;

  const [anticipos, empleados] = await Promise.all([
    prisma.advance.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { requestedAt: "desc" },
      take: 100,
      include: { employee: { select: { fullName: true } } },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVO" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <a
            href="/admin/finanzas/anticipos"
            className={`rounded-md px-2.5 py-1 text-sm ${
              !status
                ? "bg-[#F8FAFC] font-medium text-[#0F172A]"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            Todos
          </a>
          {ESTADOS.map((e) => (
            <a
              key={e}
              href={`/admin/finanzas/anticipos?status=${e}`}
              className={`rounded-md px-2.5 py-1 text-sm ${
                status === e
                  ? "bg-[#F8FAFC] font-medium text-[#0F172A]"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              {e}
            </a>
          ))}
        </div>
        {puedeEscribir && <NuevoAnticipoForm empleados={empleados} />}
      </div>

      {anticipos.length === 0 ? (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#475569]">
          Sin anticipos registrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                <th className="px-3 py-2.5">Trabajador</th>
                <th className="px-3 py-2.5">Solicitado</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Monto</th>
                {puedeEscribir && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {anticipos.map((a) => (
                <tr
                  key={a.id}
                  className="h-10 border-b border-[#E2E8F0] last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-[#0F172A]">
                    {a.employee.fullName}
                  </td>
                  <td className="px-3 py-2 text-[#475569]">
                    {a.requestedAt.toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[12px] font-medium ${ESTADO_COLOR[a.status]}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[#0F172A]">
                    {a.amount.toLocaleString("es-CL")}
                  </td>
                  {puedeEscribir && (
                    <td className="px-3 py-2">
                      {a.status === "PENDIENTE" && (
                        <AccionesAnticipo id={a.id} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
