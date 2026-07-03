import crypto from "crypto";

const KEY_LENGTH = 64;

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_MINUTES = 15;

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = crypto.scryptSync(pin, salt, KEY_LENGTH);
  if (hashBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}
