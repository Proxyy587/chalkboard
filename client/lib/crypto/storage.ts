import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const SCRYPT_SALT = "clarity-storage-v1";

function getDerivedKey(): Buffer {
  const secret = process.env.SECRET_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SECRET_ENCRYPTION_KEY must be set and at least 32 characters. Generate with: openssl rand -base64 48"
    );
  }
  return scryptSync(secret, SCRYPT_SALT, KEY_LENGTH);
}

export function encryptCredentials(plaintext: object): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const json = JSON.stringify(plaintext);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptCredentials<T = Record<string, string>>(encryptedData: string): T {
  const key = getDerivedKey();
  const [ivB64, tagB64, encryptedB64] = encryptedData.split(":");
  if (!ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
