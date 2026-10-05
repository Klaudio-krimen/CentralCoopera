import { PickupOrderStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canAccessOrder,
  canEditPickupItems,
  canReceivePickupOrder,
  canUpdatePickupStatus,
  hasOperationsAccess,
} from "@/lib/operations/authorization";
import { apiError, calculateDiscrepancy } from "@/lib/utils";

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface JsonObject {
  [key: string]: unknown;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOrderStatus(value: string): value is PickupOrderStatus {
  return (Object.values(PickupOrderStatus) as string[]).includes(value);
}

function validCoordinate(
  value: unknown,
  min: number,
  max: number
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

// GET /api/ordenes/:id
export async function GET(_req: NextRequest, props: RouteContext) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasOperationsAccess(session.user))
    return apiError("Acceso denegado", 403);

  const order = await prisma.pickupOrder.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { name: true, address: true, contactName: true } },
      driver: { select: { name: true, email: true } },
      items: { include: { materialType: true } },
      evidences: true,
      discrepancies: true,
    },
  });

  if (!order) return apiError("Orden no encontrada", 404);
  if (!canAccessOrder(session.user, order.driverId))
    return apiError("Acceso denegado", 403);

  return NextResponse.json(order);
}

// PATCH /api/ordenes/:id: receive, signature, item update, or status transition.
export async function PATCH(req: NextRequest, props: RouteContext) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return apiError("No autorizado", 401);
  if (!hasOperationsAccess(session.user))
    return apiError("Acceso denegado", 403);

  const order = await prisma.pickupOrder.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order) return apiError("Orden no encontrada", 404);
  if (!canAccessOrder(session.user, order.driverId))
    return apiError("Acceso denegado", 403);

  const body: unknown = await req.json().catch(() => null);
  if (!isJsonObject(body)) return apiError("Body inválido");

  if (body.action === "receive") {
    if (!canReceivePickupOrder(session.user))
      return apiError("Acceso denegado", 403);
    if (order.status !== "EN_TRANSITO")
      return apiError("La orden no está en tránsito", 409);

    if (
      !Array.isArray(body.receivedItems) ||
      body.receivedItems.length !== order.items.length
    ) {
      return apiError("Debe informar la cantidad recibida para cada ítem");
    }
    const receivedById = new Map<string, number>();
    for (const value of body.receivedItems) {
      if (!isJsonObject(value)) return apiError("Ítem recibido inválido");
      const { itemId, receivedQuantity } = value;
      if (
        typeof itemId !== "string" ||
        !order.items.some((item) => item.id === itemId) ||
        receivedById.has(itemId) ||
        typeof receivedQuantity !== "number" ||
        !Number.isFinite(receivedQuantity) ||
        receivedQuantity < 0
      ) {
        return apiError("Ítem recibido inválido");
      }
      receivedById.set(itemId, receivedQuantity);
    }
    if (receivedById.size !== order.items.length) {
      return apiError("Debe informar la cantidad recibida para cada ítem");
    }

    if (
      body.observations !== undefined &&
      typeof body.observations !== "string"
    ) {
      return apiError("Las observaciones no son válidas");
    }
    const observations =
      typeof body.observations === "string"
        ? body.observations.trim().slice(0, 2000)
        : "";
    const configuredThreshold = Number(
      process.env.DISCREPANCY_THRESHOLD_PERCENT ?? "2"
    );
    const threshold = Number.isFinite(configuredThreshold)
      ? configuredThreshold
      : 2;

    const result = await prisma.$transaction(async (tx) => {
      let hasDiscrepancy = false;
      const discrepancies: Prisma.DiscrepancyCreateManyInput[] = [];

      for (const item of order.items) {
        const receivedQuantity = receivedById.get(item.id)!;
        await tx.orderItem.update({
          where: { id: item.id },
          data: { receivedQuantity },
        });

        const { percentage, severity } = calculateDiscrepancy(
          item.declaredQuantity,
          receivedQuantity
        );
        if (percentage > threshold && severity) {
          hasDiscrepancy = true;
          discrepancies.push({
            orderId: params.id,
            orderItemId: item.id,
            materialType: item.materialName,
            declaredQuantity: item.declaredQuantity,
            receivedQuantity,
            differencePercent: percentage,
            severity,
            detectedById: session.user.id,
            description: `Diferencia de ${percentage.toFixed(1)}% en ${item.materialName}`,
          });
        }
      }

      const updated = await tx.pickupOrder.update({
        where: { id: params.id },
        data: {
          status: hasDiscrepancy ? "DISCREPANCIA" : "RECIBIDA",
          deliveredAt: new Date(),
          ...(observations ? { notes: observations } : {}),
        },
      });

      if (discrepancies.length > 0) {
        await tx.discrepancy.createMany({ data: discrepancies });
      }
      return updated;
    });

    return NextResponse.json(result);
  }

  if (body.signatureDataUrl !== undefined) {
    if (
      session.user.role !== "ADMIN" &&
      (session.user.role !== "CHOFER" || session.user.id !== order.driverId)
    ) {
      return apiError("Acceso denegado", 403);
    }
    if (order.status !== "EN_RETIRO")
      return apiError("La orden ya no está en etapa de retiro", 409);
    if (typeof body.signatureDataUrl !== "string")
      return apiError("La firma no es válida");
    if (
      typeof body.clientSignerName !== "string" ||
      !body.clientSignerName.trim()
    ) {
      return apiError("El nombre del firmante es requerido");
    }

    const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      body.signatureDataUrl
    );
    if (!match) return apiError("La firma no es válida");
    const buffer = Buffer.from(match[1], "base64");
    if (buffer.length === 0 || buffer.length > MAX_SIGNATURE_BYTES) {
      return apiError("La firma supera el tamaño máximo permitido", 413);
    }
    if (buffer.toString("base64") !== match[1])
      return apiError("La firma no es válida");

    const filename = `firma_${params.id}_${Date.now()}.png`;
    let signaturePath: string;
    if (IS_VERCEL) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`firmas/${filename}`, buffer, {
        access: "public",
        contentType: "image/png",
      });
      signaturePath = blob.url;
    } else {
      const { writeFile } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = process.env.UPLOAD_DIR ?? "./public/uploads";
      await writeFile(join(process.cwd(), uploadDir, filename), buffer);
      signaturePath = `/uploads/${filename}`;
    }

    const updated = await prisma.pickupOrder.update({
      where: { id: params.id },
      data: {
        signatureImagePath: signaturePath,
        clientSignerName: body.clientSignerName.trim().slice(0, 120),
      },
    });
    return NextResponse.json(updated);
  }

  if (body.items !== undefined) {
    if (!canEditPickupItems(session.user, order.driverId, order.status)) {
      return apiError("No puedes editar los ítems de esta orden", 403);
    }
    if (
      !Array.isArray(body.items) ||
      body.items.length === 0 ||
      body.items.length > 100
    ) {
      return apiError("La lista de ítems no es válida");
    }

    const items: {
      materialTypeId: string;
      declaredQuantity: number;
      unit: string;
    }[] = [];
    for (const value of body.items) {
      if (
        !isJsonObject(value) ||
        typeof value.materialTypeId !== "string" ||
        !value.materialTypeId.trim() ||
        typeof value.declaredQuantity !== "number" ||
        !Number.isFinite(value.declaredQuantity) ||
        value.declaredQuantity <= 0 ||
        typeof value.unit !== "string" ||
        !value.unit.trim() ||
        value.unit.length > 32
      ) {
        return apiError("Hay ítems con datos inválidos");
      }
      items.push({
        materialTypeId: value.materialTypeId,
        declaredQuantity: value.declaredQuantity,
        unit: value.unit.trim(),
      });
    }

    const materialIds = Array.from(
      new Set(items.map((item) => item.materialTypeId))
    );
    const materials = await prisma.materialType.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true },
    });
    if (materials.length !== materialIds.length)
      return apiError("Tipo de material inválido");
    const materialNames = new Map(
      materials.map((material) => [material.id, material.name])
    );

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: params.id } });
      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: params.id,
          materialTypeId: item.materialTypeId,
          materialName: materialNames.get(item.materialTypeId)!,
          declaredQuantity: item.declaredQuantity,
          unit: item.unit,
        })),
      });
    });

    const updated = await prisma.pickupOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    return NextResponse.json(updated);
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !isOrderStatus(body.status)) {
      return apiError("Estado de orden inválido");
    }
    if (
      !canUpdatePickupStatus(
        session.user,
        order.driverId,
        order.status,
        body.status
      )
    ) {
      return apiError("No puedes cambiar la orden a ese estado", 403);
    }

    const hasLat = body.lat !== undefined;
    const hasLng = body.lng !== undefined;
    const lat = body.lat;
    const lng = body.lng;
    if (hasLat !== hasLng) return apiError("Debe enviar ambas coordenadas");
    if (
      (hasLat && !validCoordinate(lat, -90, 90)) ||
      (hasLng && !validCoordinate(lng, -180, 180))
    ) {
      return apiError("Coordenadas inválidas");
    }

    const updated = await prisma.pickupOrder.update({
      where: { id: params.id },
      data: {
        status: body.status,
        ...(body.status === "EN_TRANSITO" ? { pickupAt: new Date() } : {}),
        ...(body.status === "RECIBIDA" || body.status === "DISCREPANCIA"
          ? { deliveredAt: new Date() }
          : {}),
        ...(hasLat
          ? { pickupLat: lat as number, pickupLng: lng as number }
          : {}),
      },
    });
    return NextResponse.json(updated);
  }

  return apiError("Acción no reconocida");
}
