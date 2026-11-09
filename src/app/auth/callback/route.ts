import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles both auth flows Supabase can send us back through:
 *  - PKCE (OAuth / magic link with ?code=...)
 *  - Email OTP links with ?token_hash=...&type=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/home";
  // Only allow same-origin relative redirects.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/home";

  const supabase = await createClient();
  let errorMessage: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) errorMessage = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) errorMessage = error.message;
  } else {
    errorMessage = "Invalid login link.";
  }

  if (errorMessage) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", errorMessage);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, origin));
}
