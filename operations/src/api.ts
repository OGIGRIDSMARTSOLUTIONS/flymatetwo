import type {
  OperationsSnapshot,
  StaffSession,
  VerificationCase,
  VerificationDecision,
} from "../../shared/operations";

const base = (
  import.meta.env.VITE_FLYMATE_API_URL ?? "http://127.0.0.1:5050"
).replace(/\/+$/, "");

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export { ApiError };

async function request<T>(
  path: string,
  { token, ...options }: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}/api/operations/${path}`, {
    ...options,
    headers,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      result?.error ?? "Operations request failed.",
    );
  if (!result) throw new Error("The server returned an unexpected response.");
  return result as T;
}

export const operationsApi = {
  login: (email: string, password: string) =>
    request<StaffSession>("login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  overview: (token: string, signal: AbortSignal) =>
    request<OperationsSnapshot>("overview", { token, signal }),
  verification: (token: string, id: string, signal: AbortSignal) =>
    request<VerificationCase>(`verification/${id}`, { token, signal }),
  decide: (
    token: string,
    id: string,
    body: { revision: number; decision: VerificationDecision; reason?: string },
  ) =>
    request<{ ok: boolean }>(`verification/${id}`, {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  logout: (token: string) =>
    request<{ ok: boolean }>("logout", { method: "POST", token }),
};
