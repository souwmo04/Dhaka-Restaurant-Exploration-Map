import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { getServerSupabase } from "@/lib/supabase/server";

/** OAuth (Google) and email-confirmation links land here with a one-time code. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await getServerSupabase();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: new Error("Auth unavailable") };
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
