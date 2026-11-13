export type WeightUnit = "kg" | "lb";
export type ShipmentType = "domestic" | "international";

export type RateRequest = {
  origin: string;
  destination: string;
  shipmentType: ShipmentType;
  weight: number;
  unit: WeightUnit;
  dimensionsCm?: { length: number; width: number; height: number };
};

export type RateQuote = {
  source: "demo";
  currency: "NGN";
  amount: number;
  actualKg: number;
  volumetricKg: number | null;
  billableKg: number;
};
