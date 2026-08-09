import {
  ProspectEmailInput,
  SenderFooterInfo,
  RenderedEmail,
  renderGreeting,
  assembleEmail,
  escapeHtml,
} from "./render";

// Segmento FARMACEUTICA (PROSPECCION_OUTREACH.md §7): laboratorios,
// droguerías. Dolor: trazabilidad y cumplimiento en disposición de
// residuos. Oferta: retiro documentado con cadena de custodia + pallets en
// buen estado para GDP/BPA. Gancho: TrackResiduos ya emite la evidencia que
// pide una auditoría — diferenciación real, no marketing.
export function renderFarmaceuticaEmail(
  input: ProspectEmailInput,
  footer: SenderFooterInfo
): RenderedEmail {
  const greeting = renderGreeting(input.contacto);
  const comunaLine = input.comuna ? ` en ${input.comuna}` : "";

  const subject = `Retiro de pallets con cadena de custodia documentada — ${input.empresa}`;

  const bodyHtml = `
    <p>${escapeHtml(greeting)},</p>
    <p>
      Le escribo de Coopera Pro. En un laboratorio como
      <strong>${escapeHtml(input.empresa)}</strong>${comunaLine ? escapeHtml(comunaLine) : ""},
      la disposición de pallets no puede quedar sin trazabilidad — su
      auditoría de GDP/BPA lo exige.
    </p>
    <p>
      Nuestro retiro queda documentado con cadena de custodia completa, y a
      cambio dejamos pallets en buen estado. La evidencia que genera nuestro
      propio sistema de trazabilidad es exactamente la que su auditoría pide.
    </p>
    <p>
      Si le sirve, coordinamos una visita corta para revisar el proceso y
      cotizar.
    </p>
  `.trim();

  const bodyText = [
    `${greeting},`,
    "",
    `Le escribo de Coopera Pro. En un laboratorio como ${input.empresa}${comunaLine}, la disposición de pallets no puede quedar sin trazabilidad — su auditoría de GDP/BPA lo exige.`,
    "",
    "Nuestro retiro queda documentado con cadena de custodia completa, y a cambio dejamos pallets en buen estado. La evidencia que genera nuestro propio sistema de trazabilidad es exactamente la que su auditoría pide.",
    "",
    "Si le sirve, coordinamos una visita corta para revisar el proceso y cotizar.",
  ].join("\n");

  return assembleEmail(subject, bodyHtml, bodyText, footer);
}
