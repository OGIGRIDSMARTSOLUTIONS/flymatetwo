import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { readBody, RequestError } from "../http/request.mts";
import type { createAccounts } from "./accounts.mts";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const login = z.strictObject({ email, password: z.string().min(1).max(128) });
const register = login.extend({
  role: z.enum(["sender", "traveler"]),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/),
  password: z.string().min(12).max(128),
});

export function createAuthHandler(
  accounts: ReturnType<typeof createAccounts>,
  webOrigin: string,
) {
  const attempts = new Map<string, { expires: number; count: number }>();
  return async (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;
    if (origin === webOrigin) {
      res.setHeader("Access-Control-Allow-Origin", webOrigin);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Vary", "Origin");
    }
    function send(status: number, body: unknown) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    }
    if (req.method === "OPTIONS" && origin === webOrigin) {
      res.writeHead(204).end();
      return;
    }
    const path = req.url?.split("?")[0];
    if (req.method !== "POST")
      return send(405, { error: "Use POST for account requests." });

    try {
      if (path === "/api/auth/logout") {
        await accounts.logout(req.headers.authorization);
        return send(200, { ok: true });
      }
      const now = Date.now();
      for (const [key, entry] of attempts) {
        if (entry.expires <= now) attempts.delete(key);
      }
      const address = req.socket.remoteAddress ?? "unknown";
      const entry = attempts.get(address) ?? {
        count: 0,
        expires: now + 60_000,
      };
      if (++entry.count > 12)
        return send(429, {
          error: "Too many attempts. Try again in a minute.",
        });
      attempts.set(address, entry);

      const body = await readBody(req, 4096);
      let input: unknown;
      try {
        input = JSON.parse(body.toString("utf8"));
      } catch {
        return send(400, { error: "Send a valid account request." });
      }
      if (path === "/api/auth/register") {
        const parsed = register.safeParse(input);
        if (!parsed.success)
          return send(422, {
            error:
              "Check your name, email, international phone number and password (at least 12 characters).",
          });
        return send(201, await accounts.register(parsed.data));
      }
      if (path === "/api/auth/login") {
        const parsed = login.safeParse(input);
        if (!parsed.success)
          return send(422, { error: "Enter your email and password." });
        return send(
          200,
          await accounts.login(parsed.data.email, parsed.data.password),
        );
      }
      return send(404, { error: "Account route not found." });
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Account request failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, { error: "Could not complete the account request." });
    }
  };
}
