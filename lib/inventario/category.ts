export const INVENTORY_CATEGORIES = [
  "MATERIA_PRIMA",
  "PALLET",
  "PINTURA",
  "MATERIAL",
  "HERRAMIENTA",
  "OTRO",
  "EPP",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_CATEGORY_LABEL: Record<InventoryCategory, string> = {
  MATERIA_PRIMA: "Materia prima",
  PALLET: "Pallet",
  PINTURA: "Pintura",
  MATERIAL: "Material",
  HERRAMIENTA: "Herramienta",
  OTRO: "Otro",
  EPP: "EPP — Elementos de Protección Personal",
};

export const EPP_ITEM_SUGGESTIONS = [
  "Antiparras",
  "Casco de seguridad",
  "Barboquejo para casco",
  "Tapones auditivos",
  "Orejeras de protección",
  "Chaleco reflectante",
  "Polera reflectante",
  "Polerón reflectante",
  "Chaqueta reflectante",
  "Zapatos de seguridad",
  "Botas de seguridad",
  "Guantes de seguridad",
  "Guantes anticorte",
  "Lentes de seguridad",
  "Protector facial",
  "Mascarilla de protección",
  "Respirador con filtros",
  "Arnés de seguridad",
  "Línea de vida",
  "Overol de protección",
  "Rodilleras de protección",
  "Protector solar",
] as const;

const EPP_PHRASES = [
  "tapon auditivo",
  "tapones auditivos",
  "tapon auricular",
  "tapones auriculares",
  "protector auditivo",
  "protectores auditivos",
  "protector de oido",
  "protectores de oido",
  "chaleco reflectante",
  "chalecos reflectantes",
  "poleron reflectante",
  "polerones reflectantes",
  "polera reflectante",
  "poleras reflectantes",
  "chaqueta reflectante",
  "chaquetas reflectantes",
  "ropa reflectante",
  "zapato de seguridad",
  "zapatos de seguridad",
  "zapato seguridad",
  "zapatos seguridad",
  "botin de seguridad",
  "botines de seguridad",
  "bota de seguridad",
  "botas de seguridad",
  "calzado de seguridad",
  "calzado seguridad",
  "guante de seguridad",
  "guantes de seguridad",
  "guante anticorte",
  "guantes anticorte",
  "lente de seguridad",
  "lentes de seguridad",
  "protector facial",
  "pantalla facial",
  "arnes de seguridad",
  "linea de vida",
  "cabo de vida",
  "overol de proteccion",
  "buzo de proteccion",
  "traje de proteccion",
  "bloqueador solar",
  "protector solar",
] as const;

const EPP_WORDS = [
  "antiparra",
  "antiparras",
  "casco",
  "cascos",
  "orejera",
  "orejeras",
  "barboquejo",
  "barboquejos",
  "respirador",
  "respiradores",
  "mascarilla",
  "mascarillas",
  "arnes",
  "arneses",
  "overol",
  "overoles",
  "mameluco",
  "mamelucos",
  "rodillera",
  "rodilleras",
  "guante",
  "guantes",
] as const;

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parsearCategoriaInventario(
  valor: string | null | undefined
): InventoryCategory | null {
  if (!valor?.trim()) return null;
  const normalizado = normalizarNombre(valor);
  for (const categoria of INVENTORY_CATEGORIES) {
    const nombreEnum = normalizarNombre(categoria);
    const etiqueta = normalizarNombre(INVENTORY_CATEGORY_LABEL[categoria]);
    if (normalizado === nombreEnum || normalizado === etiqueta)
      return categoria;
  }
  return null;
}

function contieneFrase(texto: string, frase: string): boolean {
  return ` ${texto} `.includes(` ${frase} `);
}

export function esArticuloEpp(nombre: string): boolean {
  const normalizado = normalizarNombre(nombre);
  if (!normalizado) return false;

  if (EPP_PHRASES.some((frase) => contieneFrase(normalizado, frase))) {
    return true;
  }

  const palabras = normalizado.split(" ");
  if (
    palabras.some((palabra) =>
      EPP_WORDS.includes(palabra as (typeof EPP_WORDS)[number])
    )
  ) {
    return true;
  }

  const reflectante =
    palabras.includes("reflectante") || palabras.includes("reflectantes");
  const ropa = [
    "chaleco",
    "chalecos",
    "polera",
    "poleras",
    "poleron",
    "polerones",
    "chaqueta",
    "chaquetas",
  ];
  if (reflectante && palabras.some((palabra) => ropa.includes(palabra)))
    return true;

  const calzado = [
    "zapato",
    "zapatos",
    "bota",
    "botas",
    "botin",
    "botines",
    "calzado",
  ];
  if (
    palabras.includes("seguridad") &&
    palabras.some((palabra) => calzado.includes(palabra))
  ) {
    return true;
  }

  const proteccionOcular = ["lente", "lentes", "gafa", "gafas"];
  if (
    (palabras.includes("seguridad") || palabras.includes("proteccion")) &&
    palabras.some((palabra) => proteccionOcular.includes(palabra))
  ) {
    return true;
  }

  return false;
}

export function isInventoryCategory(
  value: unknown
): value is InventoryCategory {
  return (
    typeof value === "string" &&
    INVENTORY_CATEGORIES.includes(value as InventoryCategory)
  );
}

export function resolverCategoriaInventario(
  nombre: string,
  categoriaSolicitada?: InventoryCategory | null
): InventoryCategory {
  return esArticuloEpp(nombre) ? "EPP" : (categoriaSolicitada ?? "OTRO");
}
