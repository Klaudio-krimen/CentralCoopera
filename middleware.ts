import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasModuleAccess, hasFinanceAccess } from "@/lib/access";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const user = {
      role: token?.role ?? "",
      moduleAccess: token?.moduleAccess ?? [],
    };

    // Finanzas va antes del retorno genérico de /api/ (línea de abajo), que
    // hace NextResponse.next() y dejaría esta rama sin evaluar si fuera después.
    // El orden importa.
    if (pathname.startsWith("/api/finanzas")) {
      if (!token) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      if (!hasFinanceAccess(user)) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Rutas API sin token → 401 JSON (no redirect)
    if (pathname.startsWith("/api/")) {
      if (!token) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      return NextResponse.next();
    }

    if (
      pathname.startsWith("/chofer") &&
      token?.role !== "CHOFER" &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      pathname.startsWith("/recepcion") &&
      token?.role !== "RECEPCION" &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Módulos del panel admin: se gatean por moduleAccess (ADMIN siempre pasa).
    // El orden importa — crm/inventario/finanzas se evalúan antes que el
    // fallback genérico /admin. Finanzas usa hasFinanceAccess(), sin bypass
    // de ADMIN: a diferencia de los otros tres módulos, un ADMIN sin grant
    // explícito no entra.
    if (pathname.startsWith("/admin/finanzas")) {
      if (!hasFinanceAccess(user)) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } else if (pathname.startsWith("/admin/crm")) {
      if (!hasModuleAccess(user, "CRM")) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } else if (pathname.startsWith("/admin/inventario")) {
      if (!hasModuleAccess(user, "INVENTARIO")) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } else if (
      pathname.startsWith("/admin") &&
      !hasModuleAccess(user, "OPERACIONES")
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/chofer/:path*",
    "/recepcion/:path*",
    "/admin/:path*",
    "/api/((?!auth|posiciones|webhooks).*)",
  ],
};
