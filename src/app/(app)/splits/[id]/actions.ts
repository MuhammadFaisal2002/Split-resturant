"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { parseAmount, sum } from "@/lib/money";
import type { Split, SplitShare } from "@/lib/types";

async function ownedShare(shareId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("split_shares")
    .select("*, split:splits(*)")
    .eq("id", shareId)
    .maybeSingle();
  if (!data) throw new Error("Share not found");
  const share = data as SplitShare & { split: Split };
  return { supabase, share, split: share.split };
}

async function afterShareChange(splitId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("splits").select("status, short_code").eq("id", splitId).single();
  if (data?.status === "settled") {
    // The DB trigger just flipped it; make sure we only log once.
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("name", "split_settled")
      .eq("split_id", splitId);
    if (!count) await track("split_settled", { split_id: splitId, user_id: userId });
  }
  revalidatePath(`/splits/${splitId}`);
  revalidatePath("/home");
  if (data?.short_code) revalidatePath(`/s/${data.short_code}`);
}

export async function confirmShare(formData: FormData) {
  const user = await requireUser();
  const shareId = String(formData.get("shareId"));
  const { supabase, share, split } = await ownedShare(shareId);
  if (split.status === "closed") return;
  await supabase
    .from("split_shares")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), reject_reason: null })
    .eq("id", shareId);
  await track("confirmed", { split_id: split.id, share_id: shareId, user_id: user.id, props: { by: "organizer", from: share.status } });
  await afterShareChange(split.id, user.id);
}

export async function rejectShare(formData: FormData) {
  const user = await requireUser();
  const shareId = String(formData.get("shareId"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const { supabase, split } = await ownedShare(shareId);
  if (split.status !== "open") return;
  await supabase
    .from("split_shares")
    .update({ status: "unpaid", reject_reason: reason, marked_paid_at: null })
    .eq("id", shareId);
  await track("rejected", { split_id: split.id, share_id: shareId, user_id: user.id, props: { reason } });
  await afterShareChange(split.id, user.id);
}

export async function unclaimShare(formData: FormData) {
  const user = await requireUser();
  const shareId = String(formData.get("shareId"));
  const { supabase, split } = await ownedShare(shareId);
  await supabase.from("split_shares").update({ claimed_token: null }).eq("id", shareId);
  await afterShareChange(split.id, user.id);
}

export async function waiveShare(formData: FormData) {
  const user = await requireUser();
  const shareId = String(formData.get("shareId"));
  const { supabase, share, split } = await ownedShare(shareId);
  if (split.status !== "open" || share.status === "confirmed") return;
  await supabase.from("split_shares").update({ status: "waived" }).eq("id", shareId);
  await afterShareChange(split.id, user.id);
}

export async function unwaiveShare(formData: FormData) {
  const user = await requireUser();
  const shareId = String(formData.get("shareId"));
  const { supabase, share, split } = await ownedShare(shareId);
  if (share.status !== "waived") return;
  // Reopen the split if it had auto-settled because of the waive.
  if (split.status === "settled") {
    await supabase.from("splits").update({ status: "open", settled_at: null }).eq("id", split.id);
  }
  await supabase.from("split_shares").update({ status: "unpaid" }).eq("id", shareId);
  await afterShareChange(split.id, user.id);
}

export async function closeSplit(formData: FormData) {
  const user = await requireUser();
  const splitId = String(formData.get("splitId"));
  const supabase = await createClient();
  const { data: split } = await supabase.from("splits").select("*").eq("id", splitId).maybeSingle();
  if (!split || split.status !== "open") return;
  await supabase
    .from("split_shares")
    .update({ status: "waived" })
    .eq("split_id", splitId)
    .eq("is_owner", false)
    .in("status", ["unpaid", "pending", "rejected"]);
  await supabase.from("splits").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", splitId);
  await track("split_closed", { split_id: splitId, user_id: user.id });
  revalidatePath(`/splits/${splitId}`);
  revalidatePath("/home");
}

export async function reopenSplit(formData: FormData) {
  await requireUser();
  const splitId = String(formData.get("splitId"));
  const supabase = await createClient();
  await supabase.from("splits").update({ status: "open", closed_at: null, settled_at: null }).eq("id", splitId);
  revalidatePath(`/splits/${splitId}`);
  revalidatePath("/home");
}

export async function deleteSplit(formData: FormData) {
  await requireUser();
  const splitId = String(formData.get("splitId"));
  const supabase = await createClient();
  await supabase.from("splits").delete().eq("id", splitId);
  revalidatePath("/home");
  redirect("/home");
}

export async function logReminder(splitId: string, unpaidCount: number) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("reminders_log").insert({ split_id: splitId, channel: "whatsapp_manual", unpaid_count: unpaidCount });
  await track("reminder_sent", { split_id: splitId, user_id: user.id, props: { unpaid_count: unpaidCount } });
  revalidatePath(`/splits/${splitId}`);
}

/* --------------------------------------------------------------------------
 * Edit split (title, date, note always; amounts only while nobody has paid)
 * ----------------------------------------------------------------------- */
export type EditSplitState = { error?: string; saved?: boolean };

export async function updateSplit(_prev: EditSplitState, formData: FormData): Promise<EditSplitState> {
  await requireUser();
  const splitId = String(formData.get("splitId"));
  const supabase = await createClient();
  const { data } = await supabase.from("splits").select("*, shares:split_shares(*)").eq("id", splitId).maybeSingle();
  if (!data) return { error: "Split not found." };
  const split = data as Split & { shares: SplitShare[] };
  if (split.status !== "open") return { error: "Finished splits can't be edited." };

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!title) return { error: "Title can't be empty." };

  const locked = split.shares.some((s) => !s.is_owner && s.status === "confirmed");

  const patch: Record<string, unknown> = { title, note };
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) patch.split_date = date;

  if (!locked) {
    const total = parseAmount(formData.get("total"));
    if (!total || total <= 0) return { error: "Enter a valid total." };
    const amounts: { id: string; amount: number }[] = [];
    for (const s of split.shares) {
      const a = parseAmount(formData.get(`amount_${s.id}`));
      if (a === null || a < 0) return { error: `Enter a whole-rupee amount for ${s.display_name}.` };
      amounts.push({ id: s.id, amount: a });
    }
    const diff = total - sum(amounts.map((a) => a.amount));
    if (diff !== 0) {
      return {
        error:
          diff > 0
            ? `Shares are Rs ${diff.toLocaleString("en-PK")} short of the total.`
            : `Shares exceed the total by Rs ${Math.abs(diff).toLocaleString("en-PK")}.`,
      };
    }
    patch.total_amount = total;
    patch.split_type = "custom";
    for (const a of amounts) {
      const { error } = await supabase.from("split_shares").update({ amount: a.amount }).eq("id", a.id);
      if (error) return { error: error.message };
    }
  }

  const { error } = await supabase.from("splits").update(patch).eq("id", splitId);
  if (error) return { error: error.message };

  revalidatePath(`/splits/${splitId}`);
  revalidatePath(`/s/${split.short_code}`);
  revalidatePath("/home");
  redirect(`/splits/${splitId}`);
}

