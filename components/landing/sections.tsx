"use client";
import Link from "next/link";
import * as React from "react";
import { m, useReducedMotion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { ArrowRight, Camera, Check, ChefHat, Clock, Heart, Leaf, ShoppingBasket, Sparkles, Trash2, X, Lightbulb, ListChecks, CalendarDays } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { Sticker, toneCycle } from "@/components/ui/sticker";
import { Accordion } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const scrollToTry = (e?: React.MouseEvent) => {
  e?.preventDefault();
  const el = document.getElementById("try");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function useSignedIn() {
  const [signedIn, setSignedIn] = React.useState(false);
  React.useEffect(() => {
    const check = () => setSignedIn(/sb-[^=]+-auth-token/.test(document.cookie));
    check();
    window.addEventListener("pp:authed", check);
    return () => window.removeEventListener("pp:authed", check);
  }, []);
  return signedIn;
}

export function TopBar() {
  const signedIn = useSignedIn();
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  return (
    <div className="fixed inset-x-0 top-[14px] z-50 px-3">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-[980px] items-center justify-between rounded-[24px] px-3 pl-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/.09)] backdrop-blur-xl transition-colors",
          scrolled ? "bg-ink/80" : "bg-ink/40"
        )}
      >
        <Link href="/" aria-label="Platepal home" className="shrink-0">
          <Logo dark className="[&>span:last-child]:text-[19px] sm:[&>span:last-child]:text-[21px]" />
        </Link>
        <div className="hidden items-center gap-1 text-[14px] font-medium text-cream/70 md:flex">
          <a href="#how" className="rounded-full px-3 py-2 hover:text-cream">How it works</a>
          <a href="#features" className="rounded-full px-3 py-2 hover:text-cream">Features</a>
          <a href="#questions" className="rounded-full px-3 py-2 hover:text-cream">Questions</a>
        </div>
        <div className="flex items-center gap-1.5">
          <a href={signedIn ? "/app" : "/login"} className="whitespace-nowrap rounded-full px-2.5 py-2 text-[14px] font-semibold text-cream/85 hover:text-cream sm:px-3">{signedIn ? "My kitchen" : "Log in"}</a>
          <a href="#try" onClick={scrollToTry} className="group inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-tomato pl-3.5 pr-3 text-[14px] font-semibold text-white transition hover:bg-tomato-deep active:scale-95" data-testid="nav-cta">
            Make my recipe <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </a>
        </div>
      </nav>
    </div>
  );
}

