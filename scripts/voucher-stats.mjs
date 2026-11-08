// Creator / voucher stats: how many accounts each voucher brought in, and how many of them later paid (via Kwop `k`).
// Usage: node scripts/voucher-stats.mjs [--remote]
import { execFileSync } from "node:child_process";
const remote = process.argv.includes("--remote");
const sql = `select coalesce(v.creator, v.note, '(no name)') as who, v.tier, v.months, v.uses, v.max_uses, v.k,
  to_char(v.created_at, 'YYYY-MM-DD') as created, max(r.created_at)::date as last_redeemed
  from public.vouchers v left join public.voucher_redemptions r on r.code_hash = v.code_hash
  group by v.code_hash order by v.uses desc, v.created_at desc`;
const out = execFileSync("npx", ["supabase", "db", "query", "--read-only", "-o", "json", ...(remote ? ["--remote"] : []), sql], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const rows = JSON.parse(out.slice(out.indexOf("{"))).rows;
console.table(rows.map((r) => ({ creator: r.who, plan: r.tier, free: r.months ? `${r.months} mo` : "forever", used: `${r.uses}/${r.max_uses}`, kwop_k: r.k ?? "", last: r.last_redeemed ?? "" })));
console.log("Paid conversions per creator show in your Kwop dashboard under the creator's link (k).");
