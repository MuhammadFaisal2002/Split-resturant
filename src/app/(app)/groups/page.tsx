import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Group, GroupMember } from "@/lib/types";
import { Card, PageHeader, LinkButton, EmptyState, Avatar } from "@/components/ui";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*, members:group_members(*)")
    .order("created_at", { ascending: false });
  const groups = (data ?? []) as (Group & { members: GroupMember[] })[];

  return (
    <>
      <PageHeader
        title="Groups"
        subtitle="Saved sets of names so you don't retype them every time."
        action={<LinkButton href="/groups/new">+ New group</LinkButton>}
      />
      {groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          body="Save your usual crew once. Pick them in one tap when creating a split."
          action={<LinkButton href="/groups/new">Create a group</LinkButton>}
        />
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => {
            const members = [...g.members].sort((a, b) => a.position - b.position);
            return (
              <Link key={g.id} href={`/groups/${g.id}`} className="block">
                <Card className="p-4 hover:border-stone-300 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{g.name}</h3>
                      <p className="text-sm text-stone-500 truncate mt-0.5">{members.map((m) => m.display_name).join(", ")}</p>
                    </div>
                    <div className="flex -space-x-2 shrink-0">
                      {members.slice(0, 4).map((m) => (
                        <span key={m.id} className="ring-2 ring-white rounded-full">
                          <Avatar name={m.display_name} size="sm" />
                        </span>
                      ))}
                      {members.length > 4 ? (
                        <span className="h-8 w-8 rounded-full bg-stone-200 text-stone-600 text-xs font-medium flex items-center justify-center ring-2 ring-white">
                          +{members.length - 4}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
