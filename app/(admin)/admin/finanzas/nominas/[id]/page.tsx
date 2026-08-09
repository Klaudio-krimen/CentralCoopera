import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import { enmascararRut } from "@/lib/finanzas/rut";
import AccionesNomina from "./AccionesNomina";
import PanelPago from "./PanelPago";

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR: "text-[#475569]",
  APROBADA: "text-[#1D4ED8]",
  PAGADA: "text-[#15803D]",
};

export default async function DetalleNominaPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);

  const nomina = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: { employee: { select: { fullName: true, rut: true } } },
        orderBy: { employee: { fullName: "asc" } },
      },
    },
  });
  if (!nomina) notFound();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
        <div>
          <h2 className="text-[18px] leading-[26px] font-semibold text-[#0F172A]">
            Nómina {nomina.period}
          </h2>
          <p className="mt-1 text-sm">
            Estado:{" "}
            <span className={`font-medium ${ESTADO_COLOR[nomina.status]}`}>
              {nomina.status}
            </span>
          </p>
          <p className="mt-1 text-sm text-[#475569]">
            Bruto{" "}
            <span className="font-mono tabular-nums text-[#0F172A]">
              {nomina.totalGross.toLocaleString("es-CL")}
            </span>{" "}
            · Líquido{" "}
            <span className="font-mono tabular-nums text-[#0F172A]">
              {nomina.totalNet.toLocaleString("es-CL")}
            </span>
          </p>
        </div>

        {puedeEscribir && (
          <div className="flex flex-col items-end gap-2">
            <AccionesNomina
              id={nomina.id}
              status={nomina.status}
              period={nomina.period}
              totalNet={nomina.totalNet}
            />
            <PanelPago id={nomina.id} status={nomina.status} />
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
              <th className="px-3 py-2.5">Trabajador</th>
              <th className="px-3 py-2.5">RUT</th>
              <th className="px-3 py-2.5 text-right">Bruto</th>
              <th className="px-3 py-2.5 text-right">AFP</th>
              <th className="px-3 py-2.5 text-right">Salud</th>
              <th className="px-3 py-2.5 text-right">Otras</th>
              <th className="px-3 py-2.5 text-right">Anticipos</th>
              <th className="px-3 py-2.5 text-right">Líquido</th>
            </tr>
          </thead>
          <tbody>
            {nomina.items.map((item) => (
              <tr
                key={item.id}
                className="h-10 border-b border-[#E2E8F0] last:border-0"
              >
                <td className="px-3 py-2 font-medium text-[#0F172A]">
                  {item.employee.fullName}
                </td>
                <td className="px-3 py-2 text-[#475569]">
                  {puedeEscribir
                    ? item.employee.rut
                    : enmascararRut(item.employee.rut)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[#0F172A]">
                  {item.grossAmount.toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[#475569]">
                  {item.afpAmount.toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[#475569]">
                  {item.healthAmount.toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[#475569]">
                  {item.otherDeductions.toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[#475569]">
                  {item.advancesApplied.toLocaleString("es-CL")}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-medium text-[#0F172A]">
                  {item.netAmount.toLocaleString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
