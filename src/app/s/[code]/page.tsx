import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicSplit, splitStats } from "@/lib/splits";
import { formatPKR } from "@/lib/money";
import { APP_NAME } from "@/lib/app";
import { paymentMethods } from "@/lib/payments";
import { track } from "@/lib/analytics";
import { Avatar, Card, ShareStatusBadge, Alert } from "@/components/ui";
import { AutoRefresh } from "@/components/client";
import { ClaimList, YourShare } from "./payer-controls";
import { CLAIM_COOKIE_PREFIX } from "@/lib/claim";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const split = await getPublicSplit(code);
  if (!split) return { title: "Split not found" };
  return {
    title: split.title,
    description: `${formatPKR(split.total_amount)} split among ${split.shares.length} people. Tap your name to see your share.`,
    openGraph: { title: `${split.title} · ${APP_NAME}`, description: `Your share and how to pay ${split.organizer.name ?? "the organizer"}.` },
  };
}

export default async function PublicSplitPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const split = await getPublicSplit(code);
  if (!split) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(CLAIM_COOKIE_PREFIX + code.toLowerCase())?.value ?? null;
  const mine = token ? split.shares.find((s) => s.claimed_token === token) ?? null : null;

  // Analytics: every open. Cheap insert; fine for MVP volumes.
  await track("link_opened", { split_id: split.id, share_id: mine?.id, props: { claimed: !!mine } });

  const stats = splitStats(split);
  const methods = paymentMethods(split.organizer);
  const organizerName = split.organizer.name ?? "the organizer";
  const pct = stats.payers.length ? Math.round((stats.doneCount / stats.payers.length) * 100) : 100;

  return (
    <main className="flex-1 flex flex-col">
      {split.status === "open" ? <AutoRefresh ms={15000} /> : null}

      <div className="max-w-lg w-full mx-auto px-5 pt-6 pb-20 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {organizerName} paid the bill
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">{split.title}</h1>
        <p className="text-stone-500 mt-1">
          {formatPKR(split.total_amount)} · {split.shares.length} people ·{" "}
          {new Date(split.split_date).toLocaleDateString("en-PK", { day: "numeric", month: "long" })}
        </p>

        {split.note ? <Card className="mt-4 p-4 text-[15px] text-stone-700">{split.note}</Card> : null}

        {split.status === "settled" ? (
          <Alert tone="success" className="mt-5">
            <strong>All settled.</strong> Sab ne pay kar diya. Shukriya!
          </Alert>
        ) : split.status === "closed" ? (
          <Alert tone="info" className="mt-5">
            {organizerName} closed this split. Nothing more to pay.
          </Alert>
        ) : null}

        {/* Your share */}
        {split.status === "open" ? (
          <section className="mt-6">
            {mine ? (
              <YourShare code={code} share={mine} methods={methods} organizerName={organizerName} />
            ) : (
              <ClaimList
                code={code}
                shares={split.shares.filter((s) => !s.is_owner)}
              />
            )}
          </section>
        ) : null}

        {/* Board */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Who has paid</h2>
            <span className="text-xs text-stone-500 tabular-nums">
              {stats.doneCount}/{stats.payers.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden mb-3">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <Card className="divide-y divide-stone-100">
            {split.shares.map((s) => (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${mine?.id === s.id ? "bg-emerald-50/60" : ""}`}>
                <Avatar name={s.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {s.display_name}
                    {s.is_owner ? <span className="text-stone-400 text-xs font-normal"> · paid the bill</span> : null}
                    {mine?.id === s.id ? <span className="text-emerald-700 text-xs font-normal"> · you</span> : null}
                  </p>
                </div>
                <span className="tabular-nums text-[15px]">{formatPKR(s.amount)}</span>
                <ShareStatusBadge status={s.status} short />
              </div>
            ))}
          </Card>
        </section>

        <footer className="mt-12 text-center text-sm text-stone-500">
          <p>
            {APP_NAME} never touches money. Pay {organizerName} directly from your own bank or wallet app.
          </p>
          <p className="mt-3">
            Next time you pay the bill,{" "}
            <Link href="/?ref=payer" className="font-medium text-stone-900 underline underline-offset-2">
              split it with {APP_NAME}
            </Link>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}
