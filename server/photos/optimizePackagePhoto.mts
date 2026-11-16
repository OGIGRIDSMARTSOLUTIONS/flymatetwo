import sharp from "sharp";

export const maxPackagePhotoBytes = 10 * 1024 * 1024;
const maxInputPixels = 32_000_000;
const maxEdge = 1_600;
const supportedFormats = new Set(["jpeg", "png", "webp", "heif"]);

export async function optimizePackagePhoto(input: Buffer) {
  if (
    !Buffer.isBuffer(input) ||
    !input.length ||
    input.length > maxPackagePhotoBytes
  ) {
    throw new RangeError("Choose a package photo up to 10 MB.");
  }

  const image = sharp(input, { limitInputPixels: maxInputPixels });
  const metadata = await image.metadata();

  if (
    !supportedFormats.has(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new Error("Choose a supported still package photo.");
  }

  const { data, info } = await image
    .autoOrient()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  return { data, width: info.width, height: info.height, bytes: info.size };
}
