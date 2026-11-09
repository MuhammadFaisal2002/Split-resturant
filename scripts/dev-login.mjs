// Dev helper: prints a one-time login URL for a test organizer, no email needed.
// Usage: node --env-file=.env.local scripts/dev-login.mjs [email]
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] || "test-organizer@splitapp.test";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error("generateLink failed:", error.message);
  process.exit(1);
}
const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002").replace(/\/$/, "");
console.log(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/home`);
