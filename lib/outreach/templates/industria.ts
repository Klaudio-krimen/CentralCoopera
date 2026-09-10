import {
  ProspectEmailInput,
  SenderFooterInfo,
  RenderedEmail,
  renderGreeting,
  assembleEmail,
  escapeHtml,
} from "./render";

// Segmento INDUSTRIA (fallback de classifySegment; PROSPECCION_OUTREACH.md §7,
// spec IMPORTACION_RADAR_PALLETS.md §6.3): alimentos, papel/cartón, insumos
// médicos, retail, manufactura. Dolor: una planta acumula pallets rotos y
// fuera de medida que ocupan bodega y cuestan retirar. Oferta: retiro de los
// dañados + reposición con pallets reparados y estandarizados certificados,
// sin comprar madera nueva. Gancho: convierte un costo de disposición en un
// canje y deja el parque de pallets parejo — sin el ángulo de trazabilidad
// (FARMACEUTICA) ni el de operador logístico puro (LOGISTICA).
export function renderIndustriaEmail(
  input: ProspectEmailInput,
  footer: SenderFooterInfo
): RenderedEmail {
  const greeting = renderGreeting(input.contacto);
  const comunaLine = input.comuna ? ` en ${input.comuna}` : "";

  const subject = `Pallets fuera de norma en su planta${comunaLine} — los retiramos y reponemos con reparados certificados`;

  const bodyHtml = `
    <p>${escapeHtml(greeting)},</p>
    <p>
      Le escribo de Coopera Pro. En una operación como la de
      <strong>${escapeHtml(input.empresa)}</strong> los pallets rotos y fuera de
      medida se van acumulando${comunaLine ? escapeHtml(comunaLine) : ""} — ocupan
      bodega y cuesta plata sacarlos.
    </p>
    <p>
      Nosotros retiramos los dañados y los reponemos con pallets reparados y
      estandarizados, certificados — sin que tenga que comprar madera nueva. Un
      costo de disposición pasa a ser un canje, y su parque de pallets queda
      parejo.
    </p>
    <p>
      Si le hace sentido, coordinamos una visita corta para ver el volumen y
      cotizar.
    </p>
  `.trim();

  const bodyText = [
    `${greeting},`,
    "",
    `Le escribo de Coopera Pro. En una operación como la de ${input.empresa} los pallets rotos y fuera de medida se van acumulando${comunaLine} — ocupan bodega y cuesta plata sacarlos.`,
    "",
    "Nosotros retiramos los dañados y los reponemos con pallets reparados y estandarizados, certificados — sin que tenga que comprar madera nueva. Un costo de disposición pasa a ser un canje, y su parque de pallets queda parejo.",
    "",
    "Si le hace sentido, coordinamos una visita corta para ver el volumen y cotizar.",
  ].join("\n");

  return assembleEmail(subject, bodyHtml, bodyText, footer);
}
