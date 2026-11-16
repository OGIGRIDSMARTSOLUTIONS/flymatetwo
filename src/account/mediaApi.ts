import { uploadWithProgress } from "./uploadWithProgress";
import type { VerificationState } from "../../shared/operations";
import { File } from "expo-file-system";
import { Platform } from "react-native";
import { draftApiUrl } from "../sender/draftApi";

export const documentSlots = ["front", "back", "selfie"] as const;
export type DocumentSlot = (typeof documentSlots)[number];
export type Verification = {
  enabled: boolean;
  uploaded: DocumentSlot[];
  previewUrls?: Partial<Record<DocumentSlot, string>>;
  submittedAt: string | null;
  state: VerificationState;
  reason: string | null;
  canEdit: boolean;
  canSubmit: boolean;
  identityStatus: string;
  backgroundStatus: string;
};
export type Earnings = {
  totalMinor: number;
  items: { id: string; amount: number; at: string; destination: string }[];
};

async function request<T>(
  token: string,
  path: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${draftApiUrl}/api/account${path}`, {
    ...options,
    headers,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? "Account request failed.");
  return value as T;
}

async function readImage(uri: string) {
  return Platform.OS === "web"
    ? (await fetch(uri)).arrayBuffer()
    : new File(uri).arrayBuffer();
}

async function upload<T>(token: string, path: string, uri: string) {
  return request<T>(token, path, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: await readImage(uri),
  });
}

export const mediaApi = {
  profile: (token: string) =>
    request<{ photoUrl: string }>(token, "/profile-photo"),
  uploadProfile: (token: string, uri: string) =>
    upload<{ photoUrl: string }>(token, "/profile-photo", uri),
  verification: (token: string) =>
    request<Verification>(token, "/verification"),
  uploadDocument: async (
    token: string,
    slot: DocumentSlot,
    uri: string,
    signal: AbortSignal,
    onProgress: (percentage: number) => void,
  ) =>
    uploadWithProgress<Verification>({
      url: `${draftApiUrl}/api/account/verification/${slot}`,
      token,
      body: await readImage(uri),
      signal,
      onProgress,
    }),
  submit: (token: string) =>
    request<Verification>(token, "/verification/submit", { method: "POST" }),
  earnings: (token: string) => request<Earnings>(token, "/earnings"),
};
