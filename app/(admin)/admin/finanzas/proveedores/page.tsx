import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWriteFinance } from "@/lib/access";
import { serializeSupplier } from "@/lib/finanzas/serialize";
import NuevoProveedorForm from "./NuevoProveedorForm";
import DesactivarProveedorButton from "./DesactivarProveedorButton";

export default async function ProveedoresPage() {
  const session = await getServerSession(authOptions);
  const puedeEscribir = canWriteFinance(session!.user);

  const proveedores = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  const filas = proveedores.map((p) => serializeSupplier(p, session!.user));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] leading-[26px] font-semibold text-[#0F172A]">
          Proveedores
        </h2>
        {puedeEscribir && <NuevoProveedorForm />}
      </div>

      {filas.length === 0 ? (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#475569]">
          Aún no hay proveedores cargados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[12px] font-semibold tracking-[0.04em] text-[#475569] uppercase">
                <th className="px-3 py-2.5">Nombre</th>
                <th className="px-3 py-2.5">RUT</th>
                <th className="px-3 py-2.5">Contacto</th>
                <th className="px-3 py-2.5">Cuenta</th>
                {puedeEscribir && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  className="h-10 border-b border-[#E2E8F0] last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-[#0F172A]">
                    {f.name}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#475569]">
                    {f.rut ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[#475569]">
                    {f.email ?? f.phone ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#475569]">
                    {f.bankAccountLast4 ? `···· ${f.bankAccountLast4}` : "—"}
                  </td>
                  {puedeEscribir && (
                    <td className="px-3 py-2 text-right">
                      <DesactivarProveedorButton id={f.id} name={f.name} />
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
