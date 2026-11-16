import { draftErrorMessage } from "./draftErrors";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { type Draft, parseWeight, parseOffer } from "./draft";
import type { SavedDraft } from "./draftStorage";

export const draftApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(
  /\/+$/,
  "",
);

type ApiDraft = {
  id: string;
  updated_at: string;
  package: Omit<Draft, "weight" | "offer" | "photo"> & {
    weight: number;
    weightUnit: string;
    offerMinor: number;
  };
  photo?: object | null;
  photoUrl?: string;
};

export function createDraftApi(token: string) {
  async function request<T>(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${draftApiUrl}/api/shipment-drafts${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(draftErrorMessage(response.status, error));
    }

    return (await response.json()) as T;
  }

  function toSavedDraft(row: ApiDraft): SavedDraft {
    const {
      origin,
      destination,
      weight,
      weightUnit,
      size,
      category,
      contents,
      offerMinor,
    } = row.package;
    return {
      id: row.id,
      savedAt: row.updated_at,
      package: {
        title: row.package.title ?? "",
        pickupMethod: row.package.pickupMethod ?? "",
        preferredDate: row.package.preferredDate ?? "",
        origin,
        destination,
        size,
        category,
        contents,
        weight: `${weight} ${weightUnit}`,
        offer: (offerMinor / 100).toFixed(2),
        photo: row.photoUrl ?? "",
      },
    };
  }

  return {
    async list() {
      return (await request<ApiDraft[]>("")).map(toSavedDraft);
    },

    async open(id: string) {
      return toSavedDraft(await request<ApiDraft>(`/${id}`));
    },

    async save(id: string, draft: Draft, localPhoto: string) {
      const weight = parseWeight(draft.weight);
      const offer = parseOffer(draft.offer);
      if (!weight || offer === null)
        throw new Error("Check the weight and offer.");

      const row = await request<ApiDraft>(`/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title || undefined,
          pickupMethod: draft.pickupMethod || undefined,
          preferredDate: draft.preferredDate || undefined,
          origin: draft.origin,
          destination: draft.destination,
          weight: weight.value,
          weightUnit: weight.unit,
          size: draft.size,
          category: draft.category,
          contents: draft.contents,
          offerMinor: Math.round(offer * 100),
          currency: "USD",
        }),
      });

      if (!localPhoto || row.photo) return toSavedDraft(row);
      try {
        const body =
          Platform.OS === "web"
            ? await (await fetch(localPhoto)).arrayBuffer()
            : await new File(localPhoto).arrayBuffer();
        return toSavedDraft(
          await request<ApiDraft>(`/${id}/photo`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body,
          }),
        );
      } catch {
        throw new Error(
          "Package details saved. The photo upload failed. Tap Save draft to retry.",
        );
      }
    },
  };
}
