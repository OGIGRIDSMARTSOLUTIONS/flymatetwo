import { useEffect, useState } from "react";
import { ChatError, chatApi, type Message } from "./chatApi";
import { useChatActivity } from "./useChatActivity";
import { notifyChatRead } from "./useUnreadChats";

function merge(current: Message[], incoming: Message[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()]
    .sort(
      (left, right) =>
        Date.parse(left.sent_at) - Date.parse(right.sent_at) ||
        left.id.localeCompare(right.id),
    )
    .slice(-100);
}

export function useShipmentMessages(token: string, id: string) {
  const active = useChatActivity();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Connecting to chat…");

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cursor: string | undefined;
    let readId: string | undefined;
    let delay = 1_000;

    async function watch() {
      try {
        const rows = await chatApi.load(token, id, cursor, controller.signal);
        if (controller.signal.aborted) return;
        setMessages((current) => merge(current, rows));
        setStatus("");
        cursor = rows.at(-1)?.id ?? "empty";
        if (cursor !== "empty" && readId !== cursor) {
          await chatApi.read(token, id, cursor, controller.signal);
          if (controller.signal.aborted) return;
          readId = cursor;
          notifyChatRead();
        }
        delay = 1_000;
        // Limit retries if a mismatched backend returns immediately without honoring the cursor.
        timer = setTimeout(watch, 250);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          error instanceof ChatError &&
          [401, 403, 404].includes(error.status)
        ) {
          setStatus(error.message);
          return;
        }
        setStatus("Chat disconnected. Reconnecting…");
        timer = setTimeout(watch, delay);
        delay = Math.min(delay * 2, 15_000);
      }
    }
    void watch();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, id, token]);

  return {
    messages,
    status,
    append: (message: Message) =>
      setMessages((current) => merge(current, [message])),
  };
}
