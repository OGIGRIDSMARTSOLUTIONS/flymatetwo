import type { createAccounts } from "../auth/accounts.mts";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DraftRow, PhotoAsset } from "./types.mts";
import type { createDraftRepository } from "./repository.mts";
import { shipment } from "./schema.mts";
import { readBody, RequestError } from "../http/request.mts";
import { z } from "zod";

export function createDraftHandler({
  repository,
  uploadPhoto,
  authenticate,
  photoLimit,
  photoDownloadUrl,
  webOrigin,
}: {
  repository: ReturnType<typeof createDraftRepository>;
  uploadPhoto: (input: Buffer) => Promise<PhotoAsset>;
  authenticate: ReturnType<typeof createAccounts>["authenticate"];
  photoLimit: number;
  photoDownloadUrl: (asset: PhotoAsset) => string;
  webOrigin: string;
}) {
  const base = "/api/shipment-drafts";

  return async (request: IncomingMessage, response: ServerResponse) => {
    const origin = request.headers.origin;
    if (webOrigin && origin === webOrigin) {
      response.setHeader("Access-Control-Allow-Origin", webOrigin);
      response.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
      response.setHeader("Vary", "Origin");
    }

    function withPhoto(draft: DraftRow) {
      return draft.photo
        ? { ...draft, photoUrl: photoDownloadUrl(draft.photo) }
        : draft;
    }

    function send(status: number, body: unknown) {
      response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(body));
    }

    try {
      const path = (request.url ?? "").split("?")[0];
      if (path !== base && !path.startsWith(base + "/")) {
        return send(404, { error: "Route not found." });
      }
      if (request.method === "OPTIONS" && webOrigin && origin === webOrigin) {
        response.writeHead(204).end();
        return;
      }
      const user = await authenticate(request.headers.authorization);
      if (!user) return send(401, { error: "Authorization required." });
      if (user.role !== "sender")
        return send(403, { error: "A sender account is required." });
      const senderId = user.id;
      if (path === base && request.method === "GET") {
        return send(200, await repository.list(senderId));
      }

      const [, id, resource, ...extra] = path.slice(base.length).split("/");
      if (!z.uuid().safeParse(id).success || extra.length) {
        return send(404, { error: "Draft not found." });
      }
      let draft;
      if (!resource && request.method === "GET") {
        draft = await repository.find(senderId, id);
      } else if (!resource && request.method === "PUT") {
        let input;
        try {
          input = JSON.parse(
            (await readBody(request, 32_768)).toString("utf8"),
          );
        } catch (error) {
          if (error instanceof RequestError) throw error;
          throw new RequestError(400, "Send a valid JSON body.");
        }
        const parsed = shipment.safeParse(input);
        if (!parsed.success) {
          if (
            parsed.error.issues.some(
              (issue) => issue.code === "unrecognized_keys",
            )
          ) {
            return send(422, {
              error:
                "The app and draft API use different shipment formats. Start the frontend and backend from the same FlyMate build.",
            });
          }
          return send(422, {
            error: "Check the shipment details.",
            fields: parsed.error.flatten().fieldErrors,
          });
        }
        draft = await repository.save(senderId, id, parsed.data);
      } else if (resource === "photo" && request.method === "PUT") {
        const input = await readBody(request, photoLimit);
        draft = await repository.attachPhoto(senderId, id, () =>
          uploadPhoto(input),
        );
      } else {
        return send(404, { error: "Route not found." });
      }

      return draft
        ? send(200, withPhoto(draft))
        : send(404, { error: "Draft not found." });
    } catch (error) {
      if (error instanceof RequestError)
        return send(error.status, { error: error.message });
      console.error(
        "Draft request failed:",
        error instanceof Error ? error.name : "unknown",
      );
      return send(500, { error: "Could not complete the draft request." });
    }
  };
}
