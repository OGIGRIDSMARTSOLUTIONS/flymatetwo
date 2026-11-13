export type Shipment = { route: string; goods: string; events: string[] };

export const sampleRef = "FM-24018";
export const initialShipments: Record<string, Shipment> = {
  [sampleRef]: {
    route: "Lagos → London",
    goods: "Printed brochures · 2.5 kg · International",
    events: [
      "Booking confirmed",
      "Courier identity verified",
      "Parcel picked up",
      "Export clearance recorded",
      "Arrived at destination",
      "Ready for recipient handoff",
    ],
  },
};
