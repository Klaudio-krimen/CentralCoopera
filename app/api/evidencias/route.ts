import { EvidenceStage } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canDeleteEvidence,
  canUploadEvidence,
  hasOperationsAccess,
} from "@/lib/operations/authorization";
import { apiError } from "@/lib/utils";
import sharp from "sharp";

const MAX_SIZE_MB = parseInt(process.env.MAX_PHOTO_SIZE_MB ?? "1");
const MAX_PHOTOS = parseInt(process.env.MAX_PHOTOS_PER_ORDER ?? "5");
const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;

function isEvidenceStage(value: string): value is EvidenceStage {
  return (Object.values(EvidenceStage) as string[]).includes(value);
}

function parseCoordinate(
  value: FormDataEntryValue | null,
  min: number,
  max: number
) {
  if (value === null) return { valid: true as const, value: null };
  if (typeof value !== "string" || !value.trim())
    return { valid: false as const };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { valid: false as const };
  }
  return { valid: true as const, value: parsed };
}

// POST /api/evidencias — upload photo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasOperationsAccess(session.user))
    return apiError("Acceso denegado", 403);

  const formData = await req.formData().catch(() => null);
  if (!formData) return apiError("Formulario inválido");
  const fileEntry = formData.get("file");
  const file =
    typeof File !== "undefined" && fileEntry instanceof File ? fileEntry : null;
  const orderIdEntry = formData.get("orderId");
  const orderId = typeof orderIdEntry === "string" ? orderIdEntry : null;
  const stageEntry = formData.get("stage");
  const stageValue = typeof stageEntry === "string" ? stageEntry : "RETIRO";
  if (!isEvidenceStage(stageValue))
    return apiError("Etapa de evidencia inválida");
  const stage = stageValue;
  const latResult = parseCoordinate(formData.get("lat"), -90, 90);
  const lngResult = parseCoordinate(formData.get("lng"), -180, 180);
  if (!latResult.valid || !lngResult.valid)
    return apiError("Coordenadas inválidas");
  const lat = latResult.value;
  const lng = lngResult.value;

  if (!file) return apiError("Archivo requerido");
  if (!orderId) return apiError("orderId requerido");

  const order = await prisma.pickupOrder.findUnique({
    where: { id: orderId },
    select: { id: true, driverId: true, status: true },
  });
  if (!order) return apiError("Orden no encontrada", 404);

  if (!canUploadEvidence(session.user, order.driverId, order.status, stage)) {
    return apiError("Acceso denegado", 403);
  }

  const existingCount = await prisma.evidence.count({
    where: { orderId, stage },
  });
  if (existingCount >= MAX_PHOTOS) {
    return apiError(`Límite de ${MAX_PHOTOS} fotos alcanzado`);
  }

  // Validar tamaño del archivo original antes de leer a memoria
  const MAX_RAW_MB = 20;
  if (file.size > MAX_RAW_MB * 1024 * 1024) {
    return apiError(`El archivo supera el límite de ${MAX_RAW_MB}MB`, 413);
  }

  // Validar tipo MIME declarado (defensa básica; sharp validará el contenido real)
  const ALLOWED_MIMES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  if (!ALLOWED_MIMES.includes(file.type)) {
    return apiError(
      "Tipo de archivo no permitido. Solo se aceptan imágenes.",
      415
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let compressed: Buffer;
  try {
    compressed = await sharp(buffer)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return apiError("El archivo no es una imagen válida", 422);
  }

  const maxBytes = MAX_SIZE_MB * 1024 * 1024;
  if (compressed.length > maxBytes) {
    return apiError(`La foto supera el tamaño máximo de ${MAX_SIZE_MB}MB`);
  }

  const filename = `ev_${orderId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;
  let imagePath: string;

  if (IS_VERCEL) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`evidencias/${filename}`, compressed, {
      access: "public",
      contentType: "image/webp",
    });
    imagePath = blob.url;
  } else {
    const { writeFile } = await import("fs/promises");
    const { join } = await import("path");
    const uploadDir = process.env.UPLOAD_DIR ?? "./public/uploads";
    const filepath = join(process.cwd(), uploadDir, filename);
    await writeFile(filepath, compressed);
    imagePath = `/uploads/${filename}`;
  }

  const evidence = await prisma.evidence.create({
    data: {
      orderId,
      stage,
      imagePath,
      uploadedById: session.user.id,
      ...(lat !== null ? { lat } : {}),
      ...(lng !== null ? { lng } : {}),
    },
  });

  return NextResponse.json(
    { id: evidence.id, path: evidence.imagePath },
    { status: 201 }
  );
}

// DELETE /api/evidencias?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasOperationsAccess(session.user))
    return apiError("Acceso denegado", 403);

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const path = searchParams.get("path");

  if (!id && !path) return apiError("id o path requerido");

  const evidence = await prisma.evidence.findFirst({
    where: id ? { id } : { imagePath: path ?? "" },
    include: { order: { select: { driverId: true, status: true } } },
  });

  if (!evidence) return apiError("Evidencia no encontrada", 404);

  if (
    !canDeleteEvidence(
      session.user,
      evidence.order.driverId,
      evidence.uploadedById,
      evidence.order.status
    )
  ) {
    return apiError("Acceso denegado", 403);
  }

  if (IS_VERCEL) {
    const { del } = await import("@vercel/blob");
    try {
      await del(evidence.imagePath);
    } catch {
      /* already deleted */
    }
  } else {
    const { unlink } = await import("fs/promises");
    const { join } = await import("path");
    try {
      await unlink(join(process.cwd(), "public", evidence.imagePath));
    } catch {
      /* file may not exist */
    }
  }

  await prisma.evidence.delete({ where: { id: evidence.id } });

  return NextResponse.json({ ok: true });
}
