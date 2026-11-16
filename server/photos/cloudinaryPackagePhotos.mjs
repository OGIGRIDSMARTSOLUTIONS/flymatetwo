import { v2 as cloudinary } from "cloudinary";
import { optimizePackagePhoto } from "./optimizePackagePhoto.mjs";

export async function uploadPackagePhoto(input) {
  const image = await optimizePackagePhoto(input);
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Set CLOUDINARY_URL on the server before uploading.");
  }

  const asset = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated",
        public_id_prefix: "flymate/package-photos",
        overwrite: false,
        timeout: 30_000,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result);
        else reject(new Error("Cloudinary returned no asset."));
      },
    );
    stream.once("error", reject);
    stream.end(image.data);
  });

  return {
    assetId: asset.asset_id,
    publicId: asset.public_id,
    version: asset.version,
    format: asset.format,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
  };
}

export function createPhotoDownloadUrl(asset) {
  return cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: "image",
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 900,
  });
}
