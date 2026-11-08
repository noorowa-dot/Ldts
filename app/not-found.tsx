import Link from "next/link";
export default function NotFound() {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-ink px-6 text-center text-cream">
      <div className="dot-grid absolute inset-0" />
      <div className="relative">
        <p className="label-mono text-cream/50">[ 404 ]</p>
        <h1 className="mt-3 font-serif text-[40px] font-semibold tracking-[-0.03em]">This page isn&apos;t on the menu.</h1>
        <p className="mt-2 text-cream/65">But tonight&apos;s dinner might be in your fridge.</p>
        <Link href="/" className="mt-7 inline-flex h-12 items-center rounded-full bg-tomato px-6 font-semibold text-white">Make my recipe</Link>
      </div>
    </main>
  );
}
