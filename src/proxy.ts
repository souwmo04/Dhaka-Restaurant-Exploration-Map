import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import areas from "../data/areas.json";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Areas always come from data/areas.json (the importer copies them into the
// database), so the proxy can reject unknown ones before rendering starts.
const AREA_SLUGS = new Set(areas.map((a) => a.slug));

/**
 * Keeps the Supabase session cookie fresh on every navigation, and does an
 * optimistic sign-in check for /admin. Real authorization happens in the
 * admin page/actions and in Row Level Security.
 *
 * Unknown /explore/<area> URLs get a real 404 here: the area page streams,
 * so by the time it could call notFound() the 200 status is already sent.
 */
export async function proxy(request: NextRequest) {
  const explore = request.nextUrl.pathname.match(/^\/explore\/([^/]+)\/?$/);
  if (explore && !AREA_SLUGS.has(explore[1])) {
    return NextResponse.rewrite(new URL("/explore-area-not-found", request.url));
  }

  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Validates the JWT (and refreshes it if needed). Don't run code between
  // client creation and this call.
  const { data } = await supabase.auth.getClaims();

  if (request.nextUrl.pathname.startsWith("/admin") && !data?.claims) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|maplibre/|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs)$).*)"],
};
