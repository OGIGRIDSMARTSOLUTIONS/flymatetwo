import { open } from "node:fs/promises";
import {
  maxPackagePhotoBytes,
  optimizePackagePhoto,
} from "./optimizePackagePhoto.mjs";
import { uploadPackagePhoto } from "./cloudinaryPackagePhotos.mjs";

const [path, flag] = process.argv.slice(2);

if (!path || (flag && flag !== "--upload")) {
  throw new Error("Usage: npm run photo:check -- <image-path> [--upload]");
}

const file = await open(path, "r");
try {
  const { size } = await file.stat();
  if (size < 1 || size > maxPackagePhotoBytes) {
    throw new RangeError("Choose a package photo up to 10 MB.");
  }

  const buffer = Buffer.alloc(size);
  const { bytesRead } = await file.read(buffer);
  const input = buffer.subarray(0, bytesRead);

  if (flag === "--upload") {
    console.log(await uploadPackagePhoto(input));
  } else {
    const { width, height, bytes } = await optimizePackagePhoto(input);
    console.log({ width, height, bytes, format: "webp" });
  }
} finally {
  await file.close();
}
