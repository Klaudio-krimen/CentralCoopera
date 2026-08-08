// Cifrado de cuentas bancarias. Sólo node:crypto, sin dependencias nuevas.
// Formato del valor cifrado: v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
// Las variables de entorno se leen dentro de cada función, nunca al importar
// este módulo — así importar crypto.ts sin FINANZAS_ENCRYPTION_KEY funciona,
// y sólo cifrar()/descifrar() lanzan si falta.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const IV_BYTES = 12;
const PREFIJO = "v1";

function claveDesdeVariable(nombreVariable: string): Buffer {
  const valor = process.env[nombreVariable];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombreVariable}`);
  }
  return Buffer.from(valor, "base64");
}

export function cifrar(textoPlano: string): string {
  const clave = claveDesdeVariable("FINANZAS_ENCRYPTION_KEY");
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITMO, clave, iv);
  const ciphertext = Buffer.concat([
    cipher.update(textoPlano, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    PREFIJO,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

function intentarDescifrar(valor: string, claveBase64: string): string {
  const [, ivB64, authTagB64, ciphertextB64] = valor.split(":");
  const clave = Buffer.from(claveBase64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITMO, clave, iv);
  decipher.setAuthTag(authTag);
  const textoPlano = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return textoPlano.toString("utf8");
}

export function descifrar(valor: string): string {
  const partes = valor.split(":");
  if (partes[0] !== PREFIJO || partes.length !== 4) {
    throw new Error("Formato de valor cifrado no reconocido");
  }

  const claveActual = claveDesdeVariable("FINANZAS_ENCRYPTION_KEY");
  try {
    return intentarDescifrar(valor, claveActual.toString("base64"));
  } catch {
    const claveAnterior = process.env.FINANZAS_ENCRYPTION_KEY_PREVIOUS;
    if (claveAnterior) {
      try {
        return intentarDescifrar(valor, claveAnterior);
      } catch {
        // cae al throw de abajo
      }
    }
    throw new Error("No se pudo descifrar el valor");
  }
}

/** Últimos 4 caracteres de una cuenta, para bankAccountLast4 — la UI puede
 *  confirmar sin descifrar. */
export function ultimos4(cuenta: string): string {
  return cuenta.slice(-4);
}
