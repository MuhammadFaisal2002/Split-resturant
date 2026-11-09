"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClaimToken } from "@/lib/shortcode";
import { track } from "@/lib/analytics";
import { sendMarkedPaidEmail } from "@/lib/email";
import type { Split, SplitShare } from "@/lib/types";
import { claimCookieName } from "@/lib/claim";

const ONE_YEAR = 60 * 60 * 24 * 365;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export type PayerActionState = { error?: string; ok?: boolean };


async function loadSplit(code: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("splits").select("*").eq("short_code", code.toLowerCase()).maybeSingle();
  return { admin, split: (data as Split | null) ?? null };
}

/** Payer taps their name. Stores a device token in a cookie so this device stays mapped. */
export async function claimShare(code: string, shareId: string): Promise<PayerActionState> {
  const { admin, split } = await loadSplit(code);
  if (!split) return { error: "This split no longer exists." };
  if (split.status !== "open") return { error: "This split is finished." };

  const token = generateClaimToken();
  // Atomic: only claims if nobody else has.
  const { data, error } = await admin
    .from("split_shares")
    .update({ claimed_token: token })
    .eq("id", shareId)
    .eq("split_id", split.id)
    .eq("is_owner", false)
    .is("claimed_token", null)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Someone else already claimed that name. Ask the organizer to unclaim it if that's you." };

  const cookieStore = await cookies();
  cookieStore.set(claimCookieName(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });

  await track("name_claimed", { split_id: split.id, share_id: shareId });
  revalidatePath(`/s/${code}`);
  return { ok: true };
}

/** "Not you?" — release the claim, only while nothing has been marked paid. */
export async function unclaimOwnShare(code: string): Promise<PayerActionState> {
  const { admin, split } = await loadSplit(code);
  if (!split) return { error: "This split no longer exists." };
  const cookieStore = await cookies();
  const name = claimCookieName(code);
  const token = cookieStore.get(name)?.value;
  if (token) {
    await admin
      .from("split_shares")
      .update({ claimed_token: null })
      .eq("split_id", split.id)
      .eq("claimed_token", token)
      .in("status", ["unpaid", "rejected"]);
  }
  cookieStore.delete(name);
  revalidatePath(`/s/${code}`);
  return { ok: true };
}

/** Payer says "I've paid", optionally with a screenshot + note. */
export async function markPaid(code: string, _prev: PayerActionState, formData: FormData): Promise<PayerActionState> {
  const { admin, split } = await loadSplit(code);
  if (!split) return { error: "This split no longer exists." };
  if (split.status !== "open") return { error: "This split is finished." };

  const cookieStore = await cookies();
  const token = cookieStore.get(claimCookieName(code))?.value;
  if (!token) return { error: "Tap your name first so we know who paid." };

  const { data: shareData } = await admin
    .from("split_shares")
    .select("*")
    .eq("split_id", split.id)
    .eq("claimed_token", token)
    .maybeSingle();
  const share = shareData as SplitShare | null;
  if (!share) return { error: "We couldn't find your name on this split. Tap your name again." };
  if (share.status === "confirmed") return { error: "Your payment is already confirmed." };
  if (share.status === "pending") return { error: "Already marked. Waiting for the organizer to confirm." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  let screenshot_path: string | null = share.screenshot_path;

  const file = formData.get("screenshot");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SCREENSHOT_BYTES) return { error: "Screenshot must be under 5 MB." };
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return { error: "Please upload an image (JPG, PNG, WebP)." };
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${split.id}/${share.id}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from("screenshots").upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) return { error: "Couldn't upload the screenshot. Try again or skip it." };
    screenshot_path = path;
  }

  const { error } = await admin
    .from("split_shares")
    .update({ status: "pending", note, screenshot_path, marked_paid_at: new Date().toISOString(), reject_reason: null })
    .eq("id", share.id);
  if (error) return { error: error.message };

  await track("marked_paid", { split_id: split.id, share_id: share.id, props: { has_screenshot: !!screenshot_path, has_note: !!note } });

  // Notify the organizer by email if they opted in and email is configured.
  const { data: owner } = await admin
    .from("profiles")
    .select("name, email, notify_email")
    .eq("id", split.owner_user_id)
    .maybeSingle();
  if (owner?.email && owner.notify_email) {
    await sendMarkedPaidEmail({
      to: owner.email,
      organizerName: owner.name,
      payerName: share.display_name,
      amount: share.amount,
      title: split.title,
      splitId: split.id,
      note,
      hasScreenshot: !!screenshot_path,
    });
  }

  revalidatePath(`/s/${code}`);
  revalidatePath(`/splits/${split.id}`);
  return { ok: true };
}
