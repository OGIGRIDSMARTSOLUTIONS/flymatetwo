import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { RequestError } from "../http/request.mts";

const saltBytes = 16;
const hashBytes = 64;
const options = { N: 2 ** 17, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let active = 0;

async function derive(password: string, salt: Buffer) {
  if (active >= 2) throw new RequestError(503, "Try signing in again shortly.");
  active++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, hashBytes, options, (error, hash) => {
        if (error) reject(error);
        else resolve(hash);
      });
    });
  } finally {
    active--;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(saltBytes);
  const hash = await derive(password, salt);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored?: string) {
  const [salt, hash] = stored?.split(":") ?? [];
  const result = await derive(
    password,
    salt ? Buffer.from(salt, "hex") : Buffer.alloc(saltBytes),
  );
  return Boolean(hash && timingSafeEqual(result, Buffer.from(hash, "hex")));
}
