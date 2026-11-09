// One-off migration runner: node scripts/migrate.mjs <path-to.sql>
// Reads SUPABASE_DB_PASSWORD and SUPABASE_PROJECT_REF from env. Tries the direct
// host first, then the session poolers (free-tier direct host is IPv6-only).
import { readFileSync } from "node:fs";
import pg from "pg";

const ref = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
const file = process.argv[2];
if (!ref || !password || !file) {
  console.error("Usage: SUPABASE_PROJECT_REF=... SUPABASE_DB_PASSWORD=... node scripts/migrate.mjs <file.sql>");
  process.exit(1);
}
const sql = readFileSync(file, "utf8");

const candidates = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  ...["aws-1-ap-northeast-2", "aws-0-ap-northeast-2", "aws-1-ap-southeast-1", "aws-0-ap-southeast-1"].map((r) => ({
    host: `${r}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${ref}`,
  })),
];

let lastErr;
for (const c of candidates) {
  const client = new pg.Client({ ...c, database: "postgres", password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    console.log(`connected via ${c.host}`);
    await client.query(sql);
    console.log(`applied ${file}`);
    await client.end();
    process.exit(0);
  } catch (e) {
    lastErr = e;
    console.error(`  ${c.host}: ${e.code ?? ""} ${e.message}`);
    try { await client.end(); } catch {}
    if (e.code === "42P07" || /already exists/.test(e.message) || e.severity === "ERROR") break; // SQL error, not connectivity
  }
}
console.error("migration failed:", lastErr?.message);
process.exit(1);
