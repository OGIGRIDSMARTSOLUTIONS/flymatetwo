import { useEffect, useState } from "react";
import { ChatError, chatApi } from "./chatApi";
import { useChatActivity } from "./useChatActivity";

const readListeners = new Set<() => void>();
export function notifyChatRead() {
  for (const listener of readListeners) listener();
}

export function useUnreadChats(token?: string) {
  const active = useChatActivity();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let queued = false;
    async function update() {
      if (!token || controller.signal.aborted) return;
      if (running) {
        queued = true;
        return;
      }
      clearTimeout(timer);
      running = true;
      let retry = true;
      try {
        const result = await chatApi.unread(token, controller.signal);
        if (!controller.signal.aborted) setIds(result.shipmentIds);
      } catch (error) {
        if (error instanceof ChatError && error.status === 401) {
          retry = false;
          if (!controller.signal.aborted) setIds([]);
        }
      } finally {
        running = false;
        if (retry && !controller.signal.aborted) {
          timer = setTimeout(update, queued ? 0 : 4_000);
          queued = false;
        }
      }
    }
    readListeners.add(update);
    void update();
    return () => {
      readListeners.delete(update);
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, token]);

  return token ? ids : [];
}
