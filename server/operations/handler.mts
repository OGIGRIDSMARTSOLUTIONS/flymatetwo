import { createVerificationReview, reviewInput } from "./verification.mts";
import { createPhotoDownloadUrl } from "../photos/cloudinaryPackagePhotos.mts";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";
import { z } from "zod";
import { readBody, RequestError } from "../http/request.mts";
import { loadOperationsSnapshot } from "./overview.mts";
import { createStaffSessions } from "./staff.mts";

const credentials = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(128),
});

export function createOperationsHandler(
  pool: Pool,
  webOrigin: string,
  documentUploadsEnabled: boolean,
  signReviewDocument = (asset: Parameters<typeof createPhotoDownloadUrl>[0]) =>
    createPhotoDownloadUrl(asset, 120),
) {
  const reviews = createVerificationReview(pool, signReviewDocument);
  const sessions = createStaffSessions(pool);
  const attempts = new Map<string, { count: number; expires: number }>();

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

    function send(status: number, body: unknown) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    }

    try {
      const path = req.url?.split("?")[0];
      if (path === "/api/operations/login" && req.method === "POST") {
        const now = Date.now();
        for (const [address, entry] of attempts) {
          if (entry.expires <= now) attempts.delete(address);
        }
        const address = req.socket.remoteAddress ?? "unknown";
        const entry = attempts.get(address) ?? {
          count: 0,
          expires: now + 60_000,
        };
        if (entry.count >= 8)
          return send(429, {
            error: "Too many attempts. Try again in a minute.",
          });
        entry.count++;
        attempts.set(address, entry);

        const body = await readBody(req, 4096);
        let input: unknown;
        try {
          input = JSON.parse(body.toString("utf8"));
        } catch {
          return send(400, { error: "Send a valid sign-in request." });
        }
        const parsed = credentials.safeParse(input);
        if (!parsed.success)
          return send(422, { error: "Enter your staff email and password." });
        return send(
          200,
          await sessions.login(parsed.data.email, parsed.data.password),
        );
      }
      const authorization = req.headers.authorization;
      const staff = await sessions.authorize(authorization);
      if (!staff) return send(401, { error: "Staff sign-in required." });
      if (path === "/api/operations/logout" && req.method === "POST") {
        await sessions.logout(authorization);
        return send(200, { ok: true });
      }
      if (path === "/api/operations/overview" && req.method === "GET") {
        return send(
          200,
          await loadOperationsSnapshot(pool, documentUploadsEnabled),
        );
      }
      const caseId = /^\/api\/operations\/verification\/([^/]+)$/.exec(
        path ?? "",
      )?.[1];
      if (caseId && z.uuid().safeParse(caseId).success) {
        if (req.method === "GET") return send(200, await reviews.open(caseId));
        if (req.method === "POST") {
          const bytes = await readBody(req, 4096);
          let input: unknown;
          try {
            input = JSON.parse(bytes.toString("utf8"));
          } catch {
            return send(400, { error: "Send a valid decision." });
          }
          const parsed = reviewInput.safeParse(input);
          if (!parsed.success)
            return send(422, {
              error:
                "Select a valid decision and enter a reason for rejection or a new upload.",
            });
          await reviews.decide(caseId, staff.id, parsed.data);
          return send(200, { ok: true });
        }
      }
      return send(404, { error: "Operations route not found." });
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Operations request failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, { error: "Could not load Operations. Please retry." });
    }
  };
}
