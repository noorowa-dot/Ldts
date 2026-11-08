import type { Metadata } from "next";
import { Legal } from "@/components/legal";

export const metadata: Metadata = { title: "Terms of Service", description: "The simple rules for using Platepal." };

export default function Page() {
  return (
    <Legal title="Terms of Service" updated="November 8, 2026">
      <p>By using Platepal you agree to these terms. They are short on purpose.</p>
      <h2>What Platepal does</h2>
      <p>Platepal uses AI to suggest recipes from photos of your food. Suggestions can be wrong: always check ingredients for allergies, check that food is fresh and safe, and cook meat and eggs to a safe temperature. Nutrition numbers are estimates, not medical advice.</p>
      <h2>Your account</h2>
      <p>Keep your password safe. You are responsible for what happens in your account. Upload only photos you have the right to use.</p>
      <h2>Free tries and plans</h2>
      <ul>
        <li>You can try Platepal for free, with a small daily limit.</li>
        <li>Paid plans renew automatically every month or year until you cancel. Prices are in USD.</li>
        <li>Each plan includes a number of recipes per billing period, shown before you pay.</li>
        <li>Cancel anytime from Account → Billing. You keep your plan until the end of the period you paid for.</li>
        <li>Payments are processed by Whop through Kwop.</li>
      </ul>
      <h2>Fair use</h2>
      <p>Don&apos;t abuse the service, try to break it, or use it to make automated requests. We may limit or close accounts that do.</p>
      <h2>Changes</h2>
      <p>We may update these terms. If a change matters, we&apos;ll tell you in the app before it applies.</p>
      <h2>Liability</h2>
      <p>Platepal is provided as is. To the extent the law allows, we are not liable for indirect damages, and our total liability is limited to what you paid us in the last 12 months.</p>
    </Legal>
  );
}
