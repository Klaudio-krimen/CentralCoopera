"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, ArrowClockwise } from "@phosphor-icons/react";

interface WebhookData {
  enabled: boolean;
  endpoint: string;
  headerName: string;
  secret?: string;
}

export default function WebhookSettings() {
  const [data, setData] = useState<WebhookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"endpoint" | "secret" | null>(null);

  useEffect(() => {
    fetch("/api/configuracion/webhook")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar la configuración");
        return r.json() as Promise<WebhookData>;
      })
      .then(setData)
      .catch(() =>
        toast.error("No se pudo cargar la configuración del webhook")
      )
      .finally(() => setLoading(false));
  }, []);

  const update = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/configuracion/webhook", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("No se pudo actualizar el webhook");
      return null;
    }
    const updated = (await res.json()) as Partial<WebhookData>;
    setData((current) =>
      current ? { ...current, ...updated } : (updated as WebhookData)
    );
    return updated;
  };

  const handleToggle = async () => {
    if (!data) return;
    const next = !data.enabled;
    const updated = await update({ enabled: next });
    if (updated)
      toast.success(next ? "Webhook activado" : "Webhook desactivado");
  };

  const handleRegenerate = async () => {
    if (
      !confirm(
        "Esto invalida el secreto actual. Deberás copiar el nuevo secreto y actualizar la integración conectada. ¿Continuar?"
      )
    )
      return;
    const updated = await update({ regenerate: true });
    if (updated?.secret)
      toast.success(
        "Secreto regenerado. Cópialo ahora; solo se muestra una vez."
      );
  };

  const handleCopy = async (value: string, kind: "endpoint" | "secret") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === "secret" ? "Secreto copiado" : "Endpoint copiado");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  if (loading || !data) {
    return <div className="crm-card animate-pulse h-28" />;
  }

  return (
    <div className="crm-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-medium text-crm-foreground">
            Webhook de leads
          </p>
          <p className="text-xs text-crm-muted mt-0.5">
            Recibe leads automáticamente desde formularios, landing pages o
            Zapier/Make.
          </p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${data.enabled ? "bg-crm-primary" : "bg-crm-border"}`}
          aria-label={data.enabled ? "Desactivar webhook" : "Activar webhook"}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${data.enabled ? "translate-x-5" : "translate-x-1"}`}
          />
        </button>
      </div>

      {data.enabled && (
        <>
          <div className="space-y-2">
            <label
              className="block text-xs font-medium text-crm-foreground"
              htmlFor="webhook-endpoint"
            >
              Endpoint
            </label>
            <div className="flex items-center gap-2">
              <input
                id="webhook-endpoint"
                readOnly
                value={data.endpoint}
                onFocus={(e) => e.target.select()}
                className="crm-input flex-1 font-mono text-xs"
              />
              <button
                onClick={() => handleCopy(data.endpoint, "endpoint")}
                aria-label="Copiar endpoint"
                className="crm-btn-outline shrink-0 px-2.5"
              >
                {copied === "endpoint" ? (
                  <Check size={14} className="text-crm-success" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
          {data.secret && (
            <div className="space-y-2">
              <label
                className="block text-xs font-medium text-crm-foreground"
                htmlFor="webhook-secret"
              >
                Secreto (solo visible ahora)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="webhook-secret"
                  readOnly
                  type="password"
                  value={data.secret}
                  onFocus={(e) => e.target.select()}
                  className="crm-input flex-1 font-mono text-xs"
                />
                <button
                  onClick={() =>
                    data.secret && handleCopy(data.secret, "secret")
                  }
                  aria-label="Copiar secreto del webhook"
                  className="crm-btn-outline shrink-0 px-2.5"
                >
                  {copied === "secret" ? (
                    <Check size={14} className="text-crm-success" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-crm-muted leading-relaxed">
              POST JSON con <code className="font-mono">name</code> y{" "}
              <code className="font-mono">company</code> requeridos. Envía el
              secreto en el header{" "}
              <code className="font-mono">{data.headerName}</code>; la URL no
              contiene credenciales. El secreto solo se vuelve a mostrar al
              regenerarlo.
            </p>
            <button
              onClick={handleRegenerate}
              className="text-xs text-crm-muted hover:text-crm-primary flex items-center gap-1 shrink-0"
            >
              <ArrowClockwise size={12} />
              Regenerar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
