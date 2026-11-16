import { draftApiUrl } from "../sender/draftApi";
import type { Role } from "../sender/deliveryApi";

export type Message = {
  id: string;
  author_role: Role;
  body: string;
  sent_at: string;
};
export type PendingMessage = { id: string; body: string };

export class ChatError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  token: string,
  path: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${draftApiUrl}/api/shipment-chat/${path}`, {
    ...options,
    headers,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new ChatError(
      response.status,
      result?.error ?? "Could not update messages.",
    );
  return result as T;
}

export const chatApi = {
  load: (
    token: string,
    id: string,
    cursor: string | undefined,
    signal: AbortSignal,
  ) =>
    request<Message[]>(
      token,
      id + (cursor ? `?after=${encodeURIComponent(cursor)}` : ""),
      { signal },
    ),
  send: (token: string, id: string, message: PendingMessage) =>
    request<Message>(token, id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    }),
  unread: (token: string, signal: AbortSignal) =>
    request<{ shipmentIds: string[] }>(token, "unread", { signal }),
  read: (token: string, id: string, messageId: string, signal: AbortSignal) =>
    request<{ ok: boolean }>(
      token,
      `${id}/read?messageId=${encodeURIComponent(messageId)}`,
      {
        method: "POST",
        signal,
      },
    ),
};
