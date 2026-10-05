import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./db";
import {
  calcularVencimiento,
  sesionVencida,
  SESSION_LONG_MS,
  SESSION_SHORT_MS,
} from "./auth-session";
import { encodeSessionToken } from "./auth-jwt";
import { checkRateLimit, reiniciarRateLimit } from "./finanzas/rate-limit";

const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

const SESSION_MAX_AGE = SESSION_LONG_MS / 1000;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Mantener sesión", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const claveLimite = `login:${credentials.email}`;
        const limite = await checkRateLimit(
          prisma,
          claveLimite,
          LOGIN_RATE_LIMIT,
          LOGIN_RATE_WINDOW_MS
        );
        if (!limite.ok) {
          console.warn("[auth] login blocked by rate limit");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn("[auth] credentials rejected");
          return null;
        }
        if (!user.isActive) {
          console.warn("[auth] credentials rejected");
          return null;
        }

        const ok = await compare(credentials.password, user.password);
        if (!ok) {
          console.warn("[auth] credentials rejected");
          return null;
        }

        await reiniciarRateLimit(prisma, claveLimite);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          moduleAccess: user.moduleAccess,
          remember: credentials.remember === "1",
          passwordChangedAt: user.passwordChangedAt?.getTime() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      const ahora = Date.now();
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.moduleAccess = user.moduleAccess;
        token.authenticatedAt = ahora;
        token.passwordVersion = user.passwordChangedAt ?? null;
        token.sessionExpiresAt = calcularVencimiento({
          ahora,
          recordar: user.remember === true,
          moduleAccess: user.moduleAccess,
          role: user.role,
        });
      }
      const dbUser = token.id
        ? await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              role: true,
              isActive: true,
              moduleAccess: true,
              passwordChangedAt: true,
            },
          })
        : null;
      if (
        !dbUser?.isActive ||
        (user &&
          (dbUser.passwordChangedAt?.getTime() ?? null) !==
            (user.passwordChangedAt ?? null))
      ) {
        throw new Error("Sesión revocada");
      }
      // Migración de JWT anteriores: conserva su exp existente, nunca amplía su duración.
      token.authenticatedAt ??=
        typeof token.iat === "number" ? token.iat * 1000 : 0;
      token.sessionExpiresAt ??= Math.min(
        typeof token.exp === "number" ? token.exp * 1000 : 0,
        token.authenticatedAt + SESSION_SHORT_MS
      );
      if (
        dbUser.role === "FINANZAS" ||
        dbUser.moduleAccess.some(
          (m) => m === "FINANZAS" || m === "FINANZAS_LECTURA"
        )
      ) {
        token.sessionExpiresAt = Math.min(
          token.sessionExpiresAt,
          token.authenticatedAt + SESSION_SHORT_MS
        );
      }
      if (
        sesionVencida({
          ahora,
          sessionExpiresAt: token.sessionExpiresAt,
          passwordChangedAt: dbUser.passwordChangedAt,
          passwordVersion: token.passwordVersion,
          iat: typeof token.iat === "number" ? token.iat : undefined,
          authenticatedAt: token.authenticatedAt,
        })
      )
        throw new Error("Sesión expirada o revocada");
      if (token.passwordVersion === undefined)
        token.passwordVersion = dbUser.passwordChangedAt?.getTime() ?? null;
      token.role = dbUser.role;
      token.moduleAccess = dbUser.moduleAccess;
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.moduleAccess = token.moduleAccess ?? [];
        session.expires = new Date(token.sessionExpiresAt!).toISOString();
      }
      return session;
    },
  },
  events: {
    // Cerrar sesión cierra el turno abierto. Sin esto, el chofer desaparece de
    // su propia app pero sigue pintado en el mapa de Operaciones hasta que el
    // cierre por inactividad lo alcance, 15 min después.
    signOut: async ({ token }) => {
      const userId = token?.id;
      if (!userId) return;
      try {
        await prisma.shift.updateMany({
          where: { userId, endedAt: null },
          data: { endedAt: new Date(), endedReason: "LOGOUT" },
        });
      } catch {
        // Un fallo acá no puede impedir el logout. El cierre por inactividad
        // recoge el turno de todas formas.
        console.error("[auth] failed to close shift after logout");
      }
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE, encode: encodeSessionToken },
  logger: {
    error(code) {
      console.error("[auth] session processing failed", { code });
    },
  },
};
