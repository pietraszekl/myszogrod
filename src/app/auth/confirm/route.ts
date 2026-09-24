import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeRedirectUrl(request: NextRequest, fallbackPath = "/") {
  const rawNext = request.nextUrl.searchParams.get("next");
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = fallbackPath;
  redirectUrl.search = "";

  if (!rawNext) {
    return redirectUrl;
  }

  const parsedNext = new URL(rawNext, request.nextUrl.origin);

  if (parsedNext.origin !== request.nextUrl.origin) {
    return redirectUrl;
  }

  redirectUrl.pathname = parsedNext.pathname;
  redirectUrl.search = parsedNext.search;
  redirectUrl.hash = parsedNext.hash;

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const redirectUrl = getSafeRedirectUrl(request);

  if (type === "recovery" && !redirectUrl.searchParams.has("auth")) {
    redirectUrl.searchParams.set("auth", "recovery");
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }

    redirectUrl.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("auth_error", "Brak tokenu resetu hasła w linku.");
  return NextResponse.redirect(redirectUrl);
}
