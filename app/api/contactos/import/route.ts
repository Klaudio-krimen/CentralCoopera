import { ContactSource, ContactTemperature } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { hasModuleAccess } from "@/lib/access";

const IMPORT_FIELDS = [
  "name",
  "email",
  "phone",
  "role",
  "company",
  "temperature",
  "source",
  "notes",
  "website",
  "instagram",
  "linkedin",
  "city",
  "rating",
  "reviews",
  "qualification",
  "date",
] as const;

// Valores placeholder que herramientas de scraping (ej. Apify) escriben
// literalmente cuando no encontraron el dato — deben tratarse como vacío,
// no como el texto real del campo.
const PLACEHOLDER_VALUES = new Set([
  "sin dato",
  "sindato",
  "n/a",
  "na",
  "-",
  "null",
  "undefined",
]);

function clean(value?: string): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

function isImportRow(value: unknown): value is ImportRow {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  return IMPORT_FIELDS.every((field) => {
    const fieldValue = (value as Record<string, unknown>)[field];
    return fieldValue === undefined || typeof fieldValue === "string";
  });
}

function isContactSource(value: string): value is ContactSource {
  return (Object.values(ContactSource) as string[]).includes(value);
}

function isContactTemperature(value: string): value is ContactTemperature {
  return (Object.values(ContactTemperature) as string[]).includes(value);
}

interface ImportRow {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  temperature?: string;
  source?: string;
  notes?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  city?: string;
  rating?: string;
  reviews?: string;
  qualification?: string;
  date?: string;
}

// POST /api/contactos/import — carga masiva de contactos desde un CSV ya
// parseado en el cliente. Soporta tanto el formato manual simple (nombre/
// empresa/...) como el formato real que exporta el pipeline de scraping de
// leads en Apify (negocio/contacto/puesto/.../señal_de_calificación/fuente/
// fecha) — ImportContactsButton mapea ambos a este mismo shape.
// Si la empresa no existe se crea automáticamente (mismo criterio que el
// webhook de leads en /api/webhooks/leads).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasModuleAccess(session.user, "CRM"))
    return apiError("Acceso denegado", 403);

  const body: unknown = await req.json().catch(() => null);
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !Array.isArray((body as { rows?: unknown }).rows)
  ) {
    return apiError("Formato de importación inválido");
  }
  const rows = (body as { rows: unknown[] }).rows;
  if (rows.length === 0) return apiError("Sin filas para importar");
  if (rows.length > 500)
    return apiError("El máximo es 500 filas por importación", 413);

  const companyCache = new Map<string, string>();
  let created = 0;
  let companiesCreated = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!isImportRow(row)) {
      errors.push({ row: i + 2, message: "Formato de fila inválido" });
      continue;
    }
    const company = clean(row.company);
    if (!company) {
      errors.push({ row: i + 2, message: "Falta la empresa (o negocio)" });
      continue;
    }

    try {
      // El scraper a menudo no identifica un contacto humano ("sin dato")
      // — en ese caso el lead se registra igual, usando el nombre de la
      // empresa como identificador, para que Ventas pueda trabajarlo y
      // completar el nombre real del contacto más adelante.
      const name = clean(row.name) || company;

      const companyKey = company.toLowerCase();
      const cachedCompanyId = companyCache.get(companyKey);

      const temperature = clean(row.temperature)?.toUpperCase();
      const rawSource = clean(row.source);
      const upperSource = rawSource?.toUpperCase();
      const source: ContactSource =
        upperSource && isContactSource(upperSource)
          ? upperSource
          : rawSource && /apify|crawler|scrap/i.test(rawSource)
            ? "SCRAPING"
            : "IMPORT";

      // Campos que no tienen columna propia en Contact (sitio, redes,
      // ciudad, rating, señal de calificación del scraper, fecha) se
      // preservan como contexto legible en notas en vez de descartarse.
      const website = clean(row.website);
      const instagram = clean(row.instagram);
      const linkedin = clean(row.linkedin);
      const city = clean(row.city);
      const rating = clean(row.rating);
      const reviews = clean(row.reviews);
      const qualification = clean(row.qualification);
      const date = clean(row.date);

      const extraLines: string[] = [];
      if (website) extraLines.push(`Sitio web: ${website}`);
      if (instagram) extraLines.push(`Instagram: ${instagram}`);
      if (linkedin) extraLines.push(`LinkedIn: ${linkedin}`);
      if (city) extraLines.push(`Ciudad: ${city}`);
      if (rating)
        extraLines.push(
          `Rating: ${rating}${reviews ? ` (${reviews} reseñas)` : ""}`
        );
      if (qualification)
        extraLines.push(`Señal de calificación: ${qualification}`);
      if (date) extraLines.push(`Fecha de origen: ${date}`);

      const notes = [
        clean(row.notes),
        extraLines.length > 0 ? extraLines.join("\n") : undefined,
      ]
        .filter(Boolean)
        .join("\n\n");

      const result = await prisma.$transaction(async (tx) => {
        let companyId = cachedCompanyId;
        let companyWasCreated = false;
        if (!companyId) {
          let companyRecord = await tx.company.findFirst({
            where: { name: { equals: company, mode: "insensitive" } },
            select: { id: true },
          });
          if (!companyRecord) {
            companyRecord = await tx.company.create({
              data: { name: company },
              select: { id: true },
            });
            companyWasCreated = true;
          }
          companyId = companyRecord.id;
        }

        await tx.contact.create({
          data: {
            companyId,
            name,
            email: clean(row.email) || null,
            phone: clean(row.phone) || null,
            role: clean(row.role) || null,
            notes: notes || null,
            source,
            ...(temperature && isContactTemperature(temperature)
              ? { temperature }
              : {}),
          },
        });
        return { companyId, companyWasCreated };
      });
      companyCache.set(companyKey, result.companyId);
      if (result.companyWasCreated) companiesCreated++;
      created++;
    } catch {
      errors.push({
        row: i + 2,
        message:
          "No se pudo importar esta fila; revise los datos e inténtelo nuevamente",
      });
    }
  }

  return NextResponse.json({ created, companiesCreated, errors });
}
