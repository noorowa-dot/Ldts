// Creates a voucher (free access to a plan) and prints its code ONCE. Only the hash is stored.
// Usage: node scripts/make-voucher.mjs --tier chef [--email someone@example.com] [--uses 1] [--months 3] [--expires 2027-01-31] [--note "Creator X"] [--remote]
// Without --remote it writes to the local Supabase; with --remote to production (needs `npx supabase login` + link).
import { createHash, randomInt } from "node:crypto";
import { execFileSync } from "node:child_process";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]] : a), []));
const tier = String(args.tier || "pro");
if (!["starter", "pro", "chef"].includes(tier)) throw new Error("--tier must be starter, pro or chef");
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const part = () => Array.from({ length: 4 }, () => ABC[randomInt(ABC.length)]).join("");
const code = `PP-${part()}-${part()}-${part()}`;
const hash = createHash("sha256").update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
const q = (v) => (v === undefined || v === true ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const sql = `insert into public.vouchers (code_hash, tier, email, max_uses, months, expires_at, note) values ('${hash}', '${tier}', ${q(args.email)}, ${Number(args.uses || 1)}, ${args.months ? Number(args.months) : "null"}, ${q(args.expires)}, ${q(args.note)})`;
const cmd = ["supabase", "db", "query", "--yes", ...(args.remote ? ["--remote"] : []), sql];
execFileSync("npx", cmd, { stdio: ["ignore", "ignore", "inherit"] });
console.log(`Voucher created (${tier}${args.email ? `, only for ${args.email}` : ""}${args.months ? `, ${args.months} months` : ", no end date"}):\n\n   ${code}\n\nIt is shown only now: copy it.`);
