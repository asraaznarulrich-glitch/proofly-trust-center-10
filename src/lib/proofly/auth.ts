import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function useMockUser() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user.email ?? null));
    return () => { data.subscription.unsubscribe(); };
  }, []);
  return user;
}
export const mockSignOut = () => supabase.auth.signOut();
