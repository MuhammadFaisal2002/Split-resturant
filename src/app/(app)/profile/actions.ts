"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { WalletType } from "@/lib/types";

export type ProfileFormState = { ok: boolean; error?: string; saved?: boolean };

const WALLET_TYPES: WalletType[] = ["jazzcash", "easypaisa", "sadapay", "nayapay", "other"];

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();

  const name = clean(formData.get("name"));
  const phone = clean(formData.get("phone"));
  const raast_id = clean(formData.get("raast_id"));
  const iban = clean(formData.get("iban"))?.replace(/\s+/g, "").toUpperCase() ?? null;
  const wallet_number = clean(formData.get("wallet_number"));
  const walletTypeRaw = clean(formData.get("wallet_type"));
  const wallet_type = WALLET_TYPES.includes(walletTypeRaw as WalletType) ? (walletTypeRaw as WalletType) : null;
  const notify_email = formData.get("notify_email") === "on";
  const next = clean(formData.get("next"));

  if (!name) return { ok: false, error: "Please enter your name. Friends see it on the split page." };
  if (!raast_id && !iban && !wallet_number) {
    return { ok: false, error: "Add at least one way to get paid: Raast ID, IBAN or a wallet number." };
  }
  if (iban && !/^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(iban)) {
    return { ok: false, error: "That IBAN doesn't look right. Pakistani IBANs are 24 characters and start with PK." };
  }
  if (wallet_number && !wallet_type) {
    return { ok: false, error: "Choose which wallet that number belongs to." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    name,
    phone,
    raast_id,
    iban,
    wallet_number,
    wallet_type: wallet_number ? wallet_type : null,
    notify_email,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  if (next && next.startsWith("/")) redirect(next);
  return { ok: true, saved: true };
}
