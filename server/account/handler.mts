import type { IncomingMessage, ServerResponse } from "node:http";
import type { createAccounts } from "../auth/accounts.mts";
import { readBody, RequestError } from "../http/request.mts";
import { maxPackagePhotoBytes } from "../photos/optimizePackagePhoto.mts";
import { documentSlots, type createAccountMedia } from "./media.mts";

export function createAccountHandler(
  media: ReturnType<typeof createAccountMedia>,
  authenticate: ReturnType<typeof createAccounts>["authenticate"],
  webOrigin: string,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.headers.origin === webOrigin) {
      res.setHeader("Access-Control-Allow-Origin", webOrigin);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.writeHead(204).end();
        return;
      }
    }
    function send(status: number, data: unknown) {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    }
    try {
      const user = await authenticate(req.headers.authorization);
      if (!user) return send(401, { error: "Sign in to continue." });
      if (user.legacy)
        return send(403, {
          error: "Sign in with an email account to use account settings.",
        });
      const path = req.url?.split("?")[0];
      if (path === "/api/account/profile-photo") {
        if (req.method === "GET")
          return send(200, await media.profile(user.id));
        if (req.method === "PUT")
          return send(
            200,
            await media.saveProfile(
              user.id,
              await readBody(req, maxPackagePhotoBytes),
            ),
          );
      }
      if (path === "/api/account/earnings" && req.method === "GET") {
        if (user.role !== "traveler")
          return send(403, { error: "Traveler account required." });
        return send(200, await media.earnings(user.id));
      }
      if (path?.startsWith("/api/account/verification")) {
        if (user.role !== "traveler")
          return send(403, { error: "Traveler account required." });
        if (path === "/api/account/verification" && req.method === "GET")
          return send(200, await media.verification(user.id));
        if (
          path === "/api/account/verification/submit" &&
          req.method === "POST"
        )
          return send(200, await media.submit(user.id));
        const slot = documentSlots.find(
          (item) => path === "/api/account/verification/" + item,
        );
        if (slot && req.method === "PUT")
          return send(
            200,
            await media.saveDocument(
              user.id,
              slot,
              await readBody(req, maxPackagePhotoBytes),
            ),
          );
      }
      return send(404, { error: "Account route not found." });
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Account media request failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, {
        error:
          "Could not save or load the image. Use a supported photo under 10 MB and try again.",
      });
    }
  };
}
