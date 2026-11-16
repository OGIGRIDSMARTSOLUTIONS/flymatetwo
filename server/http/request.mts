import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

export class RequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readBody(request: IncomingMessage, limit: number) {
  let size = 0;
  const chunks: Buffer[] = [];
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

export function matchesToken(header: string | undefined, expected: Buffer) {
  const supplied = Buffer.from(header ?? "");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
