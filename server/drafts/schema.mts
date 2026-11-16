import { z } from "zod";

export const shipment = z.strictObject({
  title: z.string().trim().min(1).max(120).optional(),
  pickupMethod: z.enum(["airport", "public-spot"]).optional(),
  preferredDate: z.iso.date().optional(),
  origin: z.string().trim().min(1).max(160),
  destination: z.string().trim().min(1).max(160),
  weight: z.number().positive().max(10000),
  weightUnit: z.enum(["kg", "lbs"]),
  size: z.string().trim().min(1).max(100),
  category: z.enum([
    "Gift",
    "Clothing",
    "Documents",
    "Electronics",
    "Food",
    "Other",
  ]),
  contents: z.string().trim().min(1).max(2000),
  offerMinor: z.number().int().positive().max(100_000_000),
  currency: z.literal("USD"),
});
