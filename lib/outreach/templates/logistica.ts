import {
  ProspectEmailInput,
  SenderFooterInfo,
  RenderedEmail,
  renderGreeting,
  assembleEmail,
} from "./render";

// Segmento LOGISTICA (PROSPECCION_OUTREACH.md §7): operadores, bodegas,
// almacenaje. Dolor: pallets rotos acumulados que ocupan m² y cuestan
// retirar. Oferta: retiro de pallets dañados + suministro de reparados
// certificados. Gancho: convierte un costo de disposición en un canje.
export function renderLogisticaEmail(
  input: ProspectEmailInput,
  footer: SenderFooterInfo
): RenderedEmail {
  const greeting = renderGreeting(input.contacto);
  const comunaLine = input.comuna ? ` en ${input.comuna}` : "";

  const subject = `Pallets dañados en su bodega${comunaLine} — se los retiramos y le dejamos reparados`;

  const bodyHtml = `
    <p>${greeting},</p>
    <p>
      Le escribo de Coopera Pro. Sabemos que en una operación como la de
      <strong>${escapeHtml(input.empresa)}</strong> los pallets dañados se van
      acumulando en la bodega${comunaLine ? escapeHtml(comunaLine) : ""} — ocupan
      espacio y, encima, cuesta plata deshacerse de ellos.
    </p>
    <p>
      Nosotros los retiramos y se los cambiamos por pallets reparados y
      certificados. Un costo de disposición se convierte en un canje.
    </p>
    <p>
      Si le interesa, con gusto coordinamos una visita corta para ver el
      volumen y cotizar.
    </p>
  `.trim();

  const bodyText = [
    `${greeting},`,
    "",
    `Le escribo de Coopera Pro. Sabemos que en una operación como la de ${input.empresa} los pallets dañados se van acumulando en la bodega${comunaLine} — ocupan espacio y, encima, cuesta plata deshacerse de ellos.`,
    "",
    "Nosotros los retiramos y se los cambiamos por pallets reparados y certificados. Un costo de disposición se convierte en un canje.",
    "",
    "Si le interesa, con gusto coordinamos una visita corta para ver el volumen y cotizar.",
  ].join("\n");

  return assembleEmail(subject, bodyHtml, bodyText, footer);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
