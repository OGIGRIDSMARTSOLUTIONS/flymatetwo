import type { createAccounts, Principal } from "../auth/accounts.mts";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";
import { z } from "zod";
import type { PackageDetails, PhotoAsset } from "../drafts/types.mts";
import { readBody, RequestError } from "../http/request.mts";
import {
  applyCommand,
  commandSchema,
  handoffCode,
  type Delivery,
} from "./workflow.mts";

type Row = {
  sender_id?: string;
  photo?: PhotoAsset | null;
  paid?: boolean;
  id: string;
  package: PackageDetails;
  delivery: Delivery | null;
};

export function createDeliveryHandler({
  pool,
  legacySenderId,
  handoffSecret,
  authenticate,
  webOrigin,
  photoDownloadUrl,
  testCheckoutEnabled = false,
}: {
  pool: Pool;
  legacySenderId: string;
  handoffSecret: string;
  authenticate: ReturnType<typeof createAccounts>["authenticate"];
  webOrigin: string;
  testCheckoutEnabled?: boolean;
  photoDownloadUrl?: (photo: PhotoAsset) => string;
}) {
  const base = "/api/deliveries";

  function canView(row: Row, user: Principal) {
    return user.role === "sender"
      ? row.sender_id === user.id
      : Boolean(user.legacy) === (row.sender_id === legacySenderId) &&
          row.delivery &&
          (row.delivery.status === "Published" ||
            (row.delivery.travelerId ?? "legacy-traveler") === user.id);
  }

  const paymentProjection = `EXISTS (SELECT 1 FROM flymate_test_payments p
    WHERE p.shipment_id = shipment_drafts.id AND p.payment_status = 'confirmed') AS paid`;

  function present(row: Row, user: Principal) {
    const status = row.delivery?.status;
    return {
      id: row.id,
      testPaymentConfirmed: Boolean(row.paid),
      package: row.package,
      delivery: row.delivery && {
        ...row.delivery,
        offers: user.role === "sender" ? row.delivery.offers : undefined,
        offerMinor:
          user.role === "traveler" && status === "Published"
            ? row.delivery.offers?.[user.id]?.amount
            : row.delivery.offerMinor,
      },
      code:
        user.role === "sender" &&
        (status === "In transit" ||
          (status === "Matched" &&
            (!row.delivery?.paymentRequired || row.paid)))
          ? handoffCode(
              handoffSecret,
              row.id,
              status === "Matched" ? "pickup" : "deliver",
            )
          : undefined,
    };
  }

  return async (request: IncomingMessage, response: ServerResponse) => {
    const origin = request.headers.origin;
    if (origin === webOrigin) {
      response.setHeader("Access-Control-Allow-Origin", webOrigin);
      response.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
      response.setHeader("Vary", "Origin");
    }

    function send(status: number, body: unknown) {
      response.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(body));
    }

    try {
      if (request.method === "OPTIONS" && origin === webOrigin) {
        response.writeHead(204).end();
        return;
      }
      const user = await authenticate(request.headers.authorization);
      if (!user) return send(401, { error: "Authorization required." });
      const { role } = user;

      const path = request.url?.split("?")[0];
      if (request.method === "GET" && path === base) {
        const result =
          role === "sender"
            ? await pool.query<Row>(
                `SELECT id, package, delivery, ${paymentProjection} FROM shipment_drafts
               WHERE sender_id = $1 AND delivery IS NOT NULL
               ORDER BY updated_at DESC LIMIT 100`,
                [user.id],
              )
            : await pool.query<Row>(
                `SELECT id, package, delivery, ${paymentProjection} FROM shipment_drafts
               WHERE ($1::boolean = (sender_id = $2))
                 AND (delivery->>'status' = 'Published'
                   OR COALESCE(delivery->>'travelerId', 'legacy-traveler') = $3)
                 AND delivery IS NOT NULL
               ORDER BY updated_at DESC LIMIT 100`,
                [Boolean(user.legacy), legacySenderId, user.id],
              );
        return send(200, {
          role,
          shipments: result.rows.map((row) => present(row, user)),
        });
      }

      const id = path?.slice(base.length + 1);
      if (!id || !z.uuid().safeParse(id).success) {
        return send(404, { error: "Delivery route not found." });
      }
      if (request.method === "GET") {
        const {
          rows: [row],
        } = await pool.query<Row>(
          `SELECT sender_id, id, package, delivery, photo, ${paymentProjection} FROM shipment_drafts WHERE id = $1`,
          [id],
        );
        if (!row?.delivery || !canView(row, user))
          return send(404, { error: "Shipment not found." });
        return send(200, {
          ...present(row, user),
          photoUrl:
            row.photo && photoDownloadUrl ? photoDownloadUrl(row.photo) : "",
        });
      }
      if (request.method !== "PUT")
        return send(405, { error: "Method unavailable." });
      const body = await readBody(request, 4096);
      let input: unknown;
      try {
        input = JSON.parse(body.toString("utf8"));
      } catch {
        return send(400, { error: "Send a valid JSON body." });
      }
      const command = commandSchema.safeParse(input);
      if (!command.success)
        return send(422, {
          error: "Check the delivery action or handoff code.",
        });

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const {
          rows: [row],
        } = await client.query<Row>(
          `SELECT sender_id, id, package, delivery FROM shipment_drafts WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!row || !canView(row, user))
          throw new RequestError(404, "Shipment not found.");
        if (
          command.data.action === "publish" &&
          !user.legacy &&
          (!command.data.confirmed ||
            !row.package.title ||
            !row.package.pickupMethod ||
            !row.package.preferredDate)
        ) {
          throw new RequestError(
            422,
            "Complete and confirm the shipment details before publishing.",
          );
        }
        if (
          role === "sender" &&
          command.data.action === "publish" &&
          row.delivery
        ) {
          await client.query("COMMIT");
          return send(200, present(row, user));
        }
        if (command.data.action === "pickup" && row.delivery?.paymentRequired) {
          const { rows } = await client.query(
            "SELECT shipment_id FROM flymate_test_payments WHERE shipment_id = $1 AND payment_status = 'confirmed'",
            [id],
          );
          if (!rows.length)
            throw new RequestError(
              409,
              "The sender must confirm the test payment before pickup.",
            );
        }
        const result = applyCommand(
          role,
          row.delivery,
          command.data,
          id,
          handoffSecret,
          user.id,
          user.name,
        );
        if (
          command.data.action === "accept" &&
          testCheckoutEnabled &&
          !user.legacy
        ) {
          const acceptedReward = result.delivery.offerMinor ?? 0;
          if (acceptedReward + Math.round(acceptedReward * 0.15) < 50) {
            throw new RequestError(
              422,
              "Accept an offer with a checkout total of at least USD 0.50.",
            );
          }
          result.delivery.paymentRequired = true;
        }
        if (
          result.delivery.paymentRequired &&
          !result.error &&
          command.data.action === "deliver"
        ) {
          await client.query(
            `UPDATE flymate_test_payments SET settlement_eligible_at = now(), updated_at = now()
             WHERE shipment_id = $1 AND payment_status = 'confirmed'`,
            [id],
          );
        }
        await client.query(
          "UPDATE shipment_drafts SET delivery = $2, updated_at = now() WHERE id = $1",
          [id, result.delivery],
        );
        await client.query("COMMIT");
        return result.error
          ? send(422, { error: result.error })
          : send(200, present({ ...row, delivery: result.delivery }, user));
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Delivery request failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, { error: "Could not complete the delivery request." });
    }
  };
}
