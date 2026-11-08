import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-cream px-4 py-10 text-text">
      <div className="mx-auto max-w-[680px]">
        <Link href="/" aria-label="Platepal home"><Logo /></Link>
        <h1 className="mt-10 text-[40px] font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-1 text-[14px] text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-5 text-[16px] leading-relaxed [&_h2]:mt-8 [&_h2]:font-sans [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:tracking-normal [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
          {children}
        </div>
        <p className="mt-12 text-[14px] text-muted"><Link href="/" className="underline">Back to Platepal</Link></p>
      </div>
    </main>
  );
}
