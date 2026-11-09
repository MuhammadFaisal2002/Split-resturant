import Link from "next/link";
import type { Metadata } from "next";
import { requireUser, getProfile, hasPaymentDetails } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPKR } from "@/lib/money";
import type { SplitWithShares } from "@/lib/types";
import { Card, PageHeader, LinkButton, EmptyState, SplitStatusBadge, Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Your splits" };

export default async function HomePage() {
  const user = await requireUser();
  const [profile, supabase] = await Promise.all([getProfile(user.id), createClient()]);

  const { data } = await supabase
    .from("splits")
    .select("*, shares:split_shares(*)")
    .order("created_at", { ascending: false });

  const splits = (data ?? []) as SplitWithShares[];
  const open = splits.filter((s) => s.status === "open");
  const done = splits.filter((s) => s.status !== "open");

  return (
    <>
      <PageHeader
        title="Your splits"
        subtitle={splits.length ? `${open.length} open · ${done.length} finished` : undefined}
        action={<LinkButton href="/splits/new">+ New split</LinkButton>}
      />

      {!hasPaymentDetails(profile) ? (
        <Alert tone="warning" className="mb-5">
          Add at least one way to get paid (Raast ID, IBAN or wallet number) in your{" "}
          <Link href="/profile" className="font-medium underline underline-offset-2">
            profile
          </Link>{" "}
          before creating a split.
        </Alert>
      ) : null}

      {splits.length === 0 ? (
        <EmptyState
          title="No splits yet"
          body="Create your first split and share one link in the group chat."
          action={<LinkButton href="/splits/new">Create a split</LinkButton>}
        />
      ) : (
        <div className="space-y-6">
          {open.length ? <SplitList title="Open" splits={open} /> : null}
          {done.length ? <SplitList title="Finished" splits={done} /> : null}
        </div>
      )}
    </>
  );
}

function SplitList({ title, splits }: { title: string; splits: SplitWithShares[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">{title}</h2>
      <div className="space-y-2.5">
        {splits.map((s) => {
          const payers = s.shares.filter((sh) => !sh.is_owner);
          const paid = payers.filter((sh) => sh.status === "confirmed" || sh.status === "waived").length;
          const pending = payers.filter((sh) => sh.status === "pending").length;
          const collected = payers
            .filter((sh) => sh.status === "confirmed")
            .reduce((a, sh) => a + sh.amount, 0);
          const pct = payers.length ? Math.round((paid / payers.length) * 100) : 100;
          return (
            <Link key={s.id} href={`/splits/${s.id}`} className="block">
              <Card className="p-4 hover:border-stone-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{s.title}</h3>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {formatPKR(s.total_amount)} · {s.shares.length} people ·{" "}
                      {new Date(s.split_date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <SplitStatusBadge status={s.status} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-stone-500 tabular-nums whitespace-nowrap">
                    {paid}/{payers.length} paid
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-stone-600">{formatPKR(collected)} collected</span>
                  {pending > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {pending} to confirm
                    </span>
                  ) : null}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
