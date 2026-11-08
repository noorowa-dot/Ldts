import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { track } from "@/lib/kwop";
import { json } from "@/lib/http";

const Body = z.object({ type: z.enum(["paywall_view", "feature_used", "aha"]), detail: z.string().max(60).optional() });

/** Browser → server → Kwop. Fire-and-forget, never fails the page. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (parsed.success) {
    const user = await getUser();
    track(parsed.data.type, user?.email, parsed.data.detail);
  }
  return json({ ok: true });
}
