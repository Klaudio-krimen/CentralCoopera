import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasModuleAccess } from "@/lib/access";
import AdminSidebar from "@/components/ui/AdminSidebar";

// Roles que comparten el shell del panel admin (sidebar + module switcher).
// Qué módulos ve cada uno dentro del shell lo decide moduleAccess (ver lib/access.ts);
// esto solo filtra quién entra al shell en general.
const ADMIN_SHELL_ROLES = ["ADMIN", "VENTAS", "BODEGA", "FINANZAS"];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!ADMIN_SHELL_ROLES.includes(session.user.role)) redirect("/login");

  const discrepanciasCount = hasModuleAccess(session.user, "OPERACIONES")
    ? await prisma.discrepancy.count({ where: { status: "PENDIENTE" } })
    : 0;

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex">
      <AdminSidebar
        userName={session.user.name ?? ""}
        email={session.user.email ?? ""}
        role={session.user.role}
        moduleAccess={session.user.moduleAccess}
        discrepanciasCount={discrepanciasCount}
      />
      <main className="flex-1 min-w-0 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
