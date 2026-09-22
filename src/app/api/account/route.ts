import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { assertSupabaseBrowserEnv } from "@/lib/supabase/env";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Brakuje SUPABASE_SERVICE_ROLE_KEY po stronie serwera. Bez niego aplikacja nie może usuwać użytkowników Supabase.",
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Musisz być zalogowany, aby usunąć konto." },
      { status: 401 },
    );
  }

  const { supabaseUrl } = assertSupabaseBrowserEnv();
  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: prepareError } = await supabaseAdmin.rpc("prepare_account_deletion", {
    target_user_id: user.id,
  });

  if (prepareError) {
    return NextResponse.json({ error: prepareError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
