import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

/** Rute yang boleh dibuka tanpa login. */
const PUBLIC_PATHS = ["/login"];

/**
 * Me-refresh token sesi Supabase dan menjalankan pengecekan login optimistik.
 * Pemeriksaan otoritatif tetap dilakukan di app/(app)/layout.tsx.
 */
export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value)
        );
      },
    },
  });

  // Jangan menaruh kode apa pun di antara createServerClient dan getClaims():
  // panggilan ini yang memvalidasi & me-refresh sesi.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!isSignedIn && !isPublic) {
    return redirectWithCookies(request, response, "/login");
  }

  if (isSignedIn && isPublic) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  return response;
}

/** Redirect sambil membawa cookie sesi yang mungkin baru saja di-refresh. */
function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string
) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  const redirect = NextResponse.redirect(target);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
