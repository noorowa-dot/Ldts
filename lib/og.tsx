import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Fraunces-SemiBold.ttf")),
  readFile(join(process.cwd(), "assets/fonts/DMSans-Medium.ttf")),
  readFile(join(process.cwd(), "assets/fonts/DMSans-Bold.ttf")),
]);

const TONES = [
  ["#E9EDD6", "#6B7A2E"],
  ["#FBF0CF", "#7A5A0A"],
  ["#FDE3DC", "#C93A23"],
];

/** Platepal's branded share image: a recipe card on the dark kitchen background. */
export async function renderOg({ kicker, title, items, meta }: { kicker: string; title: string; items: string[]; meta?: string }) {
  const [fraunces, dmMedium, dmBold] = await fonts;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#17150F", padding: 56, position: "relative" }}>
        <div style={{ position: "absolute", top: -200, left: 300, width: 600, height: 400, borderRadius: 9999, background: "rgba(229,72,47,0.28)", filter: "blur(80px)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#FFFDF8", borderRadius: 32, padding: "48px 56px", position: "relative", borderTop: "8px solid #D2402A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 9999, background: "#D2402A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 26, height: 26, borderRadius: 9999, border: "3px solid rgba(251,246,236,.6)", display: "flex" }} />
            </div>
            <span style={{ fontFamily: "Fraunces", fontSize: 32, color: "#1F1B14" }}>Platepal</span>
            <span style={{ marginLeft: "auto", fontFamily: "DM Sans", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: "#6B7A2E", textTransform: "uppercase" }}>{kicker}</span>
          </div>
          <div style={{ fontFamily: "Fraunces", fontSize: title.length > 34 ? 64 : 78, lineHeight: 1.02, letterSpacing: -2, color: "#1F1B14", marginTop: 36, display: "flex" }}>{title}</div>
          {meta && <div style={{ fontFamily: "DM Sans", fontWeight: 500, fontSize: 26, color: "#6F6656", marginTop: 14, display: "flex" }}>{meta}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "auto" }}>
            {items.slice(0, 7).map((it, i) => (
              <div key={it + i} style={{ display: "flex", alignItems: "center", gap: 8, background: TONES[i % 3][0], color: TONES[i % 3][1], borderRadius: 9999, padding: "10px 20px", fontFamily: "DM Sans", fontWeight: 700, fontSize: 24 }}>
                <div style={{ width: 9, height: 9, borderRadius: 9999, background: TONES[i % 3][1], display: "flex" }} />
                {it}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "DM Sans", data: dmMedium, weight: 500, style: "normal" },
        { name: "DM Sans", data: dmBold, weight: 700, style: "normal" },
      ],
    }
  );
}
