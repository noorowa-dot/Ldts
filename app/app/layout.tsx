import type { Metadata } from "next";
import { requireMe } from "@/lib/me";
import { MeProvider } from "@/components/app/me-context";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = { title: "My kitchen", robots: { index: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const me = await requireMe("/app");
  return (
    <MeProvider me={me}>
      <AppShell>{children}</AppShell>
    </MeProvider>
  );
}
