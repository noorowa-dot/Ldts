import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const YEAR = 60 * 60 * 24 * 365;
const MONTH = 60 * 60 * 24 * 30;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = request.nextUrl;
  const cookieJar: { name: string; value: string; maxAge: number; httpOnly: boolean }[] = [];

  // Kwop tracked link: ?k=<code> (letters and digits, up to 12)
  const k = url.searchParams.get("k");
  if (k && /^[A-Za-z0-9]{1,12}$/.test(k)) cookieJar.push({ name: "kwop_k", value: k, maxAge: MONTH, httpOnly: false });
  // A creator's voucher link: ?voucher=CODE (redeemed right after sign-up, prefilled in every voucher field)
  const voucher = url.searchParams.get("voucher");
  if (voucher && /^[A-Za-z0-9-]{3,40}$/.test(voucher)) cookieJar.push({ name: "pp_voucher", value: voucher.toUpperCase(), maxAge: MONTH, httpOnly: false });
  // Plan the visitor came for (from the Kwop page buttons)
  const plan = url.searchParams.get("plan");
  if (plan && plan.length <= 40) cookieJar.push({ name: "pp_plan", value: plan.replace(/[^\w \-]/g, ""), maxAge: MONTH, httpOnly: false });
  // utm_ parameters
  const utm: Record<string, string> = {};
  url.searchParams.forEach((v, key) => {
    if (key.startsWith("utm_") && v.length <= 100) utm[key] = v;
  });
  if (Object.keys(utm).length) cookieJar.push({ name: "pp_utm", value: JSON.stringify(utm), maxAge: MONTH, httpOnly: false });
  // Anonymous device id for tries before sign-up
  if (!request.cookies.get("pp_anon")) cookieJar.push({ name: "pp_anon", value: crypto.randomUUID(), maxAge: YEAR, httpOnly: true });

  let signedIn = false;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supaUrl && supaKey) {
    const supabase = createServerClient(supaUrl, supaKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list, headers) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers || {}).forEach(([h, v]) => response.headers.set(h, v));
        },
      },
    });
    try {
      const { data } = await supabase.auth.getClaims();
      signedIn = Boolean(data?.claims?.sub);
    } catch {
      signedIn = false;
    }
  }

  // Logged-in users go straight to the app.
  if (signedIn && url.pathname === "/") {
    const to = url.clone();
    to.pathname = "/app";
    const r = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    response = r;
  }

  for (const c of cookieJar) {
    response.cookies.set(c.name, c.value, { maxAge: c.maxAge, sameSite: "lax", path: "/", httpOnly: c.httpOnly, secure: url.protocol === "https:" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|examples/|vsl.mp4|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
