/**
 * Cliente de envío de outreach vía SMTP directo — reemplaza el cliente de
 * Microsoft Graph original (ver PROSPECCION_OUTREACH.md §3 y §8).
 *
 * Por qué SMTP y no Graph: la decisión original asumía un buzón en Exchange
 * Online (Microsoft 365). El correo real de Coopera Pro está contratado con
 * Hostinger — Outlook es solo el cliente IMAP en el PC, no hay un tenant de
 * Entra ID detrás. Sin Exchange Online, Graph no tiene nada a qué
 * conectarse. SMTP con usuario/contraseña del buzón es el mecanismo que sí
 * corresponde a cómo está hosteado el correo hoy.
 */

import nodemailer from "nodemailer";

const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // mismo límite que la decisión original de §8

export interface EmailAttachment {
  filename: string;
  contentType: string;
  contentBase64: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment?: EmailAttachment;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

let cachedTransporter: nodemailer.Transporter | null = null;

// Un solo transporter reutilizado entre envíos del mismo lote — nodemailer
// mantiene su propio pool de conexiones, no vale la pena reconectar por
// cada contacto del cron.
function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = requireEnv("SMTP_HOST");
  const port = parseInt(process.env.SMTP_PORT ?? "465", 10);
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASSWORD");

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL directo, 587 = STARTTLS (secure:false, nodemailer negocia solo)
    auth: { user, pass },
  });
  return cachedTransporter;
}

// Validación pura del adjunto — separada del envío real para poder testear
// el límite de tamaño sin abrir una conexión SMTP.
export function assertAttachmentWithinLimit(
  attachment: EmailAttachment | undefined
) {
  if (!attachment) return;
  const bytes = Buffer.byteLength(attachment.contentBase64, "base64");
  if (bytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `El adjunto (${(bytes / 1024 / 1024).toFixed(2)}MB) supera el límite de 3MB de PROSPECCION_OUTREACH.md §8`
    );
  }
}

// Payload puro — separado del envío real para poder testear su forma sin
// abrir una conexión SMTP.
//
// Estrategia de dos buzones (decidida 2026-08-04): se autentica y envía
// desde SMTP_USER (operaciones@cooperapro.cl) para que SPF/DKIM calcen con
// quien realmente manda, pero las respuestas del prospecto van a
// SMTP_REPLY_TO (contacto@cooperapro.cl) vía el header Reply-To. Así, si
// algún filtro antispam llega a marcar la casilla de envío, la casilla
// pública que recibe el feedback de negocio queda protegida.
export function buildMailOptions(
  input: SendMailInput
): nodemailer.SendMailOptions {
  const fromAddress = requireEnv("SMTP_USER");
  const fromName = process.env.SMTP_FROM_NAME || "Coopera Pro";
  const replyTo = process.env.SMTP_REPLY_TO || undefined;

  return {
    from: `"${fromName}" <${fromAddress}>`,
    ...(replyTo ? { replyTo } : {}),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachment
      ? [
          {
            filename: input.attachment.filename,
            content: input.attachment.contentBase64,
            encoding: "base64",
            contentType: input.attachment.contentType,
          },
        ]
      : [],
  };
}

export async function sendMail(
  input: SendMailInput
): Promise<{ messageId: string | null }> {
  assertAttachmentWithinLimit(input.attachment);
  const transporter = getTransporter();
  const info = await transporter.sendMail(buildMailOptions(input));
  return { messageId: info.messageId ?? null };
}
