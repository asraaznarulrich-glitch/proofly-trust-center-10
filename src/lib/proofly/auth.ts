import { useEffect, useState } from "react";
// Temporary mock auth (localStorage) until the real backend is connected.
const KEY = "proofly-mock-user";
export function useMockUser() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  useEffect(() => setUser(localStorage.getItem(KEY)), []);
  return user;
}
export const mockSignIn = (email: string) => localStorage.setItem(KEY, email);
export const mockSignOut = () => localStorage.removeItem(KEY);
