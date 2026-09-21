import { createBrowserClient } from "@supabase/ssr";

import { assertSupabaseBrowserEnv } from "./env";

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = assertSupabaseBrowserEnv();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
