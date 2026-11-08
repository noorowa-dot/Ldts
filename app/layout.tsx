import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { MotionProvider } from "@/components/motion-provider";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600"],
  display: "optional",
});
const dmSans = DM_Sans({ variable: "--font-dmsans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const dmMono = DM_Mono({ variable: "--font-dmmono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Platepal: snap your fridge, get tonight's recipe",
    template: "%s · Platepal",
  },
  description:
    "Take a photo of your fridge and Platepal writes a real recipe from what you already have. Step by step, ready in about 10 seconds.",
  applicationName: "Platepal",
  appleWebApp: { capable: true, title: "Platepal", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", siteName: "Platepal", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#17150f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable} ${dmMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
