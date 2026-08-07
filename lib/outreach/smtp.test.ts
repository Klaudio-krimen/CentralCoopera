import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertAttachmentWithinLimit, buildMailOptions } from "./smtp";

const ORIGINAL_ENV = { ...process.env };

describe("buildMailOptions", () => {
  beforeEach(() => {
    process.env.SMTP_USER = "operaciones@cooperapro.cl";
    process.env.SMTP_FROM_NAME = "Coopera Pro";
    delete process.env.SMTP_REPLY_TO;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("envía autenticado desde SMTP_USER (operaciones@)", () => {
    const opts = buildMailOptions({
      to: "prospecto@empresa.cl",
      subject: "Asunto",
      html: "<p>hola</p>",
      text: "hola",
    });
    expect(opts.from).toBe('"Coopera Pro" <operaciones@cooperapro.cl>');
  });

  it("sin SMTP_REPLY_TO configurado, no agrega el header replyTo", () => {
    const opts = buildMailOptions({
      to: "prospecto@empresa.cl",
      subject: "Asunto",
      html: "<p>hola</p>",
      text: "hola",
    });
    expect(opts.replyTo).toBeUndefined();
  });

  // Estrategia de dos buzones: se envía desde operaciones@ pero las
  // respuestas del prospecto deben ir a contacto@ — así un antispam que
  // marque la casilla de envío no arrastra a la casilla pública.
  it("con SMTP_REPLY_TO configurado, las respuestas van a contacto@", () => {
    process.env.SMTP_REPLY_TO = "contacto@cooperapro.cl";
    const opts = buildMailOptions({
      to: "prospecto@empresa.cl",
      subject: "Asunto",
      html: "<p>hola</p>",
      text: "hola",
    });
    expect(opts.from).toBe('"Coopera Pro" <operaciones@cooperapro.cl>');
    expect(opts.replyTo).toBe("contacto@cooperapro.cl");
  });

  it("incluye el adjunto en base64 cuando se provee", () => {
    const opts = buildMailOptions({
      to: "prospecto@empresa.cl",
      subject: "Asunto",
      html: "<p>hola</p>",
      text: "hola",
      attachment: {
        filename: "brochure.pdf",
        contentType: "application/pdf",
        contentBase64: "Zm9v",
      },
    });
    expect(opts.attachments).toEqual([
      {
        filename: "brochure.pdf",
        content: "Zm9v",
        encoding: "base64",
        contentType: "application/pdf",
      },
    ]);
  });
});

describe("assertAttachmentWithinLimit", () => {
  it("no lanza si no hay adjunto", () => {
    expect(() => assertAttachmentWithinLimit(undefined)).not.toThrow();
  });

  it("acepta un adjunto justo bajo el límite de 3MB", () => {
    const underLimit = Buffer.alloc(2.5 * 1024 * 1024).toString("base64");
    expect(() =>
      assertAttachmentWithinLimit({
        filename: "ok.pdf",
        contentType: "application/pdf",
        contentBase64: underLimit,
      })
    ).not.toThrow();
  });

  it("rechaza un adjunto que supera el límite de 3MB de §8", () => {
    const oversized = Buffer.alloc(4 * 1024 * 1024).toString("base64");
    expect(() =>
      assertAttachmentWithinLimit({
        filename: "grande.pdf",
        contentType: "application/pdf",
        contentBase64: oversized,
      })
    ).toThrow(/3MB/);
  });
});
