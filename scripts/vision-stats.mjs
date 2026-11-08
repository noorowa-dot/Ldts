// What the fridge reader is learning: the most common corrections people make ("Fix the ingredients").
// Usage: node scripts/vision-stats.mjs [--remote]
import { execFileSync } from "node:child_process";
const remote = process.argv.includes("--remote");
const q = (sql) => {
  const out = execFileSync("npx", ["supabase", "db", "query", "--read-only", "-o", "json", ...(remote ? ["--remote"] : []), sql], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out.slice(out.indexOf("{"))).rows;
};
const fixes = q("select count(*)::int as n, count(distinct user_id)::int as kitchens from public.vision_feedback")[0];
console.log(`${fixes.n} photo corrections from ${fixes.kitchens} kitchens`);
console.log("\nOften listed by mistake:");
console.table(q("select lower(x) as item, count(*)::int as times from public.vision_feedback, unnest(removed) x group by 1 order by 2 desc limit 15"));
console.log("Often missed:");
console.table(q("select lower(x) as item, count(*)::int as times from public.vision_feedback, unnest(added) x group by 1 order by 2 desc limit 15"));
console.log("Mix-ups (seen as → really):");
console.table(q("select lower(a) as seen_as, lower(b) as really, count(*)::int as times from public.vision_feedback, unnest(removed) a, unnest(added) b where cardinality(removed) <= 2 and cardinality(added) <= 2 group by 1, 2 order by 3 desc limit 15"));
