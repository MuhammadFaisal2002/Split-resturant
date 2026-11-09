import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Group, GroupMember } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Edit group" };

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("*, members:group_members(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const group = data as Group & { members: GroupMember[] };
  const members = [...group.members].sort((a, b) => a.position - b.position).map((m) => m.display_name);

  return (
    <>
      <PageHeader title={group.name} back="/groups" />
      <GroupForm group={{ id: group.id, name: group.name, members }} />
    </>
  );
}