export async function addShare(formData: FormData) {
  await requireUser();
  const splitId = String(formData.get("splitId"));
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const amount = parseAmount(formData.get("amount")) ?? 0;
  if (!name) return;
  const supabase = await createClient();
  const { data } = await supabase.from("splits").select("*, shares:split_shares(*)").eq("id", splitId).maybeSingle();
  if (!data) return;
  const split = data as Split & { shares: SplitShare[] };
  if (split.status !== "open") return;
  if (split.shares.some((s) => s.display_name.toLowerCase() === name.toLowerCase())) return;
  const position = Math.max(0, ...split.shares.map((s) => s.position)) + 1;
  await supabase.from("split_shares").insert({ split_id: splitId, display_name: name, amount, position });
  // Keep total consistent: adding a person increases the bill unless the organizer re-balances.
  await supabase.from("splits").update({ total_amount: split.total_amount + amount, split_type: "custom" }).eq("id", splitId);
  revalidatePath(`/splits/${splitId}/edit`);
  revalidatePath(`/splits/${splitId}`);
}

export async function removeShare(formData: FormData) {
  await requireUser();
  const shareId = String(formData.get("shareId"));
  const { supabase, share, split } = await ownedShare(shareId);
  if (split.status !== "open" || share.is_owner || share.status === "confirmed" || share.status === "pending") return;
  await supabase.from("split_shares").delete().eq("id", shareId);
  await supabase.from("splits").update({ total_amount: Math.max(1, split.total_amount - share.amount), split_type: "custom" }).eq("id", split.id);
  revalidatePath(`/splits/${split.id}/edit`);
  revalidatePath(`/splits/${split.id}`);
}
