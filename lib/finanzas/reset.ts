// Recuperación de contraseña por enlace. Puro y testeable — sin acceso a
// base de datos: recibe la fila ya leída y decide.

import { randomBytes, createHash } from "node:crypto";

export interface FilaTokenReset {
  usedAt: Date | null;
  expiresAt: Date;
}

/** 32 bytes aleatorios en hex. El token en claro sólo viaja en el correo;
 *  en la base se guarda únicamente su hashToken(). */
export function generarToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** false si ya se usó o si expiró. Un solo uso, sin excepciones. */
export function esTokenUtilizable(
  fila: FilaTokenReset,
  ahora: Date = new Date()
): boolean {
  if (fila.usedAt !== null) return false;
  if (fila.expiresAt <= ahora) return false;
  return true;
}

export function armarEnlace(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/recuperar/confirmar?token=${token}`;
}
