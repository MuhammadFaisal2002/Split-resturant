"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import type { SplitShare } from "@/lib/types";
import { formatPKR } from "@/lib/money";
import type { PaymentMethod } from "@/lib/payments";
import { Avatar, Card, Button, Alert, Textarea, ShareStatusBadge, cn } from "@/components/ui";
import { CopyButton, Spinner, SubmitButton } from "@/components/client";
import { claimShare, unclaimOwnShare, markPaid, type PayerActionState } from "./actions";

/* --------------------------------------------------------------------------
 * Tap your name
 * ----------------------------------------------------------------------- */
export function ClaimList({ code, shares }: { code: string; shares: SplitShare[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = useTransition();

  function claim(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await claimShare(code, id);
      if (res.error) setError(res.error);
      setPendingId(null);
    });
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-lg">Aap kaun hain? Tap your name</h2>
      <p className="text-sm text-stone-500 mt-0.5">We’ll remember you on this device.</p>
      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <ul className="mt-4 grid grid-cols-1 gap-2">
        {shares.map((s) => {
          const taken = !!s.claimed_token;
          const done = s.status === "confirmed" || s.status === "waived";
          const disabled = taken || done || pendingId !== null;
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => claim(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  disabled
                    ? "border-stone-200 bg-stone-50 text-stone-400"
                    : "border-stone-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 active:bg-emerald-50"
                )}
              >
                <Avatar name={s.display_name} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{s.display_name}</span>
                  <span className="block text-xs">
                    {done ? "Already paid" : taken ? "Already claimed on another device" : formatPKR(s.amount)}
                  </span>
                </span>
                {pendingId === s.id ? <Spinner /> : !disabled ? <span className="text-stone-400">→</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-stone-500">
        Name claimed by mistake? Ask the organizer to unclaim it.
      </p>
    </Card>
  );
}

/* --------------------------------------------------------------------------
 * Your share + pay details + I've paid
 * ----------------------------------------------------------------------- */
export function YourShare({
  code,
  share,
  methods,
  organizerName,
}: {
  code: string;
  share: SplitShare;
  methods: PaymentMethod[];
  organizerName: string;
}) {
  const [state, action] = useActionState<PayerActionState, FormData>(markPaid.bind(null, code), {});
  const [showForm, setShowForm] = React.useState(false);
  const [unclaiming, startUnclaim] = useTransition();
  const [fileName, setFileName] = React.useState<string | null>(null);

  const canPay = share.status === "unpaid" || share.status === "rejected";

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-5 bg-stone-900 text-white border-stone-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Aapka share</p>
            <p className="text-4xl font-semibold tabular-nums mt-1">{formatPKR(share.amount)}</p>
            <p className="text-stone-300 text-sm mt-1">Hi {share.display_name} 👋</p>
          </div>
          <ShareStatusBadge status={share.status} />
        </div>

        {share.status === "pending" ? (
          <p className="mt-4 text-sm text-stone-300 bg-white/10 rounded-lg px-3 py-2">
            Marked as paid. Waiting for {organizerName} to confirm. This page updates automatically.
          </p>
        ) : null}
        {share.status === "confirmed" ? (
          <p className="mt-4 text-sm text-emerald-300 bg-emerald-500/10 rounded-lg px-3 py-2">
            ✓ {organizerName} confirmed your payment. Shukriya!
          </p>
        ) : null}
        {share.status === "unpaid" && share.reject_reason ? (
          <p className="mt-4 text-sm text-amber-200 bg-amber-500/10 rounded-lg px-3 py-2">
            {organizerName} couldn’t confirm your last payment{share.reject_reason ? `: “${share.reject_reason}”` : ""}. Please check and mark again.
          </p>
        ) : null}
      </Card>

      {canPay ? (
        <>
          <Card className="p-5">
            <h3 className="font-semibold">Pay {organizerName} directly</h3>
            <p className="text-sm text-stone-500 mt-0.5">Use your own bank or wallet app. Copy the details below.</p>
            <ul className="mt-4 space-y-2">
              {methods.map((m) => (
                <li key={m.key} className="flex items-center gap-3 rounded-xl border border-stone-200 px-3.5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-500">{m.label}</p>
                    <p className="font-mono text-[15px] truncate">{m.hint && m.key === "iban" ? m.hint : m.value}</p>
                  </div>
                  <CopyButton text={m.value} />
                </li>
              ))}
              <li className="flex items-center gap-3 rounded-xl border border-dashed border-stone-200 px-3.5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-500">Amount</p>
                  <p className="font-mono text-[15px]">{share.amount}</p>
                </div>
                <CopyButton text={String(share.amount)} />
              </li>
            </ul>
          </Card>

          {!showForm ? (
            <Button size="lg" className="w-full" onClick={() => setShowForm(true)}>
              I’ve paid {formatPKR(share.amount)}
            </Button>
          ) : (
            <Card className="p-5">
              <form action={action} className="space-y-4">
                <h3 className="font-semibold">Confirm you’ve paid</h3>
                {state.error ? <Alert tone="error">{state.error}</Alert> : null}

                <label className="block">
                  <span className="block text-sm font-medium text-stone-700 mb-1.5">Screenshot (optional, helps {organizerName} confirm faster)</span>
                  <span
                    className={cn(
                      "flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed text-sm cursor-pointer",
                      fileName ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    {fileName ? `✓ ${fileName}` : "Attach payment screenshot"}
                    <input
                      type="file"
                      name="screenshot"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium text-stone-700 mb-1.5">Note (optional)</span>
                  <Textarea name="note" placeholder="e.g. Sent via Easypaisa, TID 12345" maxLength={300} className="min-h-[72px]" />
                </label>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <SubmitButton size="lg" pendingText="Sending…">
                    Yes, I’ve paid
                  </SubmitButton>
                  <Button type="button" variant="ghost" size="lg" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </>
      ) : null}

      {canPay ? (
        <button
          type="button"
          disabled={unclaiming}
          onClick={() => startUnclaim(() => unclaimOwnShare(code).then(() => undefined))}
          className="block mx-auto text-sm text-stone-500 hover:text-stone-900 underline underline-offset-2 disabled:opacity-50"
        >
          Not {share.display_name}? Choose a different name
        </button>
      ) : null}
    </div>
  );
}
