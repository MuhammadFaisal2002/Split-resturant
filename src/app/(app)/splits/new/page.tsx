import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, getProfile, hasPaymentDetails } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Group, GroupMember } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { NewSplitForm } from "./new-split-form";

export const metadata: Metadata = { title: "New split" };

export default async function NewSplitPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!hasPaymentDetails(profile) || !profile?.name) {
    redirect("/profile?next=/splits/new");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*, members:group_members(*)")
    .order("created_at", { ascending: false });
  const groups = (data ?? []) as (Group & { members: GroupMember[] })[];

  return (
    <>
      <PageHeader title="New split" back="/home" />
      <NewSplitForm
        organizerName={profile.name}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          members: [...g.members].sort((a, b) => a.position - b.position).map((m) => m.display_name),
        }))}
        paymentSummary={{
          raast_id: profile.raast_id,
          iban: profile.iban,
          wallet_number: profile.wallet_number,
          wallet_type: profile.wallet_type,
        }}
      />
    </>
  );
}
