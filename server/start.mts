import { createStripeTestCheckout } from "./payments/stripe.mts";
import { createPaymentService } from "./payments/service.mts";
import { createPaymentHandler } from "./payments/handler.mts";
import { createOperationsHandler } from "./operations/handler.mts";
import { createAccountMedia } from "./account/media.mts";
import { createAccountHandler } from "./account/handler.mts";
import { createChatHandler } from "./chat/handler.mts";
import { createAccounts } from "./auth/accounts.mts";
import { createAuthHandler } from "./auth/handler.mts";
import { createDeliveryHandler } from "./delivery/handler.mts";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createDraftRepository } from "./drafts/repository.mts";
import { createDraftHandler } from "./drafts/handler.mts";
import {
  createPhotoDownloadUrl,
  uploadPackagePhoto,
  removePhoto,
} from "./photos/cloudinaryPackagePhotos.mts";
import { maxPackagePhotoBytes } from "./photos/optimizePackagePhoto.mts";

const {
  DATABASE_URL,
  FLYMATE_DEV_TOKEN,
  FLYMATE_HANDOFF_SECRET = FLYMATE_DEV_TOKEN,
  FLYMATE_TRAVELER_TOKEN,
  FLYMATE_KYC_UPLOADS,
  STRIPE_TEST_SECRET_KEY,
  FLYMATE_DEV_SENDER = "local-sender",
  PORT = "5050",
  HOST = "127.0.0.1",
  FLYMATE_WEB_ORIGIN = "http://localhost:8081",
  FLYMATE_OPERATIONS_ORIGIN = "http://localhost:5173",
} = process.env;
if (
  !DATABASE_URL ||
  !FLYMATE_HANDOFF_SECRET ||
  FLYMATE_HANDOFF_SECRET.length < 32
) {
  throw new Error(
    "Set DATABASE_URL and a random FLYMATE_HANDOFF_SECRET of at least 32 characters.",
  );
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  query_timeout: 10_000,
});
pool.on("error", (error) =>
  console.error("Database connection lost:", error.name),
);
if (
  FLYMATE_TRAVELER_TOKEN &&
  (FLYMATE_TRAVELER_TOKEN.length < 32 ||
    FLYMATE_TRAVELER_TOKEN === FLYMATE_DEV_TOKEN)
) {
  throw new Error(
    "Use a separate random traveler token of at least 32 characters.",
  );
}

for (const migration of [
  "001_shipment_drafts.sql",
  "002_delivery.sql",
  "003_accounts.sql",
  "004_shipment_chat.sql",
  "005_account_media.sql",
  "006_operations.sql",
  "007_chat_reads.sql",
  "008_verification_review.sql",
  "009_test_payments.sql",
]) {
  await pool.query(
    await readFile(new URL(`./db/${migration}`, import.meta.url), "utf8"),
  );
}

const accounts = createAccounts(pool, {
  senderId: FLYMATE_DEV_SENDER,
  senderToken: FLYMATE_DEV_TOKEN,
  travelerToken: FLYMATE_TRAVELER_TOKEN,
});
const auth = createAuthHandler(accounts, FLYMATE_WEB_ORIGIN);
const drafts = createDraftHandler({
  repository: createDraftRepository(pool),
  uploadPhoto: uploadPackagePhoto,
  photoLimit: maxPackagePhotoBytes,
  photoDownloadUrl: createPhotoDownloadUrl,
  webOrigin: FLYMATE_WEB_ORIGIN,
  authenticate: accounts.authenticate,
});
const stripe = STRIPE_TEST_SECRET_KEY
  ? createStripeTestCheckout(STRIPE_TEST_SECRET_KEY, FLYMATE_WEB_ORIGIN)
  : undefined;
const payments = createPaymentHandler(
  createPaymentService(pool, stripe),
  accounts.authenticate,
  FLYMATE_WEB_ORIGIN,
);
const deliveries = createDeliveryHandler({
  pool,
  legacySenderId: FLYMATE_DEV_SENDER,
  handoffSecret: FLYMATE_HANDOFF_SECRET,
  testCheckoutEnabled: Boolean(stripe),
  photoDownloadUrl: createPhotoDownloadUrl,
  authenticate: accounts.authenticate,
  webOrigin: FLYMATE_WEB_ORIGIN,
});

const chat = createChatHandler(pool, accounts.authenticate, FLYMATE_WEB_ORIGIN);

const account = createAccountHandler(
  createAccountMedia({
    pool,
    upload: uploadPackagePhoto,
    remove: removePhoto,
    sign: createPhotoDownloadUrl,
    verificationEnabled: FLYMATE_KYC_UPLOADS === "true",
  }),
  accounts.authenticate,
  FLYMATE_WEB_ORIGIN,
);

const operations = createOperationsHandler(
  pool,
  FLYMATE_OPERATIONS_ORIGIN,
  FLYMATE_KYC_UPLOADS === "true",
);

const server = createServer((request, response) => {
  const path = request.url?.split("?")[0];
  if (path?.startsWith("/api/shipment-chat/")) return chat(request, response);
  if (path?.startsWith("/api/operations/"))
    return operations(request, response);
  if (path?.startsWith("/api/payments/")) return payments(request, response);
  if (path?.startsWith("/api/account/")) return account(request, response);
  if (path?.startsWith("/api/auth/")) return auth(request, response);
  return path === "/api/deliveries" || path?.startsWith("/api/deliveries/")
    ? deliveries(request, response)
    : drafts(request, response);
});

server.listen(Number(PORT), HOST, () => {
  console.log(`FlyMate draft API listening on http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => void pool.end()));
}
