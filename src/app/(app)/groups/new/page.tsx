import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "New group" };

export default async function NewGroupPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="New group" back="/groups" />
      <GroupForm />
    </>
  );
}
