import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const shipment = z.strictObject({
  origin: z.string().trim().min(1).max(160),
  destination: z.string().trim().min(1).max(160),
  weight: z.number().positive().max(10000),
  weightUnit: z.enum(["kg", "lbs"]),
  size: z.string().trim().min(1).max(100),
  category: z.enum(["Gift", "Documents", "Electronics", "Food", "Other"]),
  contents: z.string().trim().min(1).max(2000),
  offerMinor: z.number().int().positive().max(100_000_000),
  currency: z.literal("USD"),
});

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(request, limit) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      request.resume();
      throw new RequestError(413, "Request body is too large.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function matchesToken(header, expected) {
  const supplied = Buffer.from(header ?? "");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function createDraftHandler({
  repository,
  uploadPhoto,
  senderId,
  token,
  photoLimit,
  photoDownloadUrl,
  webOrigin,
}) {
  const expected = Buffer.from("Bearer " + token);
  const base = "/api/shipment-drafts";

  return async (request, response) => {
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

    function withPhoto(draft) {
      return draft.photo
        ? { ...draft, photoUrl: photoDownloadUrl(draft.photo) }
        : draft;
    }

    function send(status, body) {
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
      if (!matchesToken(request.headers.authorization, expected)) {
        return send(401, { error: "Authorization required." });
      }
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
        error?.code ?? error?.name ?? "unknown",
      );
      return send(500, { error: "Could not complete the draft request." });
    }
  };
}
