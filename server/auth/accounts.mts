import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Role } from "../delivery/workflow.mts";
import { matchesToken, RequestError } from "../http/request.mts";
import { hashPassword, verifyPassword } from "./passwords.mts";

export type Principal = {
  id: string;
  role: Role;
  name?: string;
  legacy?: boolean;
};
type Account = Principal & { name: string; email: string; phone: string };
type AccountRow = Account & { password_hash: string };
type Registration = Omit<Account, "id"> & { password: string };

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createAccounts(
  pool: Pool,
  legacy: { senderId: string; senderToken?: string; travelerToken?: string },
) {
  const sender = legacy.senderToken
    ? Buffer.from("Bearer " + legacy.senderToken)
    : null;
  const traveler = legacy.travelerToken
    ? Buffer.from("Bearer " + legacy.travelerToken)
    : null;

  async function issue(account: Account) {
    const token = randomBytes(32).toString("hex");
    await pool.query("DELETE FROM flymate_sessions WHERE expires_at <= now()");
    await pool.query(
      "INSERT INTO flymate_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, now() + interval '24 hours')",
      [digest(token), account.id],
    );
    const { id, role, name, email, phone } = account;
    return { token, account: { id, role, name, email, phone } };
  }

  return {
    async register({ password, ...details }: Registration) {
      const id = randomUUID();
      const hash = await hashPassword(password);
      const result = await pool.query(
        `INSERT INTO flymate_accounts (id, role, name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
        [id, details.role, details.name, details.email, details.phone, hash],
      );
      if (!result.rowCount)
        throw new RequestError(
          409,
          "Could not create this account. Try signing in.",
        );
      return issue({ ...details, id });
    },
    async login(email: string, password: string) {
      const {
        rows: [account],
      } = await pool.query<AccountRow>(
        "SELECT id, role, name, email, phone, password_hash FROM flymate_accounts WHERE email = $1",
        [email],
      );
      const valid = await verifyPassword(password, account?.password_hash);
      if (!account || !valid)
        throw new RequestError(401, "Check your email and password.");
      return issue(account);
    },
    async authenticate(
      authorization: string | undefined,
    ): Promise<Principal | null> {
      if (sender && matchesToken(authorization, sender))
        return { id: legacy.senderId, role: "sender", legacy: true };
      if (traveler && matchesToken(authorization, traveler))
        return {
          id: "legacy-traveler",
          role: "traveler",
          name: "Development traveler",
          legacy: true,
        };
      const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization ?? "")?.[1];
      if (!token) return null;
      const {
        rows: [account],
      } = await pool.query<Principal>(
        `SELECT a.id, a.role, a.name FROM flymate_sessions s JOIN flymate_accounts a ON a.id = s.account_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [digest(token)],
      );
      return account ?? null;
    },
    async logout(authorization: string | undefined) {
      const token = /^Bearer ([a-f0-9]{64})$/.exec(authorization ?? "")?.[1];
      if (token)
        await pool.query("DELETE FROM flymate_sessions WHERE token_hash = $1", [
          digest(token),
        ]);
    },
  };
}
