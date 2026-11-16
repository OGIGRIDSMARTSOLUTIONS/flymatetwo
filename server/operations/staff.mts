import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { StaffSession } from "../../shared/operations.ts";
import { verifyPassword } from "../auth/passwords.mts";
import { RequestError } from "../http/request.mts";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function extractToken(authorization: string | undefined) {
  return /^Bearer (ops_[a-f0-9]{64})$/.exec(authorization ?? "")?.[1];
}

export function createStaffSessions(pool: Pool) {
  return {
    async login(email: string, password: string): Promise<StaffSession> {
      const {
        rows: [staff],
      } = await pool.query<StaffRow>(
        "SELECT id, name, email, password_hash FROM flymate_staff WHERE email = $1 AND active",
        [email],
      );
      const valid = await verifyPassword(password, staff?.password_hash);
      if (!staff || !valid)
        throw new RequestError(401, "Check your staff email and password.");

      const token = "ops_" + randomBytes(32).toString("hex");
      await pool.query(
        "DELETE FROM flymate_staff_sessions WHERE expires_at <= now()",
      );
      await pool.query(
        "INSERT INTO flymate_staff_sessions (token_hash, staff_id, expires_at) VALUES ($1, $2, now() + interval '8 hours')",
        [tokenHash(token), staff.id],
      );
      return { token, staff: { name: staff.name, email: staff.email } };
    },

    async authorize(authorization: string | undefined) {
      const token = extractToken(authorization);
      if (!token) return null;
      const {
        rows: [staff],
      } = await pool.query<{ id: string }>(
        `SELECT f.id FROM flymate_staff_sessions s JOIN flymate_staff f ON f.id = s.staff_id
         WHERE s.token_hash = $1 AND s.expires_at > now() AND f.active`,
        [tokenHash(token)],
      );
      return staff ?? null;
    },

    async logout(authorization: string | undefined) {
      const token = extractToken(authorization);
      if (token)
        await pool.query(
          "DELETE FROM flymate_staff_sessions WHERE token_hash = $1",
          [tokenHash(token)],
        );
    },
  };
}
