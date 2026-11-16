import type { z } from "zod";
import type { shipment } from "./schema.mts";

export type PackageDetails = z.infer<typeof shipment>;

export type PhotoAsset = {
  assetId: string;
  publicId: string;
  version: number;
  format: string;
  width: number;
  height: number;
  bytes: number;
};

export type DraftRow = {
  id: string;
  package: PackageDetails;
  photo: PhotoAsset | null;
  created_at: Date;
  updated_at: Date;
};
