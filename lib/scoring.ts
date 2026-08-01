// Clasificación de leads por reglas (sin IA) — port fiel de auto-crm/src/lib/scoring.ts,
// adaptado a los tipos de Central Coopera (FRIO/TIBIO/CALIENTE) y a CLP (Deal.value ya
// viene en pesos, no en centavos). Los umbrales de valor de deal (500k/2M CLP) son un
// placeholder razonable para el negocio de reciclaje/pallets — ajustar si no calzan.
import type { ContactTemperature } from "@prisma/client";

export interface ScoringInput {
  temperature: ContactTemperature;
  hasEmail: boolean;
  hasPhone: boolean;
  hasRole: boolean;
  activityCount: number;
  daysSinceLastActivity: number;
  hasDeals: boolean;
  dealValue: number;
}

export function calculateLeadScore(input: ScoringInput): number {
  let score = 0;

  switch (input.temperature) {
    case "CALIENTE":
      score += 40;
      break;
    case "TIBIO":
      score += 25;
      break;
    case "FRIO":
      score += 10;
      break;
  }

  if (input.hasEmail) score += 10;
  if (input.hasPhone) score += 10;
  if (input.hasRole) score += 5;

  score += Math.min(input.activityCount * 5, 20);

  if (input.daysSinceLastActivity > 30) score -= 15;
  else if (input.daysSinceLastActivity > 14) score -= 10;
  else if (input.daysSinceLastActivity > 7) score -= 5;

  if (input.hasDeals) score += 10;
  if (input.dealValue > 500_000) score += 5;
  if (input.dealValue > 2_000_000) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function suggestTemperature(score: number): ContactTemperature {
  if (score >= 70) return "CALIENTE";
  if (score >= 30) return "TIBIO";
  return "FRIO";
}
