"use client";

import * as React from "react";
import { useTransition } from "react";
import type { SplitShare, SplitStatus } from "@/lib/types";
import { formatPKR } from "@/lib/money";
import { reminderMessage, personalReminderMessage, waLink } from "@/lib/whatsapp";
import { Avatar, Button, Card, ShareStatusBadge, Input, cn, buttonClass } from "@/components/ui";
import { SubmitButton, CopyButton, ConfirmSubmit } from "@/components/client";
import {
  confirmShare,
  rejectShare,
  unclaimShare,
  waiveShare,
  unwaiveShare,
  closeSplit,
  reopenSplit,
  deleteSplit,
  logReminder,
} from "./actions";

/* --------------------------------------------------------------------------
 * Pending confirmation card
 * ----------------------------------------------------------------------- */
export function PendingCard({ share, screenshotUrl }: { share: SplitShare; screenshotUrl: string | null }) {
  const [rejecting, setRejecting] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(false);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={share.display_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate">{share.display_name}</p>
            <p className="font-semibold tabular-nums">{formatPKR(share.amount)}</p>
          </div>
          <p className="text-sm text-stone-500">
            Marked paid {share.marked_paid_at ? timeAgo(share.marked_paid_at) : ""}
          </p>
          {share.note ? <p className="mt-2 text-[15px] text-stone-700 bg-white rounded-lg px-3 py-2 border border-stone-200">“{share.note}”</p> : null}
          {screenshotUrl ? (
            <button type="button" onClick={() => setLightbox(true)} className="mt-2 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotUrl} alt="Payment screenshot" className="h-28 rounded-lg border border-stone-200 object-cover" />
            </button>
          ) : (
            <p className="mt-2 text-xs text-stone-400">No screenshot attached</p>
          )}
        </div>
      </div>

      {!rejecting ? (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <form action={confirmShare}>
            <input type="hidden" name="shareId" value={share.id} />
            <SubmitButton className="w-full" pendingText="Confirming…">
              ✓ Confirm received
            </SubmitButton>
          </form>
          <Button type="button" variant="secondary" onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
      ) : (
        <form action={rejectShare} className="mt-4 space-y-2">
          <input type="hidden" name="shareId" value={share.id} />
          <Input name="reason" placeholder="Reason (optional), e.g. amount didn't arrive" autoFocus />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <SubmitButton variant="danger" pendingText="Rejecting…">
              Reject and mark unpaid
            </SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {lightbox && screenshotUrl ? (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshotUrl} alt="Payment screenshot" className="max-h-full max-w-full rounded-lg" />
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Board row
 * ----------------------------------------------------------------------- */
export function ShareRow({
  share,
  splitOpen,
  splitTitle,
  shortCode,
}: {
  share: SplitShare;
  splitOpen: boolean;
  splitTitle: string;
  shortCode: string;
}) {
  const [open, setOpen] = React.useState(false);
  const canAct = splitOpen && !share.is_owner;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={share.display_name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{share.display_name}</p>
            {share.is_owner ? <span className="text-xs text-stone-400">(you · paid the bill)</span> : null}
            {!share.is_owner && share.claimed_token ? (
              <span className="text-[10px] uppercase tracking-wide text-stone-400" title="This person opened the link and claimed their name">
                claimed
              </span>
            ) : null}
          </div>
          {share.reject_reason && share.status === "unpaid" ? (
            <p className="text-xs text-red-600 truncate">Rejected: {share.reject_reason}</p>
          ) : null}
        </div>
        <span className="tabular-nums text-[15px] font-medium">{formatPKR(share.amount)}</span>
        <ShareStatusBadge status={share.status} short />
        {canAct ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="More actions"
            className={cn("h-8 w-8 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700", open && "bg-stone-100 text-stone-700")}
          >
            ···
          </button>
        ) : null}
      </div>

      {open && canAct ? (
        <div className="mt-3 ml-11 flex flex-wrap gap-2 animate-fade-in">
          {share.status === "unpaid" || share.status === "rejected" ? (
            <>
              <a
                href={waLink(personalReminderMessage({ title: splitTitle, amount: share.amount, shortCode }))}
                target="_blank"
                rel="noopener"
                className={buttonClass("whatsapp", "sm")}
              >
                Remind on WhatsApp
              </a>
              <form action={confirmShare}>
                <input type="hidden" name="shareId" value={share.id} />
                <SubmitButton size="sm" variant="secondary" pendingText="…">
                  Mark as paid (cash etc.)
                </SubmitButton>
              </form>
              <form action={waiveShare}>
                <input type="hidden" name="shareId" value={share.id} />
                <SubmitButton size="sm" variant="ghost" pendingText="…">
                  Waive
                </SubmitButton>
              </form>
            </>
          ) : null}
          {share.status === "pending" ? (
            <form action={confirmShare}>
              <input type="hidden" name="shareId" value={share.id} />
              <SubmitButton size="sm" pendingText="…">
                Confirm
              </SubmitButton>
            </form>
          ) : null}
          {share.status === "confirmed" ? (
            <form action={rejectShare}>
              <input type="hidden" name="shareId" value={share.id} />
              <input type="hidden" name="reason" value="Undone by organizer" />
              <ConfirmSubmit size="sm" variant="ghost" message={`Mark ${share.display_name} as unpaid again?`}>
                Undo paid
              </ConfirmSubmit>
            </form>
          ) : null}
          {share.status === "waived" ? (
            <form action={unwaiveShare}>
              <input type="hidden" name="shareId" value={share.id} />
              <SubmitButton size="sm" variant="secondary" pendingText="…">
                Undo waive
              </SubmitButton>
            </form>
          ) : null}
          {share.claimed_token ? (
            <form action={unclaimShare}>
              <input type="hidden" name="shareId" value={share.id} />
              <SubmitButton size="sm" variant="ghost" pendingText="…">
                Unclaim name
              </SubmitButton>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Remind pending
 * ----------------------------------------------------------------------- */
export function RemindPanel({
  splitId,
  title,
  shortCode,
  unpaid,
  lastSentAt,
  dayAge,
}: {
  splitId: string;
  title: string;
  shortCode: string;
  unpaid: { name: string; amount: number }[];
  lastSentAt: string | null;
  dayAge: number;
}) {
  const [pending, startTransition] = useTransition();
  const message = reminderMessage({ title, unpaid, shortCode });

  function send() {
    const w = window.open(waLink(message), "_blank", "noopener");
    if (!w) window.location.href = waLink(message);
    startTransition(() => logReminder(splitId, unpaid.length));
  }

  if (!unpaid.length) {
    return (
      <Card className="p-4 text-[15px] text-stone-600">
        Everyone outstanding has already marked paid. Nothing to remind, just confirm above.
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <p className="text-[15px]">
        <strong>{unpaid.length}</strong> {unpaid.length === 1 ? "person hasn't" : "people haven't"} paid yet:{" "}
        <span className="text-stone-600">{unpaid.map((u) => u.name).join(", ")}</span>
      </p>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-3">
        {message}
      </pre>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button variant="whatsapp" onClick={send} disabled={pending}>
          Send via WhatsApp
        </Button>
        <CopyButton text={message} label="Copy" size="md" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
        <span>
          Suggested: Day 1 · Day 3 · Day 7
          <span className="text-stone-400"> (split is {dayAge === 0 ? "from today" : `${dayAge}d old`})</span>
        </span>
        <span>{lastSentAt ? `Last reminder ${timeAgo(lastSentAt)}` : "No reminders yet"}</span>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------------
 * Close / reopen / delete
 * ----------------------------------------------------------------------- */
export function CloseSplitPanel({
  splitId,
  status,
  outstandingCount,
}: {
  splitId: string;
  status: SplitStatus;
  outstandingCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between border-t border-stone-200 pt-5">
      <div className="flex gap-2">
        {status === "open" ? (
          <form action={closeSplit}>
            <input type="hidden" name="splitId" value={splitId} />
            <ConfirmSubmit
              variant="secondary"
              size="sm"
              message={
                outstandingCount
                  ? `Close this split? ${outstandingCount} unpaid share${outstandingCount === 1 ? "" : "s"} will be marked as waived.`
                  : "Close this split?"
              }
            >
              Close split
            </ConfirmSubmit>
          </form>
        ) : (
          <form action={reopenSplit}>
            <input type="hidden" name="splitId" value={splitId} />
            <SubmitButton variant="secondary" size="sm" pendingText="…">
              Reopen
            </SubmitButton>
          </form>
        )}
      </div>
      <form action={deleteSplit}>
        <input type="hidden" name="splitId" value={splitId} />
        <ConfirmSubmit variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" message="Delete this split permanently? The link will stop working.">
          Delete
        </ConfirmSubmit>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------- */
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
