import { colors } from "../theme";

export type ShipmentSummary = {
  title: string;
  route: string;
  status: string;
  tint: string;
  detail?: string;
  expectedDate: string;
  deliveredAt?: string;
  destinationTimeZone?: string;
};

export const sampleShipments: ShipmentSummary[] = [
  {
    expectedDate: "2026-11-18",
    title: "Wedding gele + gifts",
    route: "ATL → LOS",
    status: "Matched with traveler",
    tint: colors.blueTint,
    detail: "4.5 lbs · offer $65",
  },
  {
    expectedDate: "2026-11-21",
    title: "Laptop + documents",
    route: "JFK → ABV",
    status: "Awaiting traveler",
    tint: colors.amberTint,
    detail: "6 lbs · offer $90",
  },
  {
    expectedDate: "2026-11-12",
    deliveredAt: "2026-11-12T17:42:00Z",
    destinationTimeZone: "Africa/Lagos",
    title: "Medication for mother",
    route: "IAD → LOS",
    status: "Delivered",
    tint: colors.greenTint,
  },
];
