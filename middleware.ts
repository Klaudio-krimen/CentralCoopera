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
      // OJO: cuando no hay token en absoluto, withAuth() nunca llega a
      // ejecutar la función de arriba — resuelve por su cuenta con un
      // redirect a /api/auth/signin, incluso para rutas /api/*. Las ramas
      // "if (!token) return NextResponse.json(...)" de la función de arriba
      // sólo se alcanzan cuando SÍ hay token (p.ej. una sesión válida sin el
      // módulo requerido): en ese caso el JSON 401/403 funciona como se
      // espera. El caso "cero sesión contra una ruta de API" es preexistente
      // a Finanzas y afecta a los cuatro módulos por igual — no es un
      // regresión de este build. Verificado en vivo: GET /api/finanzas/algo
      // sin cookie de sesión responde 307 a /api/auth/signin, no 401 JSON.
      // Cambiar esto significa tocar este wrapper compartido, fuera del
      // scope fence del blueprint de Finanzas (Operaciones/CRM/Inventario
      // dependen de este mismo middleware). Documentado, no corregido.
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