export function StickyMobileCta() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const hero = document.getElementById("try");
    const final = document.getElementById("final");
    if (!hero) return;
    let heroVisible = true;
    let finalVisible = false;
    const update = () => setShow(!heroVisible && !finalVisible);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === final) finalVisible = e.isIntersecting;
      });
      update();
    });
    io.observe(hero);
    if (final) io.observe(final);
    return () => io.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <m.div initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ type: "spring", damping: 26, stiffness: 300 }} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 md:hidden">
          <a href="#try" onClick={scrollToTry} className="flex h-14 items-center justify-center gap-2 rounded-full bg-tomato text-[16px] font-semibold text-white shadow-[0_12px_30px_-8px_rgb(0_0_0/.5)] active:scale-[0.97]" data-testid="sticky-cta">
            <Camera className="h-5 w-5" /> Make my recipe
          </a>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Label({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={cn("label-mono", dark ? "text-cream/55" : "text-muted")}>[ {children} ]</p>;
}

function H2({ a, b, dark, className }: { a: string; b?: string; dark?: boolean; className?: string }) {
  return (
    <h2 className={cn("title-xl mt-3 text-[40px] sm:text-[56px] lg:text-[64px]", dark ? "text-cream" : "text-text", className)}>
      {a}
      {b && (
        <>
          <br />
          <span className={dark ? "text-gradient-cream" : "text-gradient-ink"}>{b}</span>
        </>
      )}
    </h2>
  );
}

/* ---------------- The 6 PM problem ---------------- */
export function Problem() {
  const cards = [
    { icon: Trash2, title: "Food you paid for, in the trash", text: "Half a bag of spinach. Two lonely eggs. They don't match any recipe, so they go bad.", tone: "bg-[#fde3dc] text-tomato-deep" },
    { icon: Lightbulb, title: "Staring at the fridge, zero ideas", text: "You open it, close it, open it again. 20 minutes later you're scrolling delivery apps.", tone: "bg-butter-soft text-[#7a5a0a]" },
    { icon: ListChecks, title: "Recipes that need 12 things you don't have", text: "Every recipe online wants shallots, fresh thyme and a trip to the store. Not tonight.", tone: "bg-olive-soft text-olive" },
  ];
  return (
    <section className="bg-cream px-4 py-16 text-text sm:py-28" id="problem">
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <Label>The 6 PM problem</Label>
          <H2 a="A full fridge." b="Nothing to make." />
        </Reveal>
        <Stagger className="mt-10 grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="recipe-card h-full p-6">
              <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", c.tone)}>
                <c.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{c.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.text}</p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------------- How it works (animated device frames) ---------------- */
function LoopScreen({ step }: { step: 0 | 1 | 2 }) {
  const reduce = useReducedMotion();
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((x) => x + 1), 1400);
    return () => clearInterval(t);
  }, [reduce]);
  if (step === 0)
    return (
      <div className="relative h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/examples/leftovers-night.jpg" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <div className="absolute inset-x-4 h-[3px] rounded-full bg-lime shadow-[0_0_18px_4px_rgb(200_255_61/.6)] transition-all duration-[1400ms] ease-in-out" style={{ top: tick % 2 ? "78%" : "18%" }} />
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-tomato text-white ring-4 ring-white/70"><Camera className="h-6 w-6" /></span>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className="relative h-full bg-cream p-4">
        <p className="label-mono text-olive">We found 8 ingredients</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Rice", "Chicken", "Broccoli", "Carrots", "Scallions", "Eggs", "Soy sauce", "Cheddar"].map((x, i) => (
            <span key={x} style={{ opacity: reduce || i <= (tick % 10) ? 1 : 0.15, transition: "opacity .3s" }}>
              <Sticker tone={toneCycle[i % 3]} className="text-[11px]">{x}</Sticker>
            </span>
          ))}
        </div>
        <div className="recipe-card mt-5 p-4">
          <p className="font-serif text-[19px] font-semibold leading-tight">Chicken Fried Rice</p>
          <p className="mt-1 text-[12px] text-muted">15 min · Serves 2 · Easy</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${reduce ? 100 : 20 + ((tick * 17) % 80)}%` }} />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted">Example result</p>
      </div>
    );
  return (
    <div className="relative h-full bg-cream p-4">
      <p className="font-serif text-[19px] font-semibold">Chicken Fried Rice</p>
      <ol className="mt-3 space-y-2.5">
        {["Heat oil in a big pan", "Scramble the eggs, set aside", "Fry rice with carrots", "Add chicken + soy sauce", "Top with scallions"].map((s, i) => {
          const done = reduce || i < (tick % 6);
          return (
            <li key={s} className="flex items-center gap-2 text-[13px]">
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border transition", done ? "border-olive bg-olive text-white" : "border-line")}>{done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
              <span className={cn(done && "text-muted line-through decoration-olive/50")}>{s}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px] text-muted">Example result</p>
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    { n: "1", t: "Snap your fridge", d: "Take a quick photo of the food you need to use up. One photo. No typing." },
    { n: "2", t: "Get your recipe", d: "Platepal spots every ingredient and writes a recipe from what you have. In seconds." },
    { n: "3", t: "Cook and enjoy", d: "Follow simple steps with amounts and times. A real homemade dinner, tonight." },
  ] as const;
  return (
    <section className="relative overflow-hidden bg-ink px-4 py-16 text-cream sm:py-28" id="how">
      <div className="dot-grid absolute inset-0 opacity-50" />
      <div className="relative mx-auto max-w-[1120px]">
        <Reveal>
          <Label dark>How it works</Label>
          <H2 a="Photo in." b="Dinner out." dark />
        </Reveal>
        <Stagger className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center text-center">
              <PhoneFrame className="w-[230px]">
                <LoopScreen step={i as 0 | 1 | 2} />
              </PhoneFrame>
              <p className="mt-6 font-mono text-[12px] tracking-[0.18em] text-lime">STEP {s.n}</p>
              <h3 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">{s.t}</h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-cream/65">{s.d}</p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------------- Features in action ---------------- */
const FEATURES = [
  { key: "scan", icon: Camera, title: "Snap & Scan", text: "Snap your open fridge, even a messy one. Platepal sweeps every shelf, door and drawer, reads the labels, and learns from every fix." },
  { key: "chef", icon: ChefHat, title: "AI Chef Engine", text: "A recipe built from what you have, a quick spice-cabinet check for the rest, and 4-5 chef's tips for the dish." },
  { key: "diet", icon: Leaf, title: "Dietary filters", text: "Vegan, keto, gluten-free, dairy-free, vegetarian or high-protein. Your call." },
  { key: "shop", icon: ShoppingBasket, title: "Shopping Saver", text: "Missing something? A tiny list, only if it's truly needed. Usually: nothing." },
  { key: "save", icon: Heart, title: "Save favorites", text: "Bookmark the dishes you loved and cook them again next week." },
  {
    key: "plan",
    icon: CalendarDays,
    title: "Plan your week, shop once",
    text: "Pick what you'll eat this week. Platepal adds up every ingredient into one list, in the amounts stores sell, skips what's already in your fridge, and compares prices across your stores.",
  },
] as const;

function FeatureLoop({ k }: { k: (typeof FEATURES)[number]["key"] }) {
  const reduce = useReducedMotion();
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((x) => x + 1), 1200);
    return () => clearInterval(t);
  }, [reduce]);
  if (k === "scan")
    return (
      <div className="relative h-full overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/examples/half-empty-fridge.jpg" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        {[["Eggs", 12, 18], ["Feta", 45, 22], ["Lemon", 70, 26], ["Spinach", 12, 56], ["Tomatoes", 40, 54], ["Chicken", 66, 58]].map(([n, x, y], i) => (
          <span key={n as string} className="absolute transition-all duration-300" style={{ left: `${x}%`, top: `${y}%`, opacity: reduce || i <= tick % 8 ? 1 : 0, transform: `scale(${reduce || i <= tick % 8 ? 1 : 0.6})` }}>
            <Sticker tone={toneCycle[i % 3]} className="text-[11px]">{n}</Sticker>
          </span>
        ))}
      </div>
    );
  if (k === "chef")
    return (
      <div className="recipe-card h-full p-5">
        <p className="label-mono text-olive">Uses 5 of your 6</p>
        <p className="mt-1 font-serif text-[22px] font-semibold leading-tight">Spinach & Feta Frittata</p>
        <div className="mt-4 space-y-2">
          {[100, 86, 92, 70].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-tomato/70 transition-all duration-700" style={{ width: `${reduce ? w : ((tick + i) % 5) * 25 > w ? w : ((tick + i) % 5) * 25}%` }} />
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted">Example recipe</p>
      </div>
    );
  if (k === "diet")
    return (
      <div className="flex h-full flex-wrap content-center justify-center gap-2 p-4">
        {["Vegan", "Vegetarian", "Keto", "Gluten-free", "Dairy-free", "High-protein"].map((d, i) => {
          const on = reduce ? i === 2 : i === tick % 6;
          return (
            <span key={d} className={cn("rounded-full border px-4 py-2 text-[14px] font-semibold transition", on ? "border-olive bg-olive text-white" : "border-line bg-paper text-text")}>
              {on && <Check className="mr-1 inline h-4 w-4" />} {d}
            </span>
          );
        })}
      </div>
    );
  if (k === "plan") {
    const week = [
      ["Mon", "Tacos"],
      ["Tue", "Stir-fry"],
      ["Wed", "Pasta"],
      ["Thu", "Chili"],
      ["Fri", "Salmon"],
    ];
    const list = [
      ["Chicken thighs", "2 lb"],
      ["Bell peppers", "3"],
      ["Black beans", "2 cans"],
      ["Eggs", "1 dozen"],
      ["Salmon fillets", "1 lb"],
    ];
    const shown = reduce ? 5 : (tick % 8) + 1;
    return (
      <div className="grid h-full gap-3 p-3 sm:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-5 gap-1.5">
          {week.map(([d, meal], i) => (
            <div key={d} className={cn("flex min-w-0 flex-col rounded-xl border p-1.5 transition-all duration-500 sm:p-2", i < shown ? "border-tomato/30 bg-paper" : "border-dashed border-line bg-transparent")}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{d}</span>
              <span className={cn("mt-1 break-words text-[11px] font-semibold leading-tight transition-opacity duration-500 sm:text-[12px]", i < shown ? "opacity-100" : "opacity-0")}>{meal}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-paper p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">One list</p>
          <ul className="mt-1.5 space-y-1">
            {list.map(([n, q], i) => (
              <li key={n} className={cn("flex justify-between text-[12px] transition-opacity duration-500", i < Math.max(0, shown - 2) ? "opacity-100" : "opacity-20")}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("grid h-3.5 w-3.5 place-items-center rounded border", i < shown - 4 ? "border-olive bg-olive text-white" : "border-line")}>{i < shown - 4 && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</span>
                  {n}
                </span>
                <span className="font-mono text-muted">{q}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-1.5 text-[11px]">
            {["Store A", "Store B", "Store C"].map((st, i) => (
              <span key={st} className={cn("rounded-full px-2 py-0.5 font-semibold", i === 1 && shown > 5 ? "bg-olive text-white" : "bg-[#f5eedf] text-muted")}>
                {st}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted">Example week</p>
        </div>
      </div>
    );
  }
  if (k === "shop")
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">Shopping Saver</p>
        <div className="rounded-xl bg-paper px-4 py-3 text-[15px] shadow-sm"><b>1 lemon</b> <span className="text-muted">· brightens the sauce</span></div>
        <div className={cn("rounded-xl bg-olive-soft px-4 py-3 text-[14px] font-medium text-olive transition", reduce || tick % 2 ? "opacity-100" : "opacity-40")}>Everything else is already in your fridge.</div>
        <p className="text-[11px] text-muted">Example list</p>
      </div>
    );
  return (
    <div className="grid h-full grid-cols-2 gap-2 p-4">
      {["Fried Rice", "Frittata", "Chickpea Curry", "Quesadillas"].map((t, i) => (
        <div key={t} className="recipe-card flex flex-col justify-between p-3">
          <p className="font-serif text-[15px] font-semibold leading-tight">{t}</p>
          <Heart className={cn("h-4 w-4 transition", reduce || i <= tick % 5 ? "fill-tomato text-tomato" : "text-line")} />
        </div>
      ))}
    </div>
  );
}

export function InAction() {
  return (
    <section className="bg-cream px-4 py-16 text-text sm:py-28" id="features">
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <Label>In action</Label>
          <H2 a="Everything a busy cook needs." b="Nothing you don't." />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          {FEATURES.map((f, i) => (
            <Reveal key={f.key} delay={i * 0.06} className={cn("recipe-card flex flex-col overflow-hidden p-5", i < 2 ? "md:col-span-3" : i === 5 ? "md:col-span-6" : "md:col-span-2")}>
              <div className={cn("rounded-2xl bg-surface-2", i < 2 ? "h-56" : i === 5 ? "min-h-48" : "h-48")}>
                <FeatureLoop k={f.key} />
              </div>
              <div className="mt-5 flex items-center gap-2">
                <f.icon className="h-5 w-5 text-tomato" />
                <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{f.title}</h3>
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- The usual way vs Platepal ---------------- */
export function Compare() {
  const rows = [
    ["Find a recipe", "Search, scroll past 9 ads and a life story", "Snap one photo"],
    ["Ingredients", "Needs 12 things you don't have", "Built from what's in your fridge"],
    ["Time to decide", "20 minutes of staring", "About 10 seconds"],
    ["Leftovers", "End up in the trash", "Become tonight's dinner"],
    ["Diet", "Filter, re-search, give up", "Vegan, keto, gluten-free in 1 tap"],
  ];
  return (
    <section className="relative overflow-hidden bg-ink px-4 py-16 text-cream sm:py-28">
      <div className="mx-auto max-w-[980px]">
        <Reveal>
          <Label dark>The usual way vs Platepal</Label>
          <H2 a="Stop searching." b="Start cooking." dark />
        </Reveal>
        <Reveal className="mt-10 overflow-hidden rounded-[22px] ring-1 ring-white/10">
          <div className="grid grid-cols-[1fr_1fr] bg-white/[.04] text-[13px] font-semibold uppercase tracking-[0.12em] sm:grid-cols-[1fr_1.3fr_1.3fr]">
            <span className="hidden px-5 py-4 text-cream/50 sm:block" />
            <span className="px-4 py-4 text-cream/50 sm:px-5">The usual way</span>
            <span className="bg-tomato/15 px-4 py-4 text-lime sm:px-5">Platepal</span>
          </div>
          {rows.map(([k, a, b]) => (
            <div key={k} className="grid grid-cols-[1fr_1fr] border-t border-white/10 text-[15px] sm:grid-cols-[1fr_1.3fr_1.3fr]">
              <span className="col-span-2 px-4 pt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-cream/60 sm:col-span-1 sm:px-5 sm:py-4 sm:text-[14px] sm:normal-case sm:tracking-normal sm:text-cream/80">{k}</span>
              <span className="flex gap-2 px-4 py-3 text-cream/60 sm:px-5 sm:py-4"><X className="mt-0.5 h-4 w-4 shrink-0 text-tomato" />{a}</span>
              <span className="flex gap-2 bg-tomato/10 px-4 py-3 font-medium sm:px-5 sm:py-4"><Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{b}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Questions ---------------- */
export const FAQS = [
  { q: "Does it really work with a messy fridge?", a: "Yes. Platepal sweeps every shelf, the door and the drawers, reads labels, and marks anything it isn't sure about so you can fix it in one tap. Every fix teaches it, so it keeps getting better. If the light is too dark, it tells you so you can retake it." },
  { q: "What if I'm missing an ingredient?", a: "Platepal builds the recipe from what it sees. Spices and sauces a photo can't show come in a quick spice-cabinet check: tap Got it or I'm out, and you get a swap idea or a one-tap add to your shopping list. It remembers your answers for next time." },
  { q: "Can it cook vegan, keto or gluten-free?", a: "Yes. Pick a dietary filter (vegan, vegetarian, keto, gluten-free, dairy-free or high-protein) and every recipe follows it." },
  { q: "Where do my photos go?", a: "Your photos are stored privately in our database (Supabase, US), visible only to you. You can delete any photo, or your whole account, in 2 taps." },
  { q: "How much does it cost?", a: "You try it free first. The plans show up once your first recipe is ready." },
  { q: "Do I need to download an app?", a: "No. Platepal works in your phone's browser. You can add it to your home screen in one tap, like an app." },
];

export function Questions() {
  return (
    <section className="bg-cream px-4 py-16 text-text sm:py-28" id="questions">
      <div className="mx-auto grid max-w-[1120px] gap-10 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <Label>Questions</Label>
          <H2 a="Good questions." b="Short answers." />
        </Reveal>
        <Reveal>
          <Accordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- Final block + footer ---------------- */
export function FinalCta() {
  return (
    <section id="final" className="relative overflow-hidden bg-ink px-4 py-20 text-center text-cream sm:py-32">
      <div className="dot-grid absolute inset-0" />
      <div className="glow-top absolute inset-0" />
      <Reveal className="relative mx-auto max-w-3xl">
        <Label dark>Tonight</Label>
        <h2 className="title-xl mt-3 text-[42px] sm:text-[72px]">
          Tonight&apos;s dinner is
          <br />
          <span className="text-gradient-cream">already in your fridge.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] text-cream/65">One photo now. A real, homemade dinner in about 20 minutes.</p>
        <a href="#try" onClick={scrollToTry} className="group relative isolate mx-auto mt-9 inline-flex h-16 items-center gap-4 rounded-full bg-tomato pl-7 pr-2.5 text-[17px] font-semibold text-white transition hover:bg-tomato-deep active:scale-[0.955]" data-testid="final-cta">
          <span aria-hidden className="btn-glow absolute -inset-2 -z-10 rounded-full bg-tomato/45 blur-xl" />
          Make my recipe
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-cream text-tomato">
            <ArrowRight className="arrow-nudge h-5 w-5 transition-transform duration-300 group-hover:translate-x-7" strokeWidth={2.4} />
          </span>
        </a>
        <FactsLine className="mt-4 text-cream/60" />
      </Reveal>
    </section>
  );
}

export function Footer({ minimal = false }: { minimal?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-ink px-4 pt-14 text-cream">
      <div className="mx-auto max-w-[1120px]">
        {!minimal && (
          <div className="grid gap-8 border-b border-white/10 pb-10 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Logo dark />
              <p className="mt-3 max-w-xs text-[14px] text-cream/55">Made for busy people trying to cook with what is at home.</p>
            </div>
            <div className="space-y-2 text-[14px]">
              <p className="label-mono text-cream/60">Product</p>
              <a href="#how" className="block text-cream/75 hover:text-cream">How it works</a>
              <a href="#features" className="block text-cream/75 hover:text-cream">Features</a>
              <a href="#questions" className="block text-cream/75 hover:text-cream">Questions</a>
            </div>
            <div className="space-y-2 text-[14px]">
              <p className="label-mono text-cream/60">Account</p>
              <a href="/login" className="block text-cream/75 hover:text-cream">Log in</a>
              <a href="/terms" className="block text-cream/75 hover:text-cream">Terms</a>
              <a href="/privacy" className="block text-cream/75 hover:text-cream">Privacy</a>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 py-6 text-[13px] text-cream/60">
          <span>© {year} Platepal</span>
          <span className="flex gap-4">
            <a href="/terms" className="hover:text-cream">Terms</a>
            <a href="/privacy" className="hover:text-cream">Privacy</a>
            <a href="/login" className="hover:text-cream">Log in</a>
          </span>
        </div>
      </div>
      <svg aria-hidden viewBox="0 0 1000 230" className="pointer-events-none block w-full select-none">
        <defs>
          <linearGradient id="wm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf6ec" stopOpacity=".13" />
            <stop offset="1" stopColor="#fbf6ec" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x="500" y="215" textAnchor="middle" fill="url(#wm)" style={{ font: "600 270px var(--font-fraunces), Georgia, serif", letterSpacing: "-0.06em" }}>
          Platepal
        </text>
      </svg>
    </footer>
  );
}

export function FactsLine({ className }: { className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cream/55", className)}>
      <span>Free to try</span><span aria-hidden>·</span><span>No card</span><span aria-hidden>·</span><span>Ready in ~10 seconds</span>
    </p>
  );
}

export function HeroFacts({ count }: { count: number }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <FactsLine />
      {count >= 100 && (
        <p className="flex items-center gap-1.5 font-mono text-[12px] text-cream/60">
          <Sparkles className="h-3.5 w-3.5 text-lime" /> {count.toLocaleString("en-US")} recipes made so far
        </p>
      )}
      <p className="flex items-center gap-1.5 text-[12px] text-cream/60">
        <Clock className="h-3.5 w-3.5" /> Your photo stays private. Delete it anytime.
      </p>
    </div>
  );
}
