"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type GroupFormState = { error?: string };

export async function saveGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  let members: string[] = [];
  try {
    members = JSON.parse(String(formData.get("members") ?? "[]"));
  } catch {
    return { error: "Couldn't read the member list." };
  }
  members = members.map((m) => String(m).trim().replace(/\s+/g, " ")).filter(Boolean);

  if (!name) return { error: "Give the group a name." };
  if (members.length === 0) return { error: "Add at least one person." };
  const lower = members.map((m) => m.toLowerCase());
  if (new Set(lower).size !== lower.length) return { error: "Names must be unique within a group." };

  const supabase = await createClient();
  let groupId = id;

  if (groupId) {
    const { error } = await supabase.from("groups").update({ name }).eq("id", groupId);
    if (error) return { error: error.message };
    await supabase.from("group_members").delete().eq("group_id", groupId);
  } else {
    const { data, error } = await supabase
      .from("groups")
      .insert({ owner_user_id: user.id, name })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Couldn't create the group." };
    groupId = data.id as string;
  }

  const { error: mErr } = await supabase
    .from("group_members")
    .insert(members.map((display_name, position) => ({ group_id: groupId, display_name, position })));
  if (mErr) return { error: mErr.message };

  revalidatePath("/groups");
  redirect("/groups");
}

export async function deleteGroup(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("groups").delete().eq("id", id);
  revalidatePath("/groups");
  redirect("/groups");
}
