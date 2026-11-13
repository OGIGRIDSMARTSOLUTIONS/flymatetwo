import { Platform } from "react-native";
import type { RateQuote, RateRequest } from "./types";

export async function getRate(request: RateRequest): Promise<RateQuote> {
  const baseUrl = Platform.OS === "web"
    ? ""
    : (process.env.EXPO_PUBLIC_API_URL || "https://flymatetwo.vercel.app").replace(/\/$/, "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(baseUrl + "/api/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("The rates API is unavailable. Check your deployment and try again.");
    }
    if (!response.ok) {
      const body: { error?: string } = await response.json();
      throw new Error(body.error || "Unable to get a rate.");
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
