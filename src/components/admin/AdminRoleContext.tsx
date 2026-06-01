"use client";

import { createContext, useContext } from "react";

export const AdminRoleContext = createContext<string | null>(null);

export function useAdminRole() {
  const role = useContext(AdminRoleContext);
  return { isAdmin: role === "admin", role };
}
