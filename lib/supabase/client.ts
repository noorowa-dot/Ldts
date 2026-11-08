"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let c: ReturnType<typeof createBrowserClient> | null = null;
export function supabaseBrowser() {
  c ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return c;
}
