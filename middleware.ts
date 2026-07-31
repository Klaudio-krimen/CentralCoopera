import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/access";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;
    const user = {
      role: token?.role ?? "",
      moduleAccess: token?.moduleAccess ?? [],
    };

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
    // El orden importa — crm/inventario se evalúan antes que el fallback genérico /admin.
    if (pathname.startsWith("/admin/crm")) {
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
