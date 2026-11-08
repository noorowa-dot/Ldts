"use client";
import * as React from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { Camera, Check, ImagePlus, RotateCcw, Lock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RecipeView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import { RecipeCard, PhotoWithStickers } from "./recipe-card";
import { UnlockProvider, useUnlock, preloadFunnel } from "./unlock-flow";

export const EXAMPLES = [
  { id: "half-empty-fridge", label: "Half-empty fridge" },
  { id: "pantry-shelf", label: "Pantry shelf" },
  { id: "leftovers-night", label: "Leftovers night" },
] as const;

const STEPS = ["Looking at your shelves", "Spotting ingredients", "Checking what goes together", "Picking tonight's dish", "Writing your steps"];
const THRESH = [8, 26, 48, 70, 88];

type Phase =
  | { kind: "idle" }
  | { kind: "working"; preview: string }
  | { kind: "done"; recipe: RecipeView }
  | { kind: "error"; message: string; preview?: string; retry?: () => void }
  | { kind: "limit"; message: string; reason: string };

/** Downscale on the device: faster upload on phones, and never more than the AI needs. */
async function compress(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const max = 1280;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export type EngineOptions = {
  /** Dietary filters to send with each scan (the server keeps only what the plan includes). */
  diet?: string[];
  /** Called with each new recipe (the app opens the full recipe page when it is unlocked). */
  onResult?: (r: RecipeView) => void;
  /** Show "Type what you have" next to the photo. */
  allowList?: boolean;
  /** Hide the example shelves (the app shows them smaller). */
  inApp?: boolean;
};

export function TryFirst({ signedIn = false, initialRecipe = null, autoUnlock = false, options = {} }: { signedIn?: boolean; initialRecipe?: RecipeView | null; autoUnlock?: boolean; options?: EngineOptions }) {
  const [recipe, setRecipe] = React.useState<RecipeView | null>(initialRecipe);
  const [justUnlocked, setJustUnlocked] = React.useState(false);
  const [authed, setAuthed] = React.useState(signedIn);
  const router = useRouter();

  const refetch = React.useCallback(async (id: string) => {
    const r = await fetch(`/api/recipes/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setRecipe(d.recipe);
      return d.recipe as RecipeView;
    }
    return null;
  }, []);

  return (
    <UnlockProvider
      recipe={recipe}
      signedIn={authed}
      tier={recipe?.access.tier ?? "none"}
      returnPath={recipe ? `/r/${recipe.id}?unlock=1` : "/app"}
      onAuthed={async () => {
        setAuthed(true);
        if (recipe) await refetch(recipe.id);
        window.dispatchEvent(new Event("pp:authed"));
        // On the recipe page the server parts (header) can refresh in place. On the landing page we stay put:
        // re-rendering it as another page would close the paywall the person is about to use.
        if (initialRecipe) router.refresh();
      }}
      onUnlocked={async () => {
        if (recipe) {
          await refetch(recipe.id);
          setJustUnlocked(true);
        }
      }}
    >
      <Engine recipe={recipe} setRecipe={setRecipe} justUnlocked={justUnlocked} autoUnlock={autoUnlock} options={options} />
    </UnlockProvider>
  );
}

function Engine({ recipe, setRecipe, justUnlocked, autoUnlock, options }: { recipe: RecipeView | null; setRecipe: (r: RecipeView) => void; justUnlocked: boolean; autoUnlock: boolean; options: EngineOptions }) {
  const [listOpen, setListOpen] = React.useState(false);
  const [list, setList] = React.useState("");
  const { openUnlock, openUpgrade, plans } = useUnlock();
  const featured = plans?.find((p) => p.featured) ?? plans?.[0];
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>(recipe ? { kind: "done", recipe } : { kind: "idle" });
  const [pct, setPct] = React.useState(0);
  const [stamp, setStamp] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [last, setLast] = React.useState<{ id: string; title: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const topRef = React.useRef<HTMLDivElement>(null);
  const autoOpened = React.useRef(false);

  React.useEffect(() => {
    // Keep the shown recipe in sync after a refetch (sign-up, payment).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (recipe && phase.kind === "done" && phase.recipe !== recipe) setPhase({ kind: "done", recipe });
  }, [recipe, phase]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("pp_last");
      // Browser-only storage, read after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw && !recipe) setLast(JSON.parse(raw));
    } catch {}
  }, [recipe]);

  React.useEffect(() => {
    if (recipe) preloadFunnel();
  }, [recipe]);

  React.useEffect(() => {
    if (autoUnlock && recipe && !recipe.access.unlocked && !autoOpened.current) {
      autoOpened.current = true;
      setTimeout(openUnlock, 400);
    }
  }, [autoUnlock, recipe, openUnlock]);

  // Progress: smooth to 99 %, holds there until the real work is done.
  React.useEffect(() => {
    if (phase.kind !== "working") return;
    // A new piece of work starts at 0 %.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPct(0);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const v = Math.min(99, 99 * (1 - Math.exp(-t / 3.2)));
      setPct(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase.kind]);

  async function run(body: FormData | { url: string; json: unknown }, preview: string) {
    if (body instanceof FormData && options.diet?.length && !body.has("diet")) body.append("diet", options.diet.join(","));
    setPhase({ kind: "working", preview });
    setStamp(false);
    topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Timing inside an event handler, not during render.
    // eslint-disable-next-line react-hooks/purity
    const started = Date.now();
    const attempt = async () => {
      const r =
        body instanceof FormData
          ? await fetch("/api/scan", { method: "POST", body })
          : await fetch(body.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body.json) });
      const d = await r.json().catch(() => ({}));
      return { r, d };
    };
    try {
      let { r, d } = await attempt();
      if (!r.ok && r.status >= 500 && d.error !== "ai_off" && d.error !== "not_ready") ({ r, d } = await attempt());
      // eslint-disable-next-line react-hooks/purity
      const wait = Math.max(0, 3200 - (Date.now() - started));
      await new Promise((res) => setTimeout(res, wait));
      if (r.status === 429) return setPhase({ kind: "limit", message: d.message, reason: d.error });
      if (!r.ok) return setPhase({ kind: "error", message: d.message || "Our chef dropped the spoon. Please try again.", preview, retry: () => run(body, preview) });
      setPct(100);
      setStamp(true);
      const rec: RecipeView = d.recipe;
      try {
        localStorage.setItem("pp_last", JSON.stringify({ id: rec.id, title: rec.title }));
      } catch {}
      await new Promise((res) => setTimeout(res, reduce ? 200 : 1100));
      preloadFunnel();
      setRecipe(rec);
      setPhase({ kind: "done", recipe: rec });
      options.onResult?.(rec);
      if (location.pathname === "/") history.replaceState(null, "", `/r/${rec.id}`);
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    } catch {
      setPhase({ kind: "error", message: "You seem to be offline. Check your connection and try again.", preview, retry: () => run(body, preview) });
    }
  }

  async function onFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhase({ kind: "error", message: "That file isn't a photo. Try a JPG or PNG." });
    const blob = await compress(file);
    const preview = URL.createObjectURL(blob);
    const fd = new FormData();
    fd.append("photo", new File([blob], "fridge.jpg", { type: blob.type || "image/jpeg" }));
    run(fd, preview);
  }

  function onList(e: React.FormEvent) {
    e.preventDefault();
    const items = list.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    if (items.length < 2) return;
    const fd = new FormData();
    fd.append("list", items.join(","));
    run(fd, "");
  }

  function onExample(id: string) {
    const fd = new FormData();
    fd.append("example", id);
    run(fd, `/examples/${id}.jpg`);
  }

  const reset = () => {
    setPhase({ kind: "idle" });
    if (location.pathname.startsWith("/r/")) history.replaceState(null, "", "/");
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      <AnimatePresence mode="wait" initial={false}>
        {phase.kind === "idle" && (
          <m.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                onFile(e.dataTransfer.files?.[0]);
              }}
              data-testid="dropzone"
              className={cn(
                "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] border-2 border-dashed px-5 py-9 text-center transition sm:py-12",
                drag ? "border-lime bg-lime/10" : "border-cream/25 bg-white/[.04]"
              )}
            >
              <ScanCorners />
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                aria-label="Take a photo of your fridge"
                className="group relative grid h-16 w-16 cursor-pointer place-items-center rounded-full bg-tomato text-white shadow-[0_12px_30px_-10px_rgb(210_64_42/.9)] transition hover:scale-105 active:scale-95"
              >
                <Camera className="h-7 w-7" />
                <span className="btn-glow absolute -inset-2 -z-10 rounded-full bg-tomato/40 blur-lg" />
              </button>
              <span className="font-serif text-[26px] font-semibold tracking-[-0.02em] text-cream sm:text-[30px]">Snap your fridge</span>
              <div className="relative flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  data-testid="take-photo"
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-cream px-5 text-[15px] font-semibold text-ink transition hover:bg-white active:scale-95 sm:hidden"
                >
                  <Camera className="h-4.5 w-4.5" /> Take a photo
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  data-testid="upload-photo"
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-cream/30 bg-white/[.06] px-5 text-[15px] font-semibold text-cream transition hover:bg-white/[.12] active:scale-95"
                >
                  <ImagePlus className="h-4.5 w-4.5" /> Upload a photo
                </button>
              </div>
              <span className="text-[13px] text-cream/60">
                <span className="hidden sm:inline">or drop it here · </span>JPG, PNG or HEIC
              </span>
              {/* Camera on phones */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} data-testid="camera-input" />
              {/* Photo library / files */}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} data-testid="file-input" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[14px] text-cream/70">
              <span>No photo handy? Try an example:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onExample(ex.id)}
                  data-testid={`example-${ex.id}`}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cream/15 bg-white/[.06] py-1 pl-1 pr-3 font-medium text-cream transition hover:bg-white/[.12] active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/examples/${ex.id}-thumb.jpg`} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                  {ex.label}
                </button>
              ))}
            </div>
            {options.allowList && (
              <div className="mt-4 text-center">
                {!listOpen ? (
                  <button type="button" onClick={() => setListOpen(true)} className="cursor-pointer text-[14px] font-semibold text-cream/80 underline-offset-4 hover:underline" data-testid="open-list">
                    Or type what you have
                  </button>
                ) : (
                  <form onSubmit={onList} className="mx-auto flex max-w-xl flex-col gap-2 sm:flex-row">
                    <input
                      autoFocus
                      value={list}
                      onChange={(e) => setList(e.target.value)}
                      placeholder="eggs, spinach, feta, lemon"
                      className="h-12 flex-1 rounded-full border border-cream/20 bg-white/[.06] px-5 text-[16px] text-cream placeholder:text-cream/60 outline-none focus:border-lime"
                      data-testid="list-input"
                    />
                    <button type="submit" disabled={list.split(/[,\n]/).filter((x) => x.trim()).length < 2} className="h-12 cursor-pointer rounded-full bg-tomato px-6 font-semibold text-white disabled:opacity-50">
                      Make my recipe
                    </button>
                  </form>
                )}
              </div>
            )}
            {last && !options.inApp && (
              <a href={`/r/${last.id}`} className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-butter px-4 py-2 text-[14px] font-semibold text-ink transition hover:brightness-105">
                Your {last.title} is waiting <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </m.div>
        )}

        {phase.kind === "working" && (
          <m.div key="working" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="overflow-hidden rounded-[28px] bg-ink-2 ring-1 ring-white/10" data-testid="working">
            <div className="relative aspect-[4/3] sm:aspect-[16/9]">
              {phase.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={phase.preview} alt="Your photo being scanned" className="h-full w-full object-cover opacity-80" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,#3a3226,#17150f)]" />
              )}
              <div className="absolute inset-0 bg-ink/30" />
              <ScanCorners tight />
              {!reduce && <div className="scan-line absolute inset-x-6 h-[3px] rounded-full bg-lime shadow-[0_0_24px_6px_rgb(200_255_61/.55)]" />}
              {pct > THRESH[1] &&
                [
                  [22, 30], [58, 24], [76, 52], [34, 64], [64, 78], [14, 80],
                ].map(([x, y], i) => (
                  <m.span key={i} className="absolute h-3 w-3 rounded-full border-2 border-white bg-lime shadow" style={{ left: `${x}%`, top: `${y}%` }} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: i * 0.25 }} />
                ))}
              <AnimatePresence>
                {stamp && (
                  <m.div className="absolute inset-0 grid place-items-center bg-ink/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <m.div
                      initial={reduce ? false : { scale: 1.6, rotate: -12, opacity: 0 }}
                      animate={{ scale: 1, rotate: -4, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 16 }}
                      className="rounded-2xl border-[3px] border-lime px-6 py-3 text-center text-lime"
                    >
                      <p className="font-serif text-[28px] font-semibold leading-none sm:text-[36px]">Your recipe is ready.</p>
                    </m.div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-5 p-5 sm:p-6">
              <ProgressRing value={pct} size={84} />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[22px] font-semibold text-cream">Making your recipe…</p>
                <ul className="mt-2 space-y-1.5">
                  {STEPS.map((s, i) => {
                    const done = pct >= (THRESH[i + 1] ?? 99) || stamp;
                    const active = !done && pct >= THRESH[i];
                    return (
                      <li key={s} className={cn("flex items-center gap-2 text-[14px] transition-colors", done ? "text-cream" : active ? "text-cream/90" : "text-cream/35")}>
                        <span className={cn("grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border transition", done ? "border-lime bg-lime text-ink" : active ? "border-lime/70" : "border-cream/25")}>
                          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> : null}
                        </span>
                        {s}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </m.div>
        )}

        {phase.kind === "done" && (
          <m.div key={"done" + phase.recipe.id} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}>
            <RecipeCard
              recipe={phase.recipe}
              onUnlock={openUnlock}
              onUpgrade={openUpgrade}
              justUnlocked={justUnlocked}
              onEditIngredients={(items) => run({ url: `/api/recipes/${phase.recipe.id}/rework`, json: { items } }, phase.recipe.photo_url ?? "")}
            />
            {!phase.recipe.access.unlocked && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <button type="button" onClick={openUnlock} data-testid="unlock-cta" className="group relative isolate flex h-16 w-full max-w-md cursor-pointer items-center justify-center gap-3 rounded-full bg-tomato text-[17px] font-semibold text-white transition hover:bg-tomato-deep active:scale-[0.955]">
                  <span aria-hidden className="btn-glow absolute -inset-2 -z-10 rounded-full bg-tomato/45 blur-xl" />
                  <Lock className="h-5 w-5" /> See my full recipe
                </button>
                <button type="button" onClick={reset} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-medium text-cream/70 hover:text-cream" data-testid="try-another">
                  <RotateCcw className="h-4 w-4" /> Try another photo
                </button>
              </div>
            )}
          </m.div>
        )}

        {phase.kind === "error" && (
          <m.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] bg-ink-2 p-6 text-center ring-1 ring-white/10" data-testid="scan-error">
            {phase.preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={phase.preview} alt="" className="mx-auto mb-4 h-28 w-40 rounded-xl object-cover opacity-70" />
            )}
            <p className="font-serif text-[22px] font-semibold text-cream">{phase.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {phase.retry && (
                <button onClick={phase.retry} className="h-12 cursor-pointer rounded-full bg-tomato px-6 font-semibold text-white active:scale-95">
                  Try again
                </button>
              )}
              <button onClick={() => { reset(); setTimeout(() => fileRef.current?.click(), 50); }} className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-white/10 px-6 font-semibold text-cream active:scale-95">
                <ImagePlus className="h-5 w-5" /> Use another photo
              </button>
            </div>
          </m.div>
        )}

        {phase.kind === "limit" && (
          <m.div key="limit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] bg-ink-2 p-6 text-center ring-1 ring-white/10" data-testid="scan-limit">
            <p className="font-serif text-[24px] font-semibold text-cream">{phase.message}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {phase.reason === "anon_limit" ? (
                <a href="/signup" className="inline-flex h-12 items-center rounded-full bg-tomato px-6 font-semibold text-white">Create my free account</a>
              ) : (
                <button onClick={() => openUpgrade("quota")} className="h-12 cursor-pointer rounded-full bg-tomato px-6 font-semibold text-white">See plans</button>
              )}
              {last && (
                <a href={`/r/${last.id}`} className="inline-flex h-12 items-center rounded-full bg-white/10 px-6 font-semibold text-cream">Open my last recipe</a>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
        {phase.kind === "done" && !phase.recipe.access.unlocked && featured && (
          <m.div initial={{ y: 90 }} animate={{ y: 0 }} transition={{ delay: 0.6, type: "spring", damping: 26 }} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 sm:hidden">
            <button type="button" onClick={openUnlock} data-testid="sticky-unlock" className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-tomato text-[16px] font-semibold text-white shadow-[0_12px_30px_-8px_rgb(0_0_0/.5)] active:scale-[0.97]">
              <Lock className="h-4.5 w-4.5" /> See my full recipe · {featured.per_day}
            </button>
          </m.div>
        )}

    </div>
  );
}

function ScanCorners({ tight }: { tight?: boolean }) {
  const pos = tight ? "inset-4" : "inset-3";
  const c = "absolute h-7 w-7 border-lime";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute", pos)}>
      <span className={cn(c, "left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]")} />
      <span className={cn(c, "right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]")} />
      <span className={cn(c, "bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]")} />
      <span className={cn(c, "bottom-0 right-0 rounded-br-xl border-b-[3px] border-r-[3px]")} />
    </span>
  );
}

export { PhotoWithStickers };
