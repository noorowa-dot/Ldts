import Link from "next/link";
import type { Metadata } from "next";
import { Clock, Users, ChefHat, Lock } from "lucide-react";
import { getShare } from "@/lib/share";
import { Sticker, toneCycle } from "@/components/ui/sticker";
import { Logo } from "@/components/ui/logo";
import { KwopFlow } from "@/components/landing/kwop-flow";

export async function generateMetadata(props: PageProps<"/s/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const r = await getShare(id);
  const title = r ? `${r.title}: made from what was in the fridge` : "Made with Platepal";
  return { title, description: r?.intro || "Snap your fridge. Platepal writes a real recipe from what you already have.", openGraph: { title }, twitter: { title } };
}

export default async function Page(props: PageProps<"/s/[id]">) {
  const { id } = await props.params;
  const r = await getShare(id);
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-ink px-4 py-10 text-cream">
      <KwopFlow />
      <div className="dot-grid absolute inset-0" />
      <div className="glow-top absolute inset-0" />
      <div className="relative mx-auto max-w-[560px]">
        <Link href="/" className="mx-auto block w-fit"><Logo dark /></Link>
        {r ? (
          <div className="recipe-card mt-8 p-6 text-text sm:p-8">
            <p className="label-mono text-olive">Made from {r.names.length} things in a fridge</p>
            <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">{r.title}</h1>
            {r.intro && <p className="mt-2 text-muted">{r.intro}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-[13px] font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5eedf] px-3 py-1.5"><Clock className="h-4 w-4" />{r.time_minutes} min</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5eedf] px-3 py-1.5"><Users className="h-4 w-4" />Serves {r.servings}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5eedf] px-3 py-1.5"><ChefHat className="h-4 w-4" />{r.difficulty}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {r.names.map((n, i) => <Sticker key={n + i} tone={toneCycle[i % 3]}>{n}</Sticker>)}
            </div>
            <p className="mt-6 flex items-center gap-2 rounded-2xl bg-[#f5eedf] px-4 py-3 text-[14px] text-muted"><Lock className="h-4 w-4" /> The steps live in the cook&apos;s Platepal.</p>
          </div>
        ) : (
          <h1 className="mt-10 text-center font-serif text-[34px] font-semibold">This recipe isn&apos;t shared anymore.</h1>
        )}
        <div className="mt-8 text-center">
          <p className="font-serif text-[26px] font-semibold tracking-[-0.02em]">What&apos;s in your fridge?</p>
          <Link href="/" className="mt-4 inline-flex h-14 items-center rounded-full bg-tomato px-7 text-[16px] font-semibold text-white">Make my recipe</Link>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/50">Free to try · No card</p>
        </div>
      </div>
    </main>
  );
}
