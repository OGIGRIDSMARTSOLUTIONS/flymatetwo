import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createDraftRepository } from "./drafts/repository.mjs";
import { createDraftHandler } from "./drafts/handler.mjs";
import {
  createPhotoDownloadUrl,
  uploadPackagePhoto,
} from "./photos/cloudinaryPackagePhotos.mjs";
import { maxPackagePhotoBytes } from "./photos/optimizePackagePhoto.mjs";

const {
  DATABASE_URL,
  FLYMATE_DEV_TOKEN,
  FLYMATE_DEV_SENDER = "local-sender",
  PORT = "5050",
  HOST = "127.0.0.1",
  FLYMATE_WEB_ORIGIN = "http://localhost:8081",
} = process.env;
if (!DATABASE_URL || !FLYMATE_DEV_TOKEN || FLYMATE_DEV_TOKEN.length < 32) {
  throw new Error(
    "Set DATABASE_URL and a random FLYMATE_DEV_TOKEN of at least 32 characters.",
  );
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  query_timeout: 10_000,
});
pool.on("error", (error) =>
  console.error("Database connection lost:", error.code),
);
await pool.query(
  await readFile(
    new URL("./db/001_shipment_drafts.sql", import.meta.url),
    "utf8",
  ),
);

const server = createServer(
  createDraftHandler({
    repository: createDraftRepository(pool),
    uploadPhoto: uploadPackagePhoto,
    photoLimit: maxPackagePhotoBytes,
    photoDownloadUrl: createPhotoDownloadUrl,
    webOrigin: FLYMATE_WEB_ORIGIN,
    senderId: FLYMATE_DEV_SENDER,
    token: FLYMATE_DEV_TOKEN,
  }),
);

server.listen(Number(PORT), HOST, () => {
  console.log(`FlyMate draft API listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => void pool.end()));
}
