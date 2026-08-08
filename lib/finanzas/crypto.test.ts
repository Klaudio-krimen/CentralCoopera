import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { cifrar, descifrar, ultimos4 } from "./crypto";

const claveOriginalActual = process.env.FINANZAS_ENCRYPTION_KEY;
const claveOriginalPrevia = process.env.FINANZAS_ENCRYPTION_KEY_PREVIOUS;

function generarClave(): string {
  return randomBytes(32).toString("base64");
}

beforeEach(() => {
  process.env.FINANZAS_ENCRYPTION_KEY = generarClave();
  delete process.env.FINANZAS_ENCRYPTION_KEY_PREVIOUS;
});

afterEach(() => {
  if (claveOriginalActual === undefined) {
    delete process.env.FINANZAS_ENCRYPTION_KEY;
  } else {
    process.env.FINANZAS_ENCRYPTION_KEY = claveOriginalActual;
  }
  if (claveOriginalPrevia === undefined) {
    delete process.env.FINANZAS_ENCRYPTION_KEY_PREVIOUS;
  } else {
    process.env.FINANZAS_ENCRYPTION_KEY_PREVIOUS = claveOriginalPrevia;
  }
});

describe("cifrar / descifrar", () => {
  it("cifra y descifra de vuelta al texto original", () => {
    const original = "000123456789";
    const cifrado = cifrar(original);
    expect(descifrar(cifrado)).toBe(original);
  });

  it("cifrar el mismo texto dos veces produce cadenas distintas (IV aleatorio)", () => {
    const original = "000123456789";
    expect(cifrar(original)).not.toBe(cifrar(original));
  });

  it("el valor cifrado empieza con v1: y tiene cuatro segmentos", () => {
    const cifrado = cifrar("000123456789");
    expect(cifrado.startsWith("v1:")).toBe(true);
    expect(cifrado.split(":")).toHaveLength(4);
  });

  it("descifra con la clave anterior tras rotar, usando FINANZAS_ENCRYPTION_KEY_PREVIOUS", () => {
    const claveVieja = process.env.FINANZAS_ENCRYPTION_KEY as string;
    const cifradoConVieja = cifrar("000123456789");

    process.env.FINANZAS_ENCRYPTION_KEY = generarClave();
    process.env.FINANZAS_ENCRYPTION_KEY_PREVIOUS = claveVieja;

    expect(descifrar(cifradoConVieja)).toBe("000123456789");
  });

  it("lanza y no devuelve texto parcial si se altera un carácter del ciphertext", () => {
    const cifrado = cifrar("000123456789");
    const partes = cifrado.split(":");
    const ultimoChar = partes[3].at(-1);
    const charAlterado = ultimoChar === "A" ? "B" : "A";
    partes[3] = partes[3].slice(0, -1) + charAlterado;
    const cifradoAlterado = partes.join(":");

    expect(() => descifrar(cifradoAlterado)).toThrow(
      "No se pudo descifrar el valor"
    );
  });

  it("rechaza un valor que no empieza con v1:", () => {
    expect(() => descifrar("v2:a:b:c")).toThrow();
  });

  it("importar el módulo sin FINANZAS_ENCRYPTION_KEY no lanza; sólo cifrar() lanza", () => {
    delete process.env.FINANZAS_ENCRYPTION_KEY;
    expect(() => cifrar("dato")).toThrow(
      "Falta la variable de entorno FINANZAS_ENCRYPTION_KEY"
    );
  });
});

describe("ultimos4", () => {
  it("devuelve los últimos 4 caracteres", () => {
    expect(ultimos4("000123456789")).toBe("6789");
  });
});
