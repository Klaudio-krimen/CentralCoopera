import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasFinanceAccess } from "@/lib/access";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  switch (session.user.role) {
    case "CHOFER":
      redirect("/chofer/dashboard");
    case "RECEPCION":
      redirect("/recepcion/dashboard");
    case "ADMIN":
      redirect("/admin/dashboard");
    case "VENTAS":
      redirect("/admin/crm/dashboard");
    case "BODEGA":
      redirect("/admin/inventario/stock");
    case "FINANZAS":
      if (hasFinanceAccess(session.user)) redirect("/admin/finanzas");
      redirect("/login");
    default:
      redirect("/login");
  }
}
