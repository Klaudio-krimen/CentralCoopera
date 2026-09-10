import { describe, it, expect } from "vitest";
import {
  renderGreeting,
  renderFooterHtml,
  renderFooterText,
  assembleEmail,
} from "./render";
import { renderLogisticaEmail } from "./logistica";
import { renderFarmaceuticaEmail } from "./farmaceutica";
import { renderIndustriaEmail } from "./industria";
import { getTemplate, TEMPLATES } from "./index";

const footer = {
  legalName: "Coopera Pro SpA",
  rut: "76.111.222-3",
  address: "Av. Ejemplo 123, Santiago",
  unsubscribeUrl: "https://cooperapro.cl/api/outreach/unsubscribe?t=abc123",
};

describe("renderGreeting", () => {
  it("saluda por nombre cuando hay contacto", () => {
    expect(renderGreeting("María")).toBe("Hola María");
  });

  // Regla dura de PROSPECCION_OUTREACH.md §7: si contacto es null, el saludo
  // debe funcionar igual. Nunca "Hola sin dato" ni "Hola {{contacto}}".
  it("nunca renderiza 'Hola sin dato' ni deja la variable sin resolver", () => {
    const greeting = renderGreeting(null);
    expect(greeting).not.toContain("sin dato");
    expect(greeting).not.toContain("{{contacto}}");
    expect(greeting).not.toContain("null");
    expect(greeting).not.toContain("undefined");
    expect(greeting).toBe("Estimados");
  });
});

