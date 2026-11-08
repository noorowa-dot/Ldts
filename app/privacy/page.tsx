import type { Metadata } from "next";
import { Legal } from "@/components/legal";

export const metadata: Metadata = { title: "Privacy Policy", description: "What Platepal keeps, why, and how to delete it." };

export default function Page() {
  return (
    <Legal title="Privacy Policy" updated="November 8, 2026">
      <p>Platepal turns a photo of your fridge into a recipe. We keep only what the app needs to do that, and you can delete it at any time.</p>
      <h2>What we keep</h2>
      <ul>
        <li>Your email address and password (stored securely by our login provider; we never see your password).</li>
        <li>The fridge photos you upload, the ingredients we detect and the recipes we make for you.</li>
        <li>Your settings and answers, such as dietary filters and a calorie target.</li>
        <li>Usage counts, so we can apply your plan&apos;s monthly recipe limit.</li>
        <li>Where you came from (for example a referral link or a campaign tag), so we know what works.</li>
      </ul>
      <h2>Your photos</h2>
      <p>Photos are stored in a private storage bucket. Only you can see them, through short-lived private links. Delete a recipe to delete its photo, or delete your account to delete everything. Photos uploaded before you create an account are linked to your device and are deleted if you never sign up.</p>
      <h2>Services we use</h2>
      <ul>
        <li><b>Supabase</b>: database, login and photo storage.</li>
        <li><b>Vercel</b>: hosting.</li>
        <li><b>Google Gemini</b>: reads your photo and writes the recipe. Photos are sent to Google only to make your recipe.</li>
        <li><b>Whop, through Kwop</b>: payments. Card details go straight to Whop; we never see or store them.</li>
        <li><b>Kwop</b>: visit analytics by Kwop on our public pages (landing page, sign-up, log-in), and anonymous product events (such as &quot;sign-up&quot; or &quot;recipe made&quot;) tied to your email to show the owner how the product is doing.</li>
      </ul>
      <h2>Cookies</h2>
      <p>We use first-party cookies to keep you logged in, to remember your free tries on this device, and to remember a referral link for 30 days.</p>
      <h2>Your rights</h2>
      <p>You can see, change or delete your data at any time from Account. Deleting your account removes your profile, recipes and photos, and cancels any active plan. Questions: use the contact on our Kwop page.</p>
      <p>We never sell your data.</p>
    </Legal>
  );
}
