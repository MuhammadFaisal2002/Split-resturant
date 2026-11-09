"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getProfile, hasPaymentDetails } from "@/lib/auth";
import { generateShortCode } from "@/lib/shortcode";
import { parseAmount, splitEqual, sum } from "@/lib/money";
import { track } from "@/lib/analytics";

export type NewSplitPayload = {
  title: string;
  total: string | number;
  date: string;
  splitType: "equal" | "custom";
  includeSelf: boolean;
  people: { name: string; amount?: string | number }[];
  saveGroupAs?: string;
};

export type NewSplitState = { error?: string };

const MAX_PEOPLE = 40;

export async function createSplit(_prev: NewSplitState, formData: FormData): Promise<NewSplitState> {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!hasPaymentDetails(profile) || !profile?.name) {
    return { error: "Add your name and payment details in your profile first." };
  }

  let payload: NewSplitPayload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Something went wrong reading the form. Please try again." };
  }

  const title = (payload.title ?? "").trim();
  if (!title) return { error: "Give the split a title, e.g. “Dinner at Kolachi”." };
  if (title.length > 80) return { error: "Keep the title under 80 characters." };

  const total = parseAmount(payload.total);
  if (!total || total <= 0) return { error: "Enter the total bill amount in rupees." };
  if (total > 50_000_000) return { error: "That total looks too large." };

  const date = /^\d{4}-\d{2}-\d{2}$/.test(payload.date ?? "") ? payload.date : new Date().toISOString().slice(0, 10);

  const people = (payload.people ?? [])
    .map((p) => ({ name: (p.name ?? "").trim().replace(/\s+/g, " "), amount: p.amount }))
    .filter((p) => p.name);

  if (people.length === 0) return { error: "Add at least one friend who owes a share." };
  if (people.length > MAX_PEOPLE) return { error: `Max ${MAX_PEOPLE} people per split.` };

  const seen = new Set<string>();
  for (const p of people) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return { error: `“${p.name}” appears more than once. Names must be unique.` };
    if (key === profile.name.trim().toLowerCase()) {
      return { error: `“${p.name}” is your own name. Use the “include me” toggle instead.` };
    }
    seen.add(key);
  }

  const includeSelf = !!payload.includeSelf;
  const splitType = payload.splitType === "custom" ? "custom" : "equal";

  // Build the share rows. Organizer (if included) is first and auto-confirmed:
  // they paid the bill, so their share is already "in".
  type Row = { display_name: string; amount: number; is_owner: boolean; position: number; status: string; confirmed_at: string | null };
  const rows: Row[] = [];

  if (splitType === "equal") {
    const count = people.length + (includeSelf ? 1 : 0);
    const amounts = splitEqual(total, count);
    let i = 0;
    if (includeSelf) {
      rows.push({ display_name: profile.name, amount: amounts[i++], is_owner: true, position: 0, status: "confirmed", confirmed_at: new Date().toISOString() });
    }
    for (const p of people) {
      rows.push({ display_name: p.name, amount: amounts[i], is_owner: false, position: i, status: "unpaid", confirmed_at: null });
      i++;
    }
  } else {
    const amounts = people.map((p) => parseAmount(p.amount ?? ""));
    if (amounts.some((a) => a === null || a < 0)) {
      return { error: "Enter a whole-rupee amount for every person." };
    }
    const payersTotal = sum(amounts as number[]);
    let ownerAmount = 0;
    if (includeSelf) {
      ownerAmount = total - payersTotal;
      if (ownerAmount < 0) return { error: "Friends' amounts add up to more than the total." };
      rows.push({ display_name: profile.name, amount: ownerAmount, is_owner: true, position: 0, status: "confirmed", confirmed_at: new Date().toISOString() });
    } else if (payersTotal !== total) {
      const diff = total - payersTotal;
      return {
        error:
          diff > 0
            ? `Amounts are Rs ${diff.toLocaleString("en-PK")} short of the total.`
            : `Amounts exceed the total by Rs ${Math.abs(diff).toLocaleString("en-PK")}.`,
      };
    }
    people.forEach((p, idx) => {
      rows.push({ display_name: p.name, amount: amounts[idx] as number, is_owner: false, position: idx + (includeSelf ? 1 : 0), status: "unpaid", confirmed_at: null });
    });
  }

  const supabase = await createClient();

  // Insert split with a unique short code (retry on the rare collision).
  let splitId: string | null = null;
  let shortCode = "";
  for (let attempt = 0; attempt < 5 && !splitId; attempt++) {
    shortCode = generateShortCode(attempt < 3 ? 5 : 6);
    const { data, error } = await supabase
      .from("splits")
      .insert({
        owner_user_id: user.id,
        title,
        total_amount: total,
        split_type: splitType,
        include_self: includeSelf,
        short_code: shortCode,
        split_date: date,
      })
      .select("id")
      .single();
    if (!error && data) splitId = data.id as string;
    else if (error && !/duplicate|unique/i.test(error.message)) return { error: error.message };
  }
  if (!splitId) return { error: "Couldn't generate a unique link. Please try again." };

  const { error: sharesError } = await supabase
    .from("split_shares")
    .insert(rows.map((r) => ({ ...r, split_id: splitId })));
  if (sharesError) {
    await supabase.from("splits").delete().eq("id", splitId);
    return { error: sharesError.message };
  }

  // Optionally save the people as a reusable group.
  const saveGroupAs = (payload.saveGroupAs ?? "").trim();
  if (saveGroupAs) {
    const { data: g } = await supabase.from("groups").insert({ owner_user_id: user.id, name: saveGroupAs }).select("id").single();
    if (g) {
      await supabase.from("group_members").insert(people.map((p, i) => ({ group_id: g.id, display_name: p.name, position: i })));
    }
  }

  await track("split_created", {
    split_id: splitId,
    user_id: user.id,
    props: { total, people: rows.length, split_type: splitType, include_self: includeSelf },
  });

  redirect(`/splits/${splitId}?created=1`);
}
