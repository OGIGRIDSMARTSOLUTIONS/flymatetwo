import type { Status } from "./deliveryApi";

export const shipmentTabs = ["Active", "In Transit", "Completed"] as const;
export type ShipmentTab = (typeof shipmentTabs)[number];

const tabsByStatus: Record<Status, ShipmentTab> = {
  Published: "Active",
  Matched: "Active",
  "Picked up": "In Transit",
  "In transit": "In Transit",
  Delivered: "Completed",
};

export function shipmentTab(status: Status) {
  return tabsByStatus[status];
}
