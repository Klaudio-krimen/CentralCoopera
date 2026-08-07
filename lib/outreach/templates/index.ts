import { renderLogisticaEmail } from "./logistica";
import { renderFarmaceuticaEmail } from "./farmaceutica";
import type {
  ProspectEmailInput,
  SenderFooterInfo,
  RenderedEmail,
} from "./render";

export type { ProspectEmailInput, SenderFooterInfo, RenderedEmail };

// templateKey de OutreachCampaign apunta a una clave de este registro — así
// el cron no necesita un switch/case y agregar un segmento nuevo es solo
// agregar una entrada acá + su archivo de plantilla.
export const TEMPLATES: Record<
  string,
  (input: ProspectEmailInput, footer: SenderFooterInfo) => RenderedEmail
> = {
  "logistica-v1": renderLogisticaEmail,
  "farmaceutica-v1": renderFarmaceuticaEmail,
};

export function getTemplate(templateKey: string) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Plantilla desconocida: "${templateKey}"`);
  }
  return template;
}
