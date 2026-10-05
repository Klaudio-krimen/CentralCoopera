import { encode, type JWTEncodeParams } from "next-auth/jwt";

/** Conserva el formato estándar de NextAuth para que el middleware respete exp sin modificaciones. */
export async function encodeSessionToken(params: JWTEncodeParams) {
  const deadline = params.token?.sessionExpiresAt;
  if (typeof deadline !== "number" || !Number.isFinite(deadline))
    throw new Error("Sesión sin vencimiento");
  const maxAge = Math.floor(deadline / 1000) - Math.floor(Date.now() / 1000);
  if (maxAge <= 0) throw new Error("Sesión expirada");
  return encode({
    ...params,
    maxAge: Math.min(params.maxAge ?? maxAge, maxAge),
  });
}
