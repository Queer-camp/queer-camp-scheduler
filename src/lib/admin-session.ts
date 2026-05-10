import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "admin_session";
const JWT_ALG = "HS256";

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("ADMIN_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: {
  adminId: string;
  email: string;
  role: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as { adminId: string; email: string; role: string };
}

export { COOKIE_NAME };
