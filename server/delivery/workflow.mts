import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { RequestError } from "../http/request.mts";

export type Role = "sender" | "traveler";
type Status =
  "Published" | "Matched" | "Picked up" | "In transit" | "Delivered";

export type Delivery = {
  status: Status;
  offerMinor?: number;
  offerAt?: string;
  offers?: Record<string, { amount: number; at: string; name?: string }>;
  travelerId?: string;
  attempts: number;
  confirmedAt?: string;
  paymentRequired?: boolean;
  timeline: { status: Status; at: string }[];
};

export const commandSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("publish"),
    confirmed: z.literal(true).optional(),
  }),
  z.strictObject({
    action: z.literal("offer"),
    amount: z.number().int().positive().max(100_000_000),
  }),
  z.strictObject({
    action: z.literal("accept"),
    travelerId: z.union([z.uuid(), z.literal("legacy-traveler")]).optional(),
    amount: z.number().int().positive(),
  }),
  z.strictObject({
    action: z.literal("pickup"),
    code: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{8}$/),
  }),
  z.strictObject({ action: z.literal("transit") }),
  z.strictObject({
    action: z.literal("deliver"),
    code: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{8}$/),
  }),
  z.strictObject({ action: z.literal("resetAttempts") }),
]);

type Command = z.infer<typeof commandSchema>;

export function handoffCode(
  key: string,
  id: string,
  stage: "pickup" | "deliver",
) {
  return createHmac("sha256", key)
    .update(`${id}:${stage}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

export function applyCommand(
  role: Role,
  current: Delivery | null,
  command: Command,
  id: string,
  key: string,
  travelerId = "legacy-traveler",
  travelerName?: string,
): { delivery: Delivery; error?: string } {
  const now = new Date().toISOString();
  function advance(status: Status) {
    return {
      ...current,
      status,
      attempts: 0,
      timeline: [...(current?.timeline ?? []), { status, at: now }],
    };
  }

  switch (command.action) {
    case "publish":
      if (role === "sender" && !current)
        return {
          delivery: {
            ...advance("Published"),
            confirmedAt: command.confirmed ? now : undefined,
          },
        };
      break;
    case "offer":
      if (role === "traveler" && current?.status === "Published") {
        return {
          delivery: {
            ...current,
            offers: {
              ...current.offers,
              [travelerId]: {
                amount: command.amount,
                at: now,
                name: travelerName,
              },
            },
          },
        };
      }
      break;
    case "accept": {
      const selected = command.travelerId ?? "legacy-traveler";
      const offer = current?.offers?.[selected];
      if (
        role === "sender" &&
        current?.status === "Published" &&
        (offer?.amount ??
          (selected === "legacy-traveler" ? current.offerMinor : undefined)) ===
          command.amount
      ) {
        return {
          delivery: {
            ...advance("Matched"),
            travelerId: selected,
            offerMinor: command.amount,
          },
        };
      }
      break;
    }
    case "transit":
      if (
        role === "traveler" &&
        current?.status === "Picked up" &&
        (current.travelerId ?? "legacy-traveler") === travelerId
      )
        return { delivery: advance("In transit") };
      break;
    case "pickup":
    case "deliver": {
      const required = command.action === "pickup" ? "Matched" : "In transit";
      if (
        role !== "traveler" ||
        current?.status !== required ||
        (current.travelerId ?? "legacy-traveler") !== travelerId
      )
        break;
      if (current.attempts >= 5)
        throw new RequestError(429, "Ask the sender to unlock this handoff.");
      const valid = timingSafeEqual(
        Buffer.from(command.code.toUpperCase()),
        Buffer.from(handoffCode(key, id, command.action)),
      );
      if (valid)
        return {
          delivery: advance(
            command.action === "pickup" ? "Picked up" : "Delivered",
          ),
        };
      return {
        delivery: { ...current, attempts: current.attempts + 1 },
        error: "Incorrect handoff code.",
      };
    }
    case "resetAttempts":
      if (role === "sender" && current && current.attempts >= 5) {
        return { delivery: { ...current, attempts: 0 } };
      }
      break;
  }

  throw new RequestError(
    409,
    "This action is unavailable at the current shipment stage.",
  );
}
