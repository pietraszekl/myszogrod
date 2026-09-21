import { createBrowserClient } from "@supabase/ssr";

import { assertSupabaseBrowserEnv } from "./env";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = assertSupabaseBrowserEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
