/**
 * Render compartido de las plantillas de outreach — saludo con fallback,
 * pie de correo legal y armado final del HTML/texto plano. Sin I/O: cada
 * plantilla de segmento (logistica.ts, farmaceutica.ts) llama a estas
 * funciones con su propio cuerpo.
 *
 * Regla dura de PROSPECCION_OUTREACH.md §7: si el contacto es null, el
 * saludo debe funcionar igual — nunca "Hola sin dato" ni "Hola {{contacto}}"
 * literal. Por eso el saludo es una función, no interpolación de string:
 * así es imposible renderizar la variable sin resolver.
 */

export interface ProspectEmailInput {
  empresa: string;
  comuna: string | null;
  rubro: string | null;
  contacto: string | null;
}

export interface SenderFooterInfo {
  legalName: string;
  rut: string;
  address: string;
  unsubscribeUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderGreeting(contacto: string | null): string {
  return contacto ? `Hola ${contacto}` : "Estimados";
}

// Ley 19.496 art. 28 B (Chile): toda comunicación promocional debe
// identificar al remitente y traer un medio de baja gratuito. Este pie va
// en todos los correos de outreach, sin excepción.
export function renderFooterHtml(footer: SenderFooterInfo): string {
  return `
    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0" />
    <p style="font-size:12px;color:#666;line-height:1.5">
      ${escapeHtml(footer.legalName)} — RUT ${escapeHtml(footer.rut)}<br />
      ${escapeHtml(footer.address)}<br />
      Si no quieres volver a recibir este tipo de correos,
      <a href="${footer.unsubscribeUrl}">haz clic aquí para darte de baja</a>.
    </p>
  `.trim();
}

export function renderFooterText(footer: SenderFooterInfo): string {
  return [
    "",
    "---",
    `${footer.legalName} — RUT ${footer.rut}`,
    footer.address,
    `Para darte de baja: ${footer.unsubscribeUrl}`,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assembleEmail(
  subject: string,
  bodyHtml: string,
  bodyText: string,
  footer: SenderFooterInfo
): RenderedEmail {
  return {
    subject,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.6">${bodyHtml}${renderFooterHtml(footer)}</div>`,
    text: `${bodyText}${renderFooterText(footer)}`,
  };
}
