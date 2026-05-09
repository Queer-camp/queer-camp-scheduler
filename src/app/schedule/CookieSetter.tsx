"use client";

import { useEffect } from "react";
import { setScheduleCookie } from "./actions";

// Silently persists the token as a cookie the first time a camper
// visits via their magic link URL. Subsequent visits to /schedule
// (without a token in the URL) will be authenticated via the cookie.
export function CookieSetter({ token }: { token: string }) {
  useEffect(() => {
    setScheduleCookie(token);
  }, [token]);
  return null;
}
