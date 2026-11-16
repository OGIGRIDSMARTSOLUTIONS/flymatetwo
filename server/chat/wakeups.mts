import type { ServerResponse } from "node:http";

export function createChatWakeups() {
  const listeners = new Map<string, Set<() => void>>();

  return {
    watch(id: string, response: ServerResponse) {
      const group = listeners.get(id) ?? new Set<() => void>();
      listeners.set(id, group);
      let finish: () => void = () => {};
      const ready = new Promise<void>((resolve) => {
        const timer = setTimeout(() => finish(), 18_000);
        finish = () => {
          clearTimeout(timer);
          group.delete(finish);
          if (group.size === 0 && listeners.get(id) === group)
            listeners.delete(id);
          response.off("close", finish);
          resolve();
        };
        group.add(finish);
        response.once("close", finish);
        if (response.destroyed) finish();
      });
      return { ready, cancel: finish };
    },
    notify(id: string) {
      for (const resolve of listeners.get(id) ?? []) resolve();
    },
  };
}
