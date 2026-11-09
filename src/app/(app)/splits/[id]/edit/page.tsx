import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOwnedSplit } from "@/lib/splits";
import { PageHeader } from "@/components/ui";
import { EditSplitForm } from "./edit-form";

export const metadata: Metadata = { title: "Edit split" };

export default async function EditSplitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const split = await getOwnedSplit(id);
  if (!split) notFound();
  if (split.status !== "open") redirect(`/splits/${id}`);

  const locked = split.shares.some((s) => !s.is_owner && s.status === "confirmed");

  return (
    <>
      <PageHeader
        back={`/splits/${id}`}
        title="Edit split"
        subtitle={locked ? "Someone has already paid, so amounts are locked. You can still edit the title, date and note." : undefined}
      />
      <EditSplitForm split={split} locked={locked} />
    </>
  );
}
