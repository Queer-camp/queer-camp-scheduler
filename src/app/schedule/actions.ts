"use server";

import { cookies } from "next/headers";

export async function setScheduleCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("camper_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}
