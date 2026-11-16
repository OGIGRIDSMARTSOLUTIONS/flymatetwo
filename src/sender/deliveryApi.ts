import { draftApiUrl } from "./draftApi";

export type Role = "sender" | "traveler";
export type Status =
  "Published" | "Matched" | "Picked up" | "In transit" | "Delivered";
export type Delivery = {
  id: string;
  package: {
    origin: string;
    destination: string;
    offerMinor: number;
    contents: string;
    title?: string;
    pickupMethod?: "airport" | "public-spot";
    preferredDate?: string;
    weight?: number;
    weightUnit?: string;
    size?: string;
    category?: string;
  };
  delivery: {
    status: Status;
    offerMinor?: number;
    paymentRequired?: boolean;
    offers?: Record<string, { amount: number; at: string; name?: string }>;
    attempts: number;
    timeline: { status: Status; at: string }[];
  };
  code?: string;
  testPaymentConfirmed?: boolean;
  photoUrl?: string;
};
export type DeliveryCommand =
  | { action: "publish"; confirmed: true }
  | { action: "transit" | "resetAttempts" }
  | { action: "offer" | "accept"; amount: number; travelerId?: string }
  | { action: "pickup" | "deliver"; code: string };

export function createDeliveryApi(token: string) {
  async function request<T>(path = "", command?: DeliveryCommand): Promise<T> {
    const response = await fetch(`${draftApiUrl}/api/deliveries${path}`, {
      method: command ? "PUT" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: command ? JSON.stringify(command) : undefined,
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "The delivery request failed.");
    return result as T;
  }

  return {
    open: (id: string) => request<Delivery>(`/${id}`),
    list: () => request<{ role: Role; shipments: Delivery[] }>(),
    act: (id: string, command: DeliveryCommand) =>
      request<Delivery>(`/${id}`, command),
  };
}
