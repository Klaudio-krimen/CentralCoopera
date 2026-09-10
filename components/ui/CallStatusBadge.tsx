// Badge read-only del estado de gestión telefónica de un Contact
// (IMPORTACION_RADAR_PALLETS.md §4). Clon EXACTO de
// `components/ui/TemperatureBadge.tsx`: mismo `Record<Enum, { label, className,
// dot }>`, misma prop `size: 'sm' | 'md'`, mismo fallback al primer valor
// (`POR_LLAMAR`). Sólo tokens `crm-*` (mapeo del blueprint §7; los cuatro
// tokens usados — crm-secondary, crm-muted, crm-temp-tibio(-bg),
// crm-destructive, crm-success — existen en `tailwind.config.ts`). El color
// NUNCA es el único portador del dato: siempre va la etiqueta de texto.

type CallStatus =
  "POR_LLAMAR" | "LLAMADA" | "SIN_RESPUESTA" | "CORREO_CONSEGUIDO";

const CALL_STATUS_CONFIG: Record<
  CallStatus,
  { label: string; className: string; dot: string }
> = {
  POR_LLAMAR: {
    label: "Por llamar",
    className: "bg-crm-secondary text-crm-muted border-crm-muted/30",
    dot: "bg-crm-muted",
  },
  LLAMADA: {
    label: "Llamada",
    className:
      "bg-crm-temp-tibio-bg text-crm-temp-tibio border-crm-temp-tibio/30",
    dot: "bg-crm-temp-tibio",
  },
  SIN_RESPUESTA: {
    label: "Sin respuesta",
    className:
      "bg-crm-destructive/10 text-crm-destructive border-crm-destructive/30",
    dot: "bg-crm-destructive",
  },
  CORREO_CONSEGUIDO: {
    label: "Correo conseguido",
    className: "bg-crm-success/10 text-crm-success border-crm-success/30",
    dot: "bg-crm-success",
  },
};

export default function CallStatusBadge({
  callStatus,
  size = "md",
}: {
  callStatus: CallStatus | string | null;
  size?: "sm" | "md";
}) {
  const cfg =
    CALL_STATUS_CONFIG[callStatus as CallStatus] ??
    CALL_STATUS_CONFIG.POR_LLAMAR;
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${px} ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
