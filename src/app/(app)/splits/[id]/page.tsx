import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser, getProfile } from "@/lib/auth";
import { getOwnedSplit, splitStats, signedScreenshotUrl } from "@/lib/splits";
import { formatPKR } from "@/lib/money";
import { daysSince } from "@/lib/dates";
import { splitUrl, splitUrlShort } from "@/lib/app";
import { shareMessage, waLink } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, SplitStatusBadge, Alert, LinkButton } from "@/components/ui";
import { CopyButton, AutoRefresh } from "@/components/client";
import { PendingCard, ShareRow, RemindPanel, CloseSplitPanel } from "./split-controls";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const split = await getOwnedSplit(id);
  return { title: split?.title ?? "Split" };
}

export default async function SplitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [split, profile] = await Promise.all([getOwnedSplit(id), getProfile(user.id)]);
  if (!split) notFound();

  const stats = splitStats(split);
  const url = splitUrl(split.short_code);
  const share = shareMessage({
    title: split.title,
    total: split.total_amount,
    peopleCount: split.shares.length,
    organizerName: profile?.name ?? null,
    shortCode: split.short_code,
  });

  const supabase = await createClient();
  const { data: lastReminder } = await supabase
    .from("reminders_log")
    .select("sent_at")
    .eq("split_id", split.id)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pendingWithUrls = await Promise.all(
    stats.pending.map(async (s) => ({ share: s, screenshotUrl: await signedScreenshotUrl(s.screenshot_path) }))
  );

  const pct = stats.payers.length ? Math.round((stats.doneCount / stats.payers.length) * 100) : 100;

  return (
    <>
      {split.status === "open" ? <AutoRefresh ms={20000} /> : null}

      <PageHeader
        back="/home"
        title={split.title}
        subtitle={
          <>
            {formatPKR(split.total_amount)} · {split.shares.length} people ·{" "}
            {new Date(split.split_date).toLocaleDateString("en-PK", { day: "numeric", month: "long" })}
          </>
        }
        action={<SplitStatusBadge status={split.status} />}
      />

      {created ? (
        <Alert tone="success" className="mb-5">
          <strong>Split created.</strong> Now share the link in your group chat.
        </Alert>
      ) : null}

      {split.status === "settled" ? (
        <Alert tone="success" className="mb-5">
          <strong>All settled.</strong> Everyone has paid. {formatPKR(stats.collected)} collected.
        </Alert>
      ) : split.status === "closed" ? (
        <Alert tone="info" className="mb-5">
          This split was closed. Remaining shares were waived.
        </Alert>
      ) : null}

      {/* Share link */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Share link</p>
            <p className="font-mono text-[15px] truncate mt-0.5">{splitUrlShort(split.short_code)}</p>
          </div>
          <CopyButton text={url} label="Copy link" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <LinkButton href={waLink(share)} variant="whatsapp" size="lg" target="_blank" rel="noopener">
            <WhatsAppIcon /> Share on WhatsApp
          </LinkButton>
          <CopyButton text={share} label="Copy message" size="lg" />
        </div>
        <Link href={`/s/${split.short_code}`} target="_blank" className="inline-block mt-3 text-sm text-stone-500 underline underline-offset-2 hover:text-stone-900">
          Preview what friends see →
        </Link>
      </Card>

      {/* Progress */}
      <Card className="p-5 mt-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Collected</p>
            <p className="text-2xl font-semibold tabular-nums mt-0.5">{formatPKR(stats.collected)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Remaining</p>
            <p className="text-2xl font-semibold tabular-nums mt-0.5 text-stone-500">{formatPKR(stats.remaining)}</p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-stone-500">
          {stats.doneCount} of {stats.payers.length} paid
          {stats.pending.length ? ` · ${stats.pending.length} waiting for your confirmation` : ""}
        </p>
      </Card>

      {/* Pending confirmations */}
      {pendingWithUrls.length ? (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
            Waiting for your confirmation
          </h2>
          <div className="space-y-3">
            {pendingWithUrls.map(({ share, screenshotUrl }) => (
              <PendingCard key={share.id} share={share} screenshotUrl={screenshotUrl} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Board */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Who has paid</h2>
          {split.status === "open" ? (
            <Link href={`/splits/${split.id}/edit`} className="text-sm text-stone-500 hover:text-stone-900 underline underline-offset-2">
              Edit split
            </Link>
          ) : null}
        </div>
        <Card className="divide-y divide-stone-100">
          {split.shares.map((s) => (
            <ShareRow key={s.id} share={s} splitOpen={split.status === "open"} splitTitle={split.title} shortCode={split.short_code} />
          ))}
        </Card>
      </section>

      {/* Reminders */}
      {split.status === "open" && stats.outstanding.length ? (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Reminders</h2>
          <RemindPanel
            splitId={split.id}
            title={split.title}
            shortCode={split.short_code}
            unpaid={stats.outstanding.filter((s) => s.status !== "pending").map((s) => ({ name: s.display_name, amount: s.amount }))}
            lastSentAt={lastReminder?.sent_at ?? null}
            dayAge={daysSince(split.created_at)}
          />
        </section>
      ) : null}

      {split.note ? (
        <Card className="p-4 mt-6 text-[15px] text-stone-700">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block mb-1">Note</span>
          {split.note}
        </Card>
      ) : null}

      <section className="mt-8">
        <CloseSplitPanel splitId={split.id} status={split.status} outstandingCount={stats.outstanding.length} />
      </section>
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.1 4.5c1.9.8 2.6.9 3.6.7a3 3 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}
