import type { OperationShipment } from "../../shared/operations";

const oneHour = 60 * 60 * 1000;

export function shipmentAttention(shipment: OperationShipment, now: number) {
  if (shipment.status === "Delivered") return [];
  const reasons: string[] = [];
  if (shipment.handoffLocked) reasons.push("Handoff code locked");

  const awaitingPickup =
    shipment.status === "Published" || shipment.status === "Matched";
  const today = new Date(now).toISOString().slice(0, 10);
  if (
    awaitingPickup &&
    shipment.preferredDate &&
    shipment.preferredDate < today
  ) {
    reasons.push("Preferred pickup date passed");
  }

  const lastEvent = shipment.timeline.at(-1);
  const staleAfterHours = awaitingPickup ? 24 : 48;
  if (
    lastEvent &&
    now - Date.parse(lastEvent.at) >= staleAfterHours * oneHour
  ) {
    reasons.push(`No stage update in ${staleAfterHours} hours`);
  }
  return reasons;
}
