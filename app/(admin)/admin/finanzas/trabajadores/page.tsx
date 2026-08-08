import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import { serializeEmployee } from "@/lib/finanzas/serialize";
import NuevoTrabajadorForm from "./NuevoTrabajadorForm";

export default async function TrabajadoresPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);
  const status =
    searchParams.status === "DESVINCULADO" ? "DESVINCULADO" : "ACTIVO";

  const empleados = await prisma.employee.findMany({
    where: { status },
    orderBy: { fullName: "asc" },
    take: 100,
  });

  const filas = empleados.map((e) => serializeEmployee(e, session!.user));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href="/admin/finanzas/trabajadores?status=ACTIVO"
            className={`rounded-md px-2.5 py-1 text-sm ${
              status === "ACTIVO"
                ? "bg-[#F8FAFC] font-medium text-[#0F172A]"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            Activos
          </Link>
          <Link
            href="/admin/finanzas/trabajadores?status=DESVINCULADO"
            className={`rounded-md px-2.5 py-1 text-sm ${
              status === "DESVINCULADO"
                ? "bg-[#F8FAFC] font-medium text-[#0F172A]"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            Desvinculados
          </Link>
        </div>
        {puedeEscribir && <NuevoTrabajadorForm />}
      </div>

      {filas.length === 0 ? (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#475569]">
          {status === "ACTIVO"
            ? "Aún no hay trabajadores cargados."
            : "No hay trabajadores desvinculados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                <th className="px-3 py-2.5">Nombre</th>
                <th className="px-3 py-2.5">RUT</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Sueldo base</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  className="h-10 border-b border-[#E2E8F0] last:border-0"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/finanzas/trabajadores/${f.id}`}
                      className="font-medium text-[#0F172A] hover:underline"
                    >
                      {f.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-[#475569]">
                    {f.rut}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[12px] text-[#475569]">
                      {f.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-[#0F172A]">
                    {f.baseSalary.toLocaleString("es-CL")}
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
