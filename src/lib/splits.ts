import "server-only";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { PaymentDetails, SplitShare, SplitWithShares } from "./types";

export function sortShares(shares: SplitShare[]) {
  return [...shares].sort((a, b) => a.position - b.position);
}

/** Organizer view: RLS ensures only the owner gets rows back. */
export async function getOwnedSplit(id: string): Promise<SplitWithShares | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("splits")
    .select("*, shares:split_shares(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const split = data as SplitWithShares;
  split.shares = sortShares(split.shares);
  return split;
}

export type PublicSplit = SplitWithShares & { organizer: PaymentDetails };

/** Payer view: service role, by short code. Returns organizer payment details. */
export async function getPublicSplit(code: string): Promise<PublicSplit | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("splits")
    .select("*, shares:split_shares(*), organizer:profiles!splits_owner_user_id_fkey(name, raast_id, iban, wallet_number, wallet_type)")
    .eq("short_code", code.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  const split = data as unknown as PublicSplit;
  split.shares = sortShares(split.shares);
  return split;
}

export function splitStats(split: SplitWithShares) {
  const payers = split.shares.filter((s) => !s.is_owner);
  const confirmed = payers.filter((s) => s.status === "confirmed");
  const pending = payers.filter((s) => s.status === "pending");
  const waived = payers.filter((s) => s.status === "waived");
  const outstanding = payers.filter((s) => s.status === "unpaid" || s.status === "rejected" || s.status === "pending");
  return {
    payers,
    confirmed,
    pending,
    waived,
    outstanding,
    collected: confirmed.reduce((a, s) => a + s.amount, 0),
    remaining: outstanding.reduce((a, s) => a + s.amount, 0),
    doneCount: confirmed.length + waived.length,
  };
}

/** Short-lived signed URL for a private screenshot. Organizer only. */
export async function signedScreenshotUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from("screenshots").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
