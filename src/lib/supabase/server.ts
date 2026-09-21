import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertSupabaseBrowserEnv } from "./env";

export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = assertSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate response cookies.
        }
      },
    },
  });
}
