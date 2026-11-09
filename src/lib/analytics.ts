import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { EventName } from "./types";

/** Fire-and-forget analytics event into the `events` table. Never throws. */
export async function track(
  name: EventName,
  data: { split_id?: string; share_id?: string; user_id?: string; props?: Record<string, unknown> } = {}
) {
  try {
    const admin = createAdminClient();
    await admin.from("events").insert({
      name,
      split_id: data.split_id ?? null,
      share_id: data.share_id ?? null,
      user_id: data.user_id ?? null,
      props: data.props ?? {},
    });
  } catch (err) {
    console.error("[analytics] failed to track", name, err);
  }
}
