"use client";
import * as React from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import { Camera, Check, Clock, Pause, Play, RotateCcw, Trash2, Receipt, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sticker, toneCycle } from "@/components/ui/sticker";

/** Motion-design VSL: 7 scenes, ~60 s, built in HTML/CSS/JS. Voice-over script in VSL.md. */
const SCENES = [
  { dur: 8000, caption: "6:12 PM. The fridge is full. And you have zero ideas." },
  { dur: 8500, caption: "So the spinach goes in the trash. And you order takeout. Again." },
  { dur: 8000, caption: "What if your fridge could just tell you what to cook?" },
  { dur: 9000, caption: "Snap one photo. Platepal spots every ingredient." },
  { dur: 9500, caption: "Seconds later: a real recipe, made from what you have." },
  { dur: 8500, caption: "Less food in the trash. More dinners you're proud of." },
  { dur: 8000, caption: "Tonight's dinner is already in your fridge." },
];
const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

const ITEMS = ["Eggs", "Spinach", "Feta", "Cherry tomatoes", "Lemon", "Chicken thighs"];

export function Vsl({ videoSrc }: { videoSrc?: string | null }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [t, setT] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [ended, setEnded] = React.useState(false);

  React.useEffect(() => {
    if (videoSrc || reduce || !inView || !playing || ended) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      setT((x) => {
        const n = x + (now - last);
        if (n >= TOTAL) {
          setEnded(true);
          return TOTAL - 1;
        }
        return n;
      });
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [inView, playing, ended, reduce, videoSrc]);

  if (videoSrc) {
    return (
      <div className="overflow-hidden rounded-[28px] ring-1 ring-white/10">
        <video src={videoSrc} className="aspect-video w-full" autoPlay muted playsInline controls />
      </div>
    );
  }

  let acc = 0;
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) {
    if (t < acc + SCENES[i].dur) {
      idx = i;
      break;
    }
    acc += SCENES[i].dur;
  }
  const local = (t - acc) / SCENES[idx].dur;

  const jump = (i: number) => {
    setT(SCENES.slice(0, i).reduce((a, s) => a + s.dur, 0));
    setEnded(false);
    setPlaying(true);
  };

  return (
    <div ref={ref} className="relative overflow-hidden rounded-[28px] bg-ink-2 ring-1 ring-white/10" data-testid="vsl">
      <div className="relative aspect-[4/5] sm:aspect-video">
        <div className="dot-grid absolute inset-0 opacity-60" />
        <AnimatePresence mode="wait">
          <m.div key={idx} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Scene i={idx} p={reduce ? 1 : local} />
          </m.div>
        </AnimatePresence>

        {/* Big captions */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent px-5 pb-16 pt-16 sm:px-10 sm:pb-20">
          <AnimatePresence mode="wait">
            <m.p
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 0.8, 0.24, 1] }}
              className="mx-auto max-w-3xl text-center font-serif text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-cream sm:text-[40px]"
            >
              {SCENES[idx].caption}
            </m.p>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-4 sm:px-6">
          <button
            type="button"
            aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}
            onClick={() => (ended ? jump(0) : setPlaying((p) => !p))}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-cream backdrop-blur transition hover:bg-white/20 active:scale-95"
            data-testid="vsl-toggle"
          >
            {ended ? <RotateCcw className="h-4 w-4" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex flex-1 gap-1.5">
            {SCENES.map((s, i) => (
              <button key={i} type="button" aria-label={`Scene ${i + 1}`} onClick={() => jump(i)} className="h-6 flex-1 cursor-pointer py-2.5">
                <span className="block h-1 overflow-hidden rounded-full bg-white/15">
                  <span className="block h-full rounded-full bg-lime" style={{ width: i < idx ? "100%" : i === idx ? `${Math.min(100, local * 100)}%` : "0%" }} />
                </span>
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-cream/60">
            {fmt(t)} / {fmt(TOTAL)}
          </span>
        </div>
      </div>
    </div>
  );
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* -------- the 7 scenes (drawn in SVG/CSS, animated by progress p in 0..1) -------- */

function Scene({ i, p }: { i: number; p: number }) {
  switch (i) {
    case 0:
      return <SceneFridge p={p} />;
    case 1:
      return <SceneTrash p={p} />;
    case 2:
      return <SceneClick p={p} />;
    case 3:
      return <SceneScan p={p} />;
    case 4:
      return <SceneRecipe p={p} />;
    case 5:
      return <SceneChange p={p} />;
    default:
      return <SceneCta p={p} />;
  }
}

const stage = "absolute inset-x-0 top-0 bottom-[32%] grid place-items-center sm:bottom-[30%]";

function FridgeArt({ open = 1, dim = 0 }: { open?: number; dim?: number }) {
  return (
    <svg viewBox="0 0 320 260" className="h-full max-h-[300px] w-auto" aria-hidden>
      <rect x="70" y="10" width="180" height="240" rx="18" fill="#e9e4d8" />
      <rect x="80" y="20" width="160" height="220" rx="12" fill="#fffaf0" />
      <rect x="80" y="20" width="160" height="220" rx="12" fill="#17150f" opacity={dim * 0.5} />
      {[90, 160].map((y) => (
        <rect key={y} x="84" y={y} width="152" height="5" rx="2" fill="#cfd8db" />
      ))}
      <g opacity={1 - dim * 0.6}>
        <ellipse cx="110" cy="76" rx="11" ry="14" fill="#fbf3e4" stroke="#d9c7a8" />
        <ellipse cx="132" cy="76" rx="11" ry="14" fill="#fbf3e4" stroke="#d9c7a8" />
        <rect x="160" y="62" width="40" height="28" rx="6" fill="#2f6fb5" />
        <circle cx="216" cy="80" r="11" fill="#f6d33c" />
        <path d="M98 155 l8 -40 q20 -6 40 0 l8 40z" fill="#3f8a36" />
        <circle cx="180" cy="145" r="9" fill="#e2412b" />
        <circle cx="198" cy="148" r="9" fill="#e2412b" />
        <circle cx="189" cy="132" r="9" fill="#e2412b" />
        <rect x="104" y="196" width="64" height="38" rx="8" fill="#f0b9a8" />
        <rect x="188" y="180" width="30" height="54" rx="6" fill="#fff" stroke="#cfd8db" />
      </g>
      {/* door, hinged on the right: swings open by shrinking toward its hinge */}
      <g style={{ transform: `scaleX(${1 - open * 0.86})`, transformOrigin: "252px 130px", transition: "transform .25s ease-out" }}>
        <rect x="70" y="10" width="182" height="240" rx="18" fill="#d9d3c4" />
        <rect x="88" y="30" width="8" height="70" rx="4" fill="#b9b2a2" />
      </g>
    </svg>
  );
}

function SceneFridge({ p }: { p: number }) {
  return (
    <div className={stage}>
      <div className="relative flex h-full items-center gap-6 py-6">
        <FridgeArt open={Math.min(1, p * 3)} />
        <m.div className="absolute -right-2 top-8 flex items-center gap-2 rounded-2xl bg-ink px-3 py-2 font-mono text-[20px] text-cream ring-1 ring-white/15 sm:-right-24 sm:text-[26px]" animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <Clock className="h-5 w-5 text-tomato" /> 6:12 PM
        </m.div>
      </div>
    </div>
  );
}

function SceneTrash({ p }: { p: number }) {
  return (
    <div className={stage}>
      <div className="relative flex items-end gap-6 sm:gap-12">
        <div className="relative">
          <m.div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${-40 + Math.min(1, p * 2) * 90}px`, opacity: 1 - Math.max(0, p * 2 - 1.4) }}>
            <svg viewBox="0 0 60 60" className="h-14 w-14"><path d="M10 50 l6 -38 q14 -6 28 0 l6 38z" fill="#3f8a36" /></svg>
          </m.div>
          <div className="grid h-36 w-28 place-items-center rounded-b-3xl rounded-t-lg bg-ink-3 ring-1 ring-white/10 sm:h-44 sm:w-32">
            <Trash2 className="h-12 w-12 text-cream/60" />
          </div>
        </div>
        <m.div className="w-44 rounded-2xl bg-paper p-4 text-ink shadow-xl sm:w-52" initial={{ y: 40, rotate: 6, opacity: 0 }} animate={{ y: 0, rotate: -3, opacity: p > 0.35 ? 1 : 0 }} transition={{ type: "spring", damping: 16 }}>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted"><Receipt className="h-4 w-4" /> Delivery</p>
          <div className="mt-3 space-y-1.5 font-mono text-[13px]">
            <p className="flex justify-between"><span>Pad thai</span><span>$18.50</span></p>
            <p className="flex justify-between"><span>Fees + tip</span><span>$11.20</span></p>
            <p className="flex justify-between border-t border-dashed border-line pt-1.5 font-semibold"><span>Total</span><span>$29.70</span></p>
          </div>
          <p className="mt-2 text-[11px] text-muted">Example order</p>
        </m.div>
      </div>
    </div>
  );
}

function SceneClick({ p }: { p: number }) {
  return (
    <div className={stage}>
      <m.div className="relative" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 14 }}>
        <div className="grid h-28 w-28 place-items-center rounded-[32px] bg-tomato shadow-[0_20px_60px_-10px_rgb(210_64_42/.8)] sm:h-36 sm:w-36">
          <svg viewBox="0 0 32 32" className="h-16 w-16 sm:h-20 sm:w-20"><circle cx="16" cy="17" r="12" fill="none" stroke="#FBF6EC" strokeWidth="2.4" /><circle cx="16" cy="17" r="6.5" fill="none" stroke="#FBF6EC" strokeOpacity=".6" strokeWidth="1.6" /><path d="M16 4.5c1.6-2.6 4.7-3.4 7.4-2.4-.6 2.9-3.2 4.9-6.2 4.7" fill="#C8FF3D" /></svg>
        </div>
        {[0, 1, 2].map((k) => (
          <m.span key={k} className="absolute inset-0 rounded-[32px] border-2 border-lime" animate={{ scale: [1, 1.8], opacity: [0.6, 0] }} transition={{ repeat: Infinity, duration: 2.2, delay: k * 0.7 }} />
        ))}
        <m.p className="mt-6 text-center font-serif text-3xl font-semibold text-cream sm:text-4xl" style={{ opacity: Math.min(1, p * 3) }}>
          Platepal
        </m.p>
      </m.div>
    </div>
  );
}

function MiniPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[92%] max-h-[340px] aspect-[9/17] rounded-[34px] bg-black p-[6px] shadow-2xl ring-1 ring-white/15">
      <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-cream">
        <div className="absolute left-1/2 top-2 z-20 h-4 w-14 -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

function SceneScan({ p }: { p: number }) {
  const shown = Math.floor(Math.max(0, p - 0.2) * 10);
  return (
    <div className={stage}>
      <MiniPhone>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/examples/half-empty-fridge.jpg" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-ink/25" />
        <div className="absolute inset-x-3 h-[3px] rounded-full bg-lime shadow-[0_0_18px_4px_rgb(200_255_61/.6)]" style={{ top: `${10 + ((p * 2) % 1) * 80}%` }} />
        {ITEMS.slice(0, shown).map((it, k) => (
          <m.div key={it} className="absolute" style={{ left: `${[10, 46, 22, 40, 62, 50][k]}%`, top: `${[22, 22, 50, 56, 30, 64][k]}%` }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Sticker tone={toneCycle[k % 3]} className="text-[10px]">{it}</Sticker>
          </m.div>
        ))}
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-tomato text-white ring-4 ring-white/60"><Camera className="h-5 w-5" /></span>
        </div>
      </MiniPhone>
    </div>
  );
}

function SceneRecipe({ p }: { p: number }) {
  const lines = ["Season the chicken with lemon and garlic", "Sear 6 minutes per side", "Wilt the spinach in the pan", "Top with tomatoes and feta"];
  return (
    <div className={stage}>
      <div className="recipe-card w-[84%] max-w-[420px] p-5 text-ink sm:p-6">
        <p className="label-mono text-olive">Uses 6 of your 7 ingredients</p>
        <p className="mt-1 font-serif text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[30px]">Lemon-Garlic Chicken Skillet</p>
        <p className="mt-1 flex items-center gap-3 text-[13px] text-muted"><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />20 min</span> Serves 2 · Easy</p>
        <ol className="mt-3 space-y-2">
          {lines.map((l, k) => (
            <m.li key={l} className="flex items-center gap-2.5 text-[14px]" style={{ opacity: p > 0.15 + k * 0.15 ? 1 : 0.12 }}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] text-cream">{k + 1}</span>
              {l}
            </m.li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-muted">Example recipe</p>
      </div>
    </div>
  );
}

function SceneChange({ p }: { p: number }) {
  const facts = [
    { big: "1", small: "photo. No typing." },
    { big: "~10s", small: "from photo to recipe" },
    { big: "0", small: "account needed to try" },
  ];
  return (
    <div className={stage}>
      <div className="grid w-[88%] max-w-2xl grid-cols-3 gap-2 sm:gap-4">
        {facts.map((f, k) => (
          <m.div key={f.small} className="rounded-2xl bg-white/[.06] p-3 text-center ring-1 ring-white/10 sm:p-6" style={{ opacity: p > k * 0.2 ? 1 : 0, transform: `translateY(${p > k * 0.2 ? 0 : 12}px)`, transition: "all .5s cubic-bezier(.22,.8,.24,1)" }}>
            <p className="font-serif text-[34px] font-semibold text-lime sm:text-[56px]">{f.big}</p>
            <p className="mt-1 text-[12px] text-cream/70 sm:text-[15px]">{f.small}</p>
          </m.div>
        ))}
      </div>
    </div>
  );
}

function SceneCta({ p }: { p: number }) {
  return (
    <div className={stage}>
      <div className="text-center">
        <div className="mx-auto flex w-fit items-center gap-3">
          <FridgeArt open={1} />
        </div>
        <a
          href="#try"
          className={cn("pointer-events-auto mx-auto -mt-4 flex w-fit items-center gap-2 rounded-full bg-tomato px-6 py-3.5 font-semibold text-white shadow-[0_12px_30px_-8px_rgb(210_64_42/.9)] transition", p > 0.25 ? "opacity-100" : "opacity-0")}
        >
          <Sparkles className="h-4.5 w-4.5" /> Make my recipe
        </a>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-cream/60"><Check className="h-4 w-4 text-lime" /> Free to try · No card</p>
      </div>
    </div>
  );
}
