import { createChatWakeups } from "./wakeups.mts";
import {
  markShipmentRead,
  participantFilter,
  unreadShipments,
} from "./reads.mts";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";
import { z } from "zod";
import type { createAccounts } from "../auth/accounts.mts";
import { readBody, RequestError } from "../http/request.mts";

const message = z.strictObject({
  id: z.uuid(),
  body: z.string().trim().min(1).max(1000),
});

export function createChatHandler(
  pool: Pool,
  authenticate: ReturnType<typeof createAccounts>["authenticate"],
  webOrigin: string,
) {
  const wakeups = createChatWakeups();
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.headers.origin === webOrigin) {
      res.setHeader("Access-Control-Allow-Origin", webOrigin);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.writeHead(204).end();
        return;
      }
    }

    function send(status: number, value: unknown) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(value));
    }

    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401, { error: "Authorization required." });
      const url = new URL(req.url ?? "/", "http://localhost");
      const route = url.pathname.slice("/api/shipment-chat/".length);
      if (route === "unread" && req.method === "GET") {
        return send(200, { shipmentIds: await unreadShipments(pool, user) });
      }
      const [id, action, ...extra] = route.split("/");
      if (
        !z.uuid().safeParse(id).success ||
        extra.length ||
        (action && action !== "read")
      )
        return send(404, { error: "Conversation not found." });
      const result = await pool.query(
        `SELECT d.id FROM shipment_drafts d WHERE d.id = $1 AND ${participantFilter}`,
        [id, user.role, user.id],
      );
      if (!result.rows[0])
        return send(404, { error: "Conversation not found." });

      if (action === "read" && req.method === "POST") {
        const messageId = url.searchParams.get("messageId");
        if (!z.uuid().safeParse(messageId).success)
          return send(422, { error: "Invalid message reference." });
        await markShipmentRead(pool, id, user, messageId!);
        return send(200, { ok: true });
      }
      if (action) return send(405, { error: "Method unavailable." });

      if (req.method === "GET") {
        async function latest() {
          const { rows } = await pool.query<{ id: string }>(
            `SELECT id, author_role, body, sent_at FROM flymate_shipment_messages
             WHERE shipment_id = $1 ORDER BY sent_at DESC, id DESC LIMIT 100`,
            [id],
          );
          return rows.reverse();
        }
        const after = url.searchParams.get("after");
        const watch =
          after === "empty" || z.uuid().safeParse(after).success
            ? wakeups.watch(id, res)
            : null;
        try {
          let rows = await latest();
          if (watch && (rows.at(-1)?.id ?? "empty") === after) {
            await watch.ready;
            if (res.destroyed) return;
            rows = await latest();
          }
          return send(200, rows);
        } finally {
          watch?.cancel();
        }
      }
      if (req.method !== "POST")
        return send(405, { error: "Method unavailable." });

      const bytes = await readBody(req, 8192);
      let input: unknown;
      try {
        input = JSON.parse(bytes.toString("utf8"));
      } catch {
        return send(400, { error: "Send a valid message." });
      }
      const parsed = message.safeParse(input);
      if (!parsed.success)
        return send(422, {
          error: "Enter a message of 1 to 1,000 characters.",
        });
      const submitted = await pool.query(
        `INSERT INTO flymate_shipment_messages (id, shipment_id, author_id, author_role, body)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
         WHERE flymate_shipment_messages.shipment_id = EXCLUDED.shipment_id
           AND flymate_shipment_messages.author_id = EXCLUDED.author_id
           AND flymate_shipment_messages.body = EXCLUDED.body
         RETURNING id, author_role, body, sent_at`,
        [parsed.data.id, id, user.id, user.role, parsed.data.body],
      );
      if (submitted.rows[0]) wakeups.notify(id);
      return submitted.rows[0]
        ? send(201, submitted.rows[0])
        : send(409, { error: "Message could not be saved." });
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Shipment chat failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, {
        error: "Could not load or update this conversation.",
      });
    }
  };
}
