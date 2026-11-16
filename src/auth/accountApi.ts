import { draftApiUrl } from "../sender/draftApi";
import type { Role } from "../sender/deliveryApi";

export type Credentials = { email: string; password: string };
export type Registration = Credentials & {
  name: string;
  phone: string;
  role: Role;
};
export type Session = {
  token: string;
  account: {
    id: string;
    role: Role;
    name: string;
    email: string;
    phone: string;
  };
};

async function request<T>(action: string, body?: object, token?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${draftApiUrl}/api/auth/${action}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Account request failed.");
  return result as T;
}

export const accountApi = {
  login: (body: Credentials) => request<Session>("login", body),
  register: (body: Registration) => request<Session>("register", body),
  logout: (token: string) => request<{ ok: true }>("logout", undefined, token),
};
