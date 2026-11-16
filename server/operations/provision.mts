import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { z } from "zod";
import { hashPassword } from "../auth/passwords.mts";

const [email, name] = process.argv.slice(2);
const parsed = z
  .tuple([
    z.string().trim().toLowerCase().max(254).pipe(z.email()),
    z.string().trim().min(2).max(80),
  ])
  .safeParse([email, name]);

if (!parsed.success || !process.env.DATABASE_URL) {
  console.error(
    'Set DATABASE_URL, then run npm run staff:create -- staff@example.com "Staff Name"',
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  await pool.query(
    await readFile(
      new URL("../db/006_operations.sql", import.meta.url),
      "utf8",
    ),
  );
  const password = randomBytes(24).toString("base64url");
  const [staffEmail, staffName] = parsed.data;
  const { rowCount } = await pool.query(
    `INSERT INTO flymate_staff (id, email, name, password_hash) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [randomUUID(), staffEmail, staffName, await hashPassword(password)],
  );
  if (!rowCount) {
    console.error("A staff account already uses that email.");
    process.exitCode = 1;
  } else {
    console.log(
      `Staff account created for ${staffEmail}. Save the generated password securely.\n${password}`,
    );
  }
} catch {
  console.error(
    "Could not create the staff account. Check DATABASE_URL and database permissions.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
