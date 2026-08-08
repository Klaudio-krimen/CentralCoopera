import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import NuevaNominaForm from "./NuevaNominaForm";

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "text-[#475569]",
  APROBADA: "text-[#1D4ED8]",
  PAGADA: "text-[#15803D]",
};

export default async function NominasPage() {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);

  const [nominas, empleados] = await Promise.all([
    prisma.payrollRun.findMany({
      orderBy: { period: "desc" },
      take: 100,
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVO" },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        baseSalary: true,
        afp: true,
        health: true,
      },
    }),
  ]);

  return (
    <div>
      {puedeEscribir && (
        <div className="mb-4">
          <NuevaNominaForm empleados={empleados} />
        </div>
      )}

      {nominas.length === 0 ? (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#475569]">
          Sin nóminas generadas.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                <th className="px-3 py-2.5">Período</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Bruto</th>
                <th className="px-3 py-2.5 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {nominas.map((n) => (
                <tr
                  key={n.id}
                  className="h-10 border-b border-[#E2E8F0] last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-[#0F172A]">
                    <a
                      href={`/admin/finanzas/nominas/${n.id}`}
                      className="hover:underline"
                    >
                      {n.period}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[12px] font-medium ${ESTADO_COLOR[n.status]}`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[#0F172A]">
                    {n.totalGross.toLocaleString("es-CL")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[#0F172A]">
                    {n.totalNet.toLocaleString("es-CL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
