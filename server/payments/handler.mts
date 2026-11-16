import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import type { createAccounts } from "../auth/accounts.mts";
import { RequestError } from "../http/request.mts";
import type { createPaymentService } from "./service.mts";

export function createPaymentHandler(
  service: ReturnType<typeof createPaymentService>,
  authenticate: ReturnType<typeof createAccounts>["authenticate"],
  origin: string,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.headers.origin === origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
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
    function send(status: number, body: unknown) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    }
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401, { error: "Sign in to continue." });
      if (user.role !== "sender" || user.legacy)
        return send(403, { error: "A Sender account is required." });
      const path = req.url?.split("?")[0] ?? "";
      const match = /^\/api\/payments\/([^/]+)(?:\/(checkout|confirm))?$/.exec(
        path,
      );
      const id = match?.[1];
      const action = match?.[2];
      if (!id || !z.uuid().safeParse(id).success)
        return send(404, { error: "Payment route not found." });
      if (!action && req.method === "GET")
        return send(200, await service(user.id, id, "status"));
      if (
        (action === "checkout" || action === "confirm") &&
        req.method === "POST"
      )
        return send(200, await service(user.id, id, action));
      return send(405, { error: "Method unavailable." });
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Payment request failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, { error: "Could not complete the payment request." });
    }
  };
}