describe("renderFooterHtml / renderFooterText", () => {
  it("incluye razón social, RUT, dirección y el link de baja (Ley 19.496 art. 28 B)", () => {
    const html = renderFooterHtml(footer);
    expect(html).toContain("Coopera Pro SpA");
    expect(html).toContain("76.111.222-3");
    expect(html).toContain("Av. Ejemplo 123, Santiago");
    expect(html).toContain(footer.unsubscribeUrl);

    const text = renderFooterText(footer);
    expect(text).toContain("Coopera Pro SpA");
    expect(text).toContain(footer.unsubscribeUrl);
  });

  it("escapa HTML en los datos del remitente", () => {
    const html = renderFooterHtml({
      ...footer,
      legalName: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
  });
});

describe("assembleEmail", () => {
  it("junta cuerpo + pie en html y en texto plano", () => {
    const email = assembleEmail("Asunto", "<p>cuerpo</p>", "cuerpo", footer);
    expect(email.subject).toBe("Asunto");
    expect(email.html).toContain("<p>cuerpo</p>");
    expect(email.html).toContain(footer.unsubscribeUrl);
    expect(email.text).toContain("cuerpo");
    expect(email.text).toContain(footer.unsubscribeUrl);
  });

  it("no incluye pixel de tracking ni imágenes remotas (regla de entregabilidad §10)", () => {
    const email = assembleEmail("Asunto", "<p>cuerpo</p>", "cuerpo", footer);
    expect(email.html).not.toMatch(/<img/i);
  });
});

describe("plantillas de segmento", () => {
  const baseInput = {
    empresa: "ACME Bodegas",
    comuna: "Pudahuel",
    rubro: "Logística",
    contacto: null,
  };

  it("logística: nunca renderiza 'Hola sin dato' cuando no hay contacto humano", () => {
    const email = renderLogisticaEmail(baseInput, footer);
    expect(email.html).not.toContain("sin dato");
    expect(email.html).toContain("Estimados");
    expect(email.text).not.toContain("sin dato");
  });

  it("logística: interpola el nombre de la empresa y la comuna", () => {
    const email = renderLogisticaEmail(baseInput, footer);
    expect(email.html).toContain("ACME Bodegas");
    expect(email.subject).toContain("Pudahuel");
  });

  it("logística: funciona igual si la comuna es null", () => {
    const email = renderLogisticaEmail({ ...baseInput, comuna: null }, footer);
    expect(email.html).toContain("ACME Bodegas");
    expect(email.html).not.toContain("null");
  });

  it("logística: no usa la palabra GRATIS en el asunto (regla de entregabilidad §10)", () => {
    const email = renderLogisticaEmail(baseInput, footer);
    expect(email.subject.toUpperCase()).not.toContain("GRATIS");
  });

  it("farmacéutica: saluda por nombre cuando sí hay contacto", () => {
    const email = renderFarmaceuticaEmail(
      { ...baseInput, contacto: "Dr. Pérez" },
      footer
    );
    expect(email.html).toContain("Hola Dr. Pérez");
  });

  it("farmacéutica: menciona trazabilidad/cadena de custodia (diferenciador de TrackResiduos)", () => {
    const email = renderFarmaceuticaEmail(baseInput, footer);
    expect(email.text.toLowerCase()).toContain("trazabilidad");
    expect(email.text.toLowerCase()).toContain("cadena de custodia");
  });
});

describe("plantilla industria", () => {
  const baseInput = {
    empresa: "Planta Alfa",
    comuna: "Maipú",
    rubro: "Alimentos",
    contacto: null,
  };

  it("saluda 'Estimados' y no filtra 'sin dato' / 'null' / '{{' cuando falta el contacto", () => {
    // Acceptance E1-T6 #2 — contacto/comuna/rubro null no dejan basura visible.
    const email = renderIndustriaEmail(
      { empresa: "X", comuna: null, rubro: null, contacto: null },
      footer
    );
    for (const salida of [email.html, email.text]) {
      expect(salida).toContain("Estimados");
      expect(salida).not.toContain("sin dato");
      expect(salida).not.toContain("null");
      expect(salida).not.toContain("{{");
    }
  });

  it("interpola la empresa y la comuna, y saluda por nombre si hay contacto", () => {
    const email = renderIndustriaEmail(
      { ...baseInput, contacto: "Sra. Rojas" },
      footer
    );
    expect(email.html).toContain("Planta Alfa");
    expect(email.subject).toContain("Maipú");
    expect(email.html).toContain("Hola Sra. Rojas");
  });

  it("funciona igual si la comuna es null (sin el literal 'null' en el texto)", () => {
    const email = renderIndustriaEmail({ ...baseInput, comuna: null }, footer);
    expect(email.html).toContain("Planta Alfa");
    expect(email.text).not.toContain("null");
  });

  it("no incluye <img en el html (regla de entregabilidad §10)", () => {
    // Acceptance E1-T6 #3.
    expect(renderIndustriaEmail(baseInput, footer).html).not.toMatch(/<img/i);
  });

  it("no usa la palabra GRATIS en el asunto (regla de entregabilidad §10)", () => {
    // Acceptance E1-T6 #4.
    expect(
      renderIndustriaEmail(baseInput, footer).subject.toUpperCase()
    ).not.toContain("GRATIS");
  });

  it("arma el pie legal (razón social + RUT + link de baja) vía assembleEmail", () => {
    // Acceptance E1-T6 #5 — Ley 19.496 art. 28 B.
    const email = renderIndustriaEmail(baseInput, footer);
    expect(email.html).toContain(footer.legalName);
    expect(email.html).toContain(footer.rut);
    expect(email.html).toContain(footer.unsubscribeUrl);
    expect(email.text).toContain(footer.unsubscribeUrl);
  });
});

describe("registro de plantillas", () => {
  it("resuelve logistica-v1, farmaceutica-v1 e industria-v1", () => {
    expect(getTemplate("logistica-v1")).toBe(TEMPLATES["logistica-v1"]);
    expect(getTemplate("farmaceutica-v1")).toBe(TEMPLATES["farmaceutica-v1"]);
    expect(getTemplate("industria-v1")).toBe(TEMPLATES["industria-v1"]);
    expect(getTemplate("industria-v1")).toBe(renderIndustriaEmail);
  });

  it("lanza un error legible ante una clave desconocida", () => {
    expect(() => getTemplate("no-existe")).toThrow(/no-existe/);
  });
});
