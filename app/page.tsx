import { existsSync } from "node:fs";
import path from "node:path";
import { TryFirst } from "@/components/funnel/try-first";
import { Vsl } from "@/components/landing/vsl";
import { Compare, FinalCta, Footer, HeroFacts, HowItWorks, InAction, Problem, Questions, StickyMobileCta, TopBar } from "@/components/landing/sections";
import { KwopFlow } from "@/components/landing/kwop-flow";
import { publicRecipeCount } from "@/lib/recipes";
import { supabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const count = supabaseConfigured && process.env.SUPABASE_SERVICE_ROLE_KEY ? await publicRecipeCount() : 0;
  const hasVideo = existsSync(path.join(process.cwd(), "public", "vsl.mp4"));
  return (
    <main className="bg-ink">
      <KwopFlow />
      <TopBar />

      {/* HERO: the product itself */}
      <section className="relative overflow-hidden px-4 pb-14 pt-28 text-cream sm:pb-20 sm:pt-36">
        <div className="dot-grid absolute inset-0" />
        <div className="glow-top absolute inset-0" />
        <div className="relative mx-auto max-w-[860px]">
          <div className="text-center">
            <p className="label-mono text-cream/55">[ Fridge → Dinner ]</p>
            <h1 className="title-xl mt-4 text-[44px] sm:text-[72px] lg:text-[80px]">
              3 random ingredients.
              <br />
              <span className="text-gradient-cream">One 5-star dinner.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-cream/70 sm:text-[19px]">
              Snap your fridge. Platepal writes <b className="font-semibold text-cream">a real recipe</b> from <b className="font-semibold text-cream">what you already have</b>, ready in about 10 seconds.
            </p>
          </div>
          <div id="try" className="mt-9 scroll-mt-24">
            <TryFirst />
          </div>
          <HeroFacts count={count} />
        </div>
      </section>

      {/* VSL */}
      <section className="relative px-4 pb-16 text-cream sm:pb-28" aria-label="Watch how Platepal works">
        <div className="mx-auto max-w-[1000px]">
          <p className="mb-4 text-center label-mono text-cream/60">[ 60 seconds: from fridge to dinner ]</p>
          <Vsl videoSrc={hasVideo ? "/vsl.mp4" : null} />
        </div>
      </section>

      <Problem />
      <HowItWorks />
      <InAction />
      <Compare />
      <Questions />
      <FinalCta />
      <Footer />
      <StickyMobileCta />
    </main>
  );
}
