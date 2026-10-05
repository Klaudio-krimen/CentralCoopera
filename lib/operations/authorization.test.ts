import { describe, expect, it } from "vitest";
import {
  canAccessOrder,
  canCreatePickupOrder,
  canDeleteEvidence,
  canEditPickupItems,
  canListCompanies,
  canReceivePickupOrder,
  canUpdatePickupStatus,
  canUploadEvidence,
} from "./authorization";

const chofer = { id: "driver-1", role: "CHOFER", moduleAccess: [] };
const recepcion = { id: "receiver-1", role: "RECEPCION", moduleAccess: [] };
const admin = { id: "admin-1", role: "ADMIN", moduleAccess: [] };
const ventas = { id: "sales-1", role: "VENTAS", moduleAccess: ["CRM"] };
const supervisor = {
  id: "supervisor-1",
  role: "VENTAS",
  moduleAccess: ["CRM", "OPERACIONES"],
};

describe("autorizacion de operaciones", () => {
  it("solo permite consultar ordenes a roles operativos o con el modulo", () => {
    expect(canAccessOrder(chofer, chofer.id)).toBe(true);
    expect(canAccessOrder(recepcion, "driver-2")).toBe(true);
    expect(canAccessOrder(admin, "driver-2")).toBe(true);
    expect(canAccessOrder(ventas, "driver-2")).toBe(false);
    expect(canAccessOrder(supervisor, "driver-2")).toBe(true);
  });

  it("limita la consulta del chofer a sus propias ordenes", () => {
    expect(canAccessOrder(chofer, "driver-2")).toBe(false);
  });

  it("permite crear ordenes solo al chofer", () => {
    expect(canCreatePickupOrder(chofer)).toBe(true);
    expect(canCreatePickupOrder(admin)).toBe(false);
    expect(canCreatePickupOrder(supervisor)).toBe(false);
  });

  it("permite recibir a RECEPCION y ADMIN, nunca a Ventas", () => {
    expect(canReceivePickupOrder(recepcion)).toBe(true);
    expect(canReceivePickupOrder(admin)).toBe(true);
    expect(canReceivePickupOrder(supervisor)).toBe(false);
  });

  it("solo edita items en retiro el chofer propietario o ADMIN", () => {
    expect(canEditPickupItems(chofer, chofer.id, "EN_RETIRO")).toBe(true);
    expect(canEditPickupItems(chofer, "driver-2", "EN_RETIRO")).toBe(false);
    expect(canEditPickupItems(chofer, chofer.id, "EN_TRANSITO")).toBe(false);
    expect(canEditPickupItems(admin, "driver-2", "EN_RETIRO")).toBe(true);
    expect(canEditPickupItems(supervisor, "driver-2", "EN_RETIRO")).toBe(false);
  });

  it("solo permite al chofer propietario iniciar transito desde retiro", () => {
    expect(
      canUpdatePickupStatus(chofer, chofer.id, "EN_RETIRO", "EN_TRANSITO")
    ).toBe(true);
    expect(
      canUpdatePickupStatus(chofer, "driver-2", "EN_RETIRO", "EN_TRANSITO")
    ).toBe(false);
    expect(
      canUpdatePickupStatus(chofer, chofer.id, "EN_TRANSITO", "CERRADA")
    ).toBe(false);
    expect(
      canUpdatePickupStatus(supervisor, "driver-2", "EN_RETIRO", "EN_TRANSITO")
    ).toBe(false);
  });

  it("solo habilita evidencia de retiro al chofer propietario durante el retiro", () => {
    expect(canUploadEvidence(chofer, chofer.id, "EN_RETIRO", "RETIRO")).toBe(
      true
    );
    expect(canUploadEvidence(chofer, "driver-2", "EN_RETIRO", "RETIRO")).toBe(
      false
    );
    expect(canUploadEvidence(chofer, chofer.id, "EN_TRANSITO", "RETIRO")).toBe(
      false
    );
    expect(
      canUploadEvidence(supervisor, "driver-2", "EN_RETIRO", "RETIRO")
    ).toBe(false);
  });

  it("reserva evidencia de recepcion a RECEPCION en transito y ADMIN", () => {
    expect(
      canUploadEvidence(recepcion, "driver-2", "EN_TRANSITO", "RECEPCION")
    ).toBe(true);
    expect(
      canUploadEvidence(recepcion, "driver-2", "EN_RETIRO", "RECEPCION")
    ).toBe(false);
    expect(
      canUploadEvidence(supervisor, "driver-2", "EN_TRANSITO", "RECEPCION")
    ).toBe(false);
    expect(
      canUploadEvidence(admin, "driver-2", "EN_TRANSITO", "RECEPCION")
    ).toBe(true);
    expect(canUploadEvidence(admin, "driver-2", "CERRADA", "RECEPCION")).toBe(
      false
    );
  });

  it("limita borrado de evidencia al ADMIN o al chofer propietario antes del despacho", () => {
    expect(canDeleteEvidence(admin, "driver-2", "receiver-1", "RECIBIDA")).toBe(
      true
    );
    expect(canDeleteEvidence(chofer, chofer.id, chofer.id, "EN_RETIRO")).toBe(
      true
    );
    expect(canDeleteEvidence(chofer, chofer.id, chofer.id, "EN_TRANSITO")).toBe(
      false
    );
    expect(
      canDeleteEvidence(recepcion, "driver-2", recepcion.id, "EN_TRANSITO")
    ).toBe(false);
    expect(
      canDeleteEvidence(supervisor, "driver-2", supervisor.id, "EN_RETIRO")
    ).toBe(false);
  });

  it("permite listado minimo de empresas a chofer y listado CRM a usuarios autorizados", () => {
    expect(canListCompanies(chofer)).toBe(true);
    expect(canListCompanies(admin)).toBe(true);
    expect(canListCompanies(ventas)).toBe(true);
    expect(canListCompanies(recepcion)).toBe(false);
  });
});
