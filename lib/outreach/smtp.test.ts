import { describe, expect, it } from "vitest";
import { buildSmtpTransportOptions, parseSmtpPort } from "./smtp";

describe("configuracion segura de transporte SMTP", () => {
  it("usa TLS implicito en el puerto 465", () => {
    expect(
      buildSmtpTransportOptions({
        host: "smtp.example.test",
        port: 465,
        user: "sender@example.test",
        pass: "test-password",
      })
    ).toEqual({
      host: "smtp.example.test",
      port: 465,
      secure: true,
      auth: { user: "sender@example.test", pass: "test-password" },
      tls: { rejectUnauthorized: true },
    });
  });

  it.each([25, 587])("exige STARTTLS en el puerto %i", (port) => {
    expect(
      buildSmtpTransportOptions({
        host: "smtp.example.test",
        port,
        user: "sender@example.test",
        pass: "test-password",
      })
    ).toMatchObject({ port, secure: false, requireTLS: true });
  });

  it("rechaza puertos malformados o fuera del rango TCP", () => {
    expect(() => parseSmtpPort("465")).not.toThrow();
    expect(() => parseSmtpPort("465smtp")).toThrow(/SMTP_PORT/);
    expect(() => parseSmtpPort("0")).toThrow(/SMTP_PORT/);
    expect(() => parseSmtpPort("65536")).toThrow(/SMTP_PORT/);
  });
});
