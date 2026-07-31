import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./db";

const SESSION_MAX_AGE = 8 * 60 * 60; // 8 horas

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.warn("[auth] login fallido: usuario no encontrado", {
            email: credentials.email,
          });
          return null;
        }
        if (!user.isActive) {
          console.warn("[auth] login fallido: cuenta inactiva", {
            email: credentials.email,
            userId: user.id,
          });
          return null;
        }

        const ok = await compare(credentials.password, user.password);
        if (!ok) {
          console.warn("[auth] login fallido: contraseña incorrecta", {
            email: credentials.email,
            userId: user.id,
          });
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          moduleAccess: user.moduleAccess,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.moduleAccess = (user as any).moduleAccess ?? [];
      }
      // Re-validar rol y módulos desde DB en cada renovación (detecta cambios)
      if (!user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isActive: true, moduleAccess: true },
        });
        if (dbUser?.isActive) {
          token.role = dbUser.role;
          token.moduleAccess = dbUser.moduleAccess;
        } else {
          // Usuario inactivo: limpiar rol para que el middleware rechace la sesión
          token.role = undefined as any;
          token.moduleAccess = [];
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.moduleAccess = token.moduleAccess ?? [];
      }
      return session;
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
  jwt: { maxAge: SESSION_MAX_AGE },
};
