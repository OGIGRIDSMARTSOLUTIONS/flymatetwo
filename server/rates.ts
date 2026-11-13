import type { RateQuote, RateRequest } from "../src/rates/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositive(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

function isCity(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
}

export function isRateRequest(value: unknown): value is RateRequest {
  if (!isRecord(value)) return false;

  const { origin, destination, shipmentType, weight, unit, dimensionsCm } = value;
  if (!isCity(origin) || !isCity(destination)) return false;
  if (shipmentType !== "domestic" && shipmentType !== "international") return false;
  if (unit !== "kg" && unit !== "lb") return false;
  if (!isPositive(weight, 10000)) return false;
  if (dimensionsCm === undefined) return true;

  return isRecord(dimensionsCm)
    && isPositive(dimensionsCm.length, 500)
    && isPositive(dimensionsCm.width, 500)
    && isPositive(dimensionsCm.height, 500);
}

export interface RateProvider {
  quote(request: RateRequest): Promise<RateQuote>;
}

export const demoRateProvider: RateProvider = {
  async quote(request) {
    const actualKg = request.unit === "lb" ? request.weight * 0.45359237 : request.weight;
    const dimensions = request.dimensionsCm;
    const volumetricKg = dimensions
      ? dimensions.length * dimensions.width * dimensions.height / 5000
      : null;
    const billableKg = Math.ceil(Math.max(actualKg, volumetricKg ?? 0) * 2) / 2;
    const pricing = request.shipmentType === "domestic"
      ? { base: 1500, perKg: 850 }
      : { base: 12000, perKg: 6500 };

    return {
      source: "demo",
      currency: "NGN",
      amount: pricing.base + billableKg * pricing.perKg,
      actualKg,
      volumetricKg,
      billableKg,
    };
  },
};
