import crypto from "crypto";

// Mismo patrón que lib/webhook.ts (generateWebhookSecret): token opaco de 24
// bytes en hex, suficiente entropía para no ser adivinable por fuerza bruta
// y corto para caber en un link de correo.
export function generateOptOutToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildUnsubscribeUrl(baseUrl: string, token: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/api/outreach/unsubscribe?t=${encodeURIComponent(token)}`;
}
