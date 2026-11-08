import type { Metadata } from "next";
import { TryFirst } from "@/components/funnel/try-first";
import { RecipeShell } from "@/components/app/recipe-shell";
import { getCtx, getRow, ownsRow, toView } from "@/lib/recipes";

export const metadata: Metadata = { title: "Your recipe", robots: { index: false } };

export default async function Page(props: PageProps<"/r/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const ctx = await getCtx();
  const row = await getRow(id);
  if (!row || !ownsRow(ctx, row)) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-ink px-6 text-center text-cream">
        <div>
          <p className="label-mono text-cream/50">[ Not found ]</p>
          <h1 className="mt-3 font-serif text-[36px] font-semibold tracking-[-0.03em]">We couldn&apos;t find that recipe.</h1>
          <p className="mt-2 text-cream/65">It may have been deleted, or it belongs to another account.</p>
          <a href={ctx.user ? "/app" : "/"} className="mt-6 inline-flex h-12 items-center rounded-full bg-tomato px-6 font-semibold text-white">Make my recipe</a>
        </div>
      </main>
    );
  }
  const view = await toView(ctx, row);
  if (ctx.user && view.access.unlocked) {
    return <RecipeShell recipe={view} />;
  }
  return (
    <main className="min-h-[100dvh] bg-ink pb-28">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] items-center justify-between">
          <a href={ctx.user ? "/app" : "/"} className="font-serif text-[20px] font-semibold text-cream">Platepal</a>
          {ctx.user ? (
            <a href="/app" className="text-[14px] font-semibold text-cream/80">My kitchen</a>
          ) : (
            <a href="/login" className="text-[14px] font-semibold text-cream/80">Log in</a>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-[860px] px-4 pt-6">
        <TryFirst signedIn={Boolean(ctx.user)} initialRecipe={view} autoUnlock={sp.unlock === "1"} />
      </div>
    </main>
  );
}
