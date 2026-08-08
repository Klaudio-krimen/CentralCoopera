import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import { serializeEmployee } from "@/lib/finanzas/serialize";
import EditarTrabajadorForm from "./EditarTrabajadorForm";

export default async function FichaTrabajadorPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);

  const empleado = await prisma.employee.findUnique({
    where: { id: params.id },
  });
  if (!empleado) notFound();

  const datos = serializeEmployee(empleado, session!.user);

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-[18px] leading-[26px] font-semibold text-[#0F172A]">
        {datos.fullName}
      </h2>

      {puedeEscribir ? (
        <EditarTrabajadorForm empleado={datos} />
      ) : (
        <dl className="divide-y divide-[#E2E8F0] rounded-lg border border-[#E2E8F0] bg-white">
          {(
            [
              ["RUT", datos.rut],
              ["Estado", datos.status],
              ["Correo", datos.email ?? "—"],
              ["Teléfono", datos.phone ?? "—"],
              ["AFP", datos.afp ?? "—"],
              ["Salud", datos.health ?? "—"],
              ["Sueldo base", datos.baseSalary.toLocaleString("es-CL")],
              ["Cuenta (últimos 4)", datos.bankAccountLast4 ?? "—"],
            ] as Array<[string, string]>
          ).map(([label, valor]) => (
            <div
              key={label}
              className="flex justify-between px-4 py-2.5 text-sm"
            >
              <dt className="text-[#475569]">{label}</dt>
              <dd className="font-medium text-[#0F172A]">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
